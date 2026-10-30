import type { ZodType } from "zod";

import {
  auctionSchema,
  placeBidInputSchema,
  startAuctionInputSchema,
} from "../../shared/types/auction.schema";
import { awardsSchema } from "../../shared/types/awards.schema";
import type { GameApi } from "../../shared/types/game-api.types";
import {
  leagueSchema,
  matchIdSchema,
  matchSchema,
  setSkipVoteInputSchema,
  standingsSchema,
} from "../../shared/types/league.schema";
import { lineupsSchema } from "../../shared/types/lineup.schema";
import {
  claimFranchiseInputSchema,
  createLobbyInputSchema,
  joinLobbyInputSchema,
  lobbyCodeSchema,
  lobbySchema,
} from "../../shared/types/lobby.schema";
import { playoffsSchema } from "../../shared/types/playoffs.schema";
import { refusalSchema } from "../../shared/types/refusal.schema";
import {
  beginSubstitutionInputSchema,
  cancelSubstitutionInputSchema,
  getSquadInputSchema,
  setStartingXiInputSchema,
  squadSchema,
  substituteInputSchema,
} from "../../shared/types/squad.schema";
import type { RefusalContext } from "../../shared/utils/api-refusal";
import { refusalError } from "../../shared/utils/api-refusal";

/**
 * The part of `fetch` the client uses. Tests pass a fake with this shape, so
 * they run without a network.
 */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** Options for {@link createHttpGameApi}. */
export type HttpGameApiOptions = {
  /** The origin of the Rust backend, such as `https://lobby.example.workers.dev`. No trailing slash is needed. */
  readonly baseUrl: string;
  /** The fetch to use. Defaults to the global `fetch`. */
  readonly fetch?: FetchLike;
};

/**
 * One request to the backend, with the context a refusal needs to become a typed error.
 */
type ApiCall = {
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly body?: unknown;
  readonly context: RefusalContext;
};

/**
 * One request for a lobby. `suffix` follows `/api/lobbies/{code}`, and the
 * optional ids are what a refusal may name.
 */
type LobbyCall = {
  readonly method: "GET" | "POST";
  readonly suffix: string;
  readonly body?: unknown;
  readonly guestId?: string;
  readonly franchiseId?: string;
  readonly matchId?: string;
};

/**
 * Normalises a lobby code the way the mock does, then checks its shape, so
 * both modes reject the same codes with the same error.
 *
 * @param code - The code as the caller typed it.
 * @returns The uppercase code.
 * @throws {ZodError} When the code is not six letters or digits.
 */
function normaliseCode(code: string): string {
  return lobbyCodeSchema.parse(code.trim().toUpperCase());
}

/**
 * Normalises a lobby input's code, then checks the whole input with its schema,
 * so the HTTP client rejects bad input before sending it, as the mock does.
 *
 * @param schema - The input schema for the method.
 * @param input - The input as the caller sent it.
 * @returns The parsed input, with its code normalised.
 * @throws {ZodError} When the input does not match the schema.
 */
function parseLobbyInput<T>(
  schema: ZodType<T>,
  input: { readonly code: string },
): T {
  return schema.parse({ ...input, code: normaliseCode(input.code) });
}

/**
 * Sends one request and checks the answer. A success is parsed with the
 * endpoint's schema, so a response that drifts from the contract throws a
 * `ZodError`. A refusal becomes the typed error from {@link refusalError}.
 *
 * @param send - The fetch to use.
 * @param baseUrl - The backend origin, without a trailing slash.
 * @param call - The request.
 * @param schema - The schema the successful response must match.
 * @returns The parsed response.
 * @throws A typed game error for a refusal, or a plain `Error` when the refusal has no body.
 */
async function request<T>(
  send: FetchLike,
  baseUrl: string,
  call: ApiCall,
  schema: ZodType<T>,
): Promise<T> {
  // Keys are left out rather than set to undefined, since exactOptionalPropertyTypes forbids that.
  const init: RequestInit =
    call.body === undefined
      ? { method: call.method }
      : {
          method: call.method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(call.body),
        };
  const response = await send(`${baseUrl}${call.path}`, init);
  // A body that is not JSON, such as an empty proxy error, has no refusal to read.
  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const refusal = refusalSchema.safeParse(json);
    if (!refusal.success) {
      throw new Error(`The API answered ${response.status} without a refusal.`);
    }
    throw refusalError(refusal.data, call.context);
  }
  return schema.parse(json);
}

/**
 * The HTTP client for the Rust backend (ARCHITECTURE.md). It implements the same
 * {@link GameApi} as the mock, so the UI cannot tell them apart except by the
 * network. Every input is checked with the schema the mock uses, before it is
 * sent, so bad input fails the same way in both modes.
 *
 * @param options - The backend origin and an optional fetch.
 * @returns A {@link GameApi} that calls the backend.
 * @throws {Error} When `baseUrl` is not an absolute URL.
 */
export function createHttpGameApi(options: HttpGameApiOptions): GameApi {
  const origin = new URL(options.baseUrl).origin;
  const send: FetchLike =
    options.fetch ?? ((url, init) => globalThis.fetch(url, init));

  /**
   * Sends a request for one lobby. The code is normalised here, so every method
   * accepts the same codes as the mock and shares one path and refusal context.
   *
   * @param code - The lobby code, as the caller typed it.
   * @param call - The request, relative to the lobby.
   * @param schema - The schema the successful response must match.
   * @returns The parsed response.
   */
  const lobbyCall = <T>(
    code: string,
    call: LobbyCall,
    schema: ZodType<T>,
  ): Promise<T> => {
    const lobbyCode = normaliseCode(code);
    return request(
      send,
      origin,
      {
        method: call.method,
        path: `/api/lobbies/${lobbyCode}${call.suffix}`,
        body: call.body,
        context: {
          code: lobbyCode,
          guestId: call.guestId ?? "",
          franchiseId: call.franchiseId ?? "",
          matchId: call.matchId ?? "",
        },
      },
      schema,
    );
  };

  return {
    createLobby: async (input) => {
      const parsed = createLobbyInputSchema.parse(input);
      return request(
        send,
        origin,
        {
          method: "POST",
          path: "/api/lobbies",
          body: parsed,
          context: {
            code: "",
            guestId: parsed.guestId,
            franchiseId: "",
            matchId: "",
          },
        },
        lobbySchema,
      );
    },

    getLobby: (code) =>
      lobbyCall(code, { method: "GET", suffix: "" }, lobbySchema),

    joinLobby: async (input) => {
      const parsed = parseLobbyInput(joinLobbyInputSchema, input);
      return lobbyCall(
        parsed.code,
        {
          method: "POST",
          suffix: "/join",
          body: { guestId: parsed.guestId, displayName: parsed.displayName },
          guestId: parsed.guestId,
        },
        lobbySchema,
      );
    },

    claimFranchise: async (input) => {
      const parsed = parseLobbyInput(claimFranchiseInputSchema, input);
      return lobbyCall(
        parsed.code,
        {
          method: "POST",
          suffix: "/franchise",
          body: { guestId: parsed.guestId, franchiseId: parsed.franchiseId },
          guestId: parsed.guestId,
          franchiseId: parsed.franchiseId,
        },
        lobbySchema,
      );
    },

    startAuction: async (input) => {
      const parsed = parseLobbyInput(startAuctionInputSchema, input);
      return lobbyCall(
        parsed.code,
        {
          method: "POST",
          suffix: "/auction/start",
          body: { guestId: parsed.guestId },
          guestId: parsed.guestId,
        },
        lobbySchema,
      );
    },

    getAuction: (code) =>
      lobbyCall(code, { method: "GET", suffix: "/auction" }, auctionSchema),

    placeBid: async (input) => {
      const parsed = parseLobbyInput(placeBidInputSchema, input);
      return lobbyCall(
        parsed.code,
        {
          method: "POST",
          suffix: "/auction/bids",
          body: { guestId: parsed.guestId, amountLakhs: parsed.amountLakhs },
          guestId: parsed.guestId,
        },
        auctionSchema,
      );
    },

    getSquad: async (input) => {
      const parsed = parseLobbyInput(getSquadInputSchema, input);
      const guest = encodeURIComponent(parsed.guestId);
      return lobbyCall(
        parsed.code,
        {
          method: "GET",
          suffix: `/squad?guestId=${guest}`,
          guestId: parsed.guestId,
        },
        squadSchema,
      );
    },

    setStartingXi: async (input) => {
      const parsed = parseLobbyInput(setStartingXiInputSchema, input);
      return lobbyCall(
        parsed.code,
        {
          method: "POST",
          suffix: "/squad/xi",
          body: {
            guestId: parsed.guestId,
            playerIds: parsed.playerIds,
            captainId: parsed.captainId,
            viceCaptainId: parsed.viceCaptainId,
          },
          guestId: parsed.guestId,
        },
        squadSchema,
      );
    },

    substitute: async (input) => {
      const parsed = parseLobbyInput(substituteInputSchema, input);
      return lobbyCall(
        parsed.code,
        {
          method: "POST",
          suffix: "/squad/substitution",
          body: {
            guestId: parsed.guestId,
            outPlayerId: parsed.outPlayerId,
            inPlayerId: parsed.inPlayerId,
          },
          guestId: parsed.guestId,
        },
        squadSchema,
      );
    },

    getLineups: (code) =>
      lobbyCall(code, { method: "GET", suffix: "/lineups" }, lineupsSchema),

    getLeague: (code) =>
      lobbyCall(code, { method: "GET", suffix: "/league" }, leagueSchema),

    getStandings: (code) =>
      lobbyCall(code, { method: "GET", suffix: "/standings" }, standingsSchema),

    getMatch: async (code, matchId) => {
      const id = matchIdSchema.parse(matchId);
      return lobbyCall(
        code,
        {
          method: "GET",
          suffix: `/matches/${encodeURIComponent(id)}`,
          matchId: id,
        },
        matchSchema,
      );
    },

    beginSubstitution: async (input) => {
      const parsed = parseLobbyInput(beginSubstitutionInputSchema, input);
      return lobbyCall(
        parsed.code,
        {
          method: "POST",
          suffix: "/squad/substitution/begin",
          body: { guestId: parsed.guestId },
          guestId: parsed.guestId,
        },
        lobbySchema,
      );
    },

    cancelSubstitution: async (input) => {
      const parsed = parseLobbyInput(cancelSubstitutionInputSchema, input);
      return lobbyCall(
        parsed.code,
        {
          method: "POST",
          suffix: "/squad/substitution/cancel",
          body: { guestId: parsed.guestId },
          guestId: parsed.guestId,
        },
        lobbySchema,
      );
    },

    setSkipVote: async (input) => {
      const parsed = parseLobbyInput(setSkipVoteInputSchema, input);
      return lobbyCall(
        parsed.code,
        {
          method: "POST",
          suffix: "/league/skip-vote",
          body: { guestId: parsed.guestId, vote: parsed.vote },
          guestId: parsed.guestId,
        },
        lobbySchema,
      );
    },

    getPlayoffs: (code) =>
      lobbyCall(code, { method: "GET", suffix: "/playoffs" }, playoffsSchema),

    getAwards: (code) =>
      lobbyCall(code, { method: "GET", suffix: "/awards" }, awardsSchema),

    // The live transport is a WebSocket, which the backend does not serve yet.
    // Rejecting says so, rather than returning a subscription that never fires.
    subscribe: () =>
      Promise.reject(
        new Error(
          "Live events need the WebSocket transport, which is not built yet.",
        ),
      ),
  };
}
