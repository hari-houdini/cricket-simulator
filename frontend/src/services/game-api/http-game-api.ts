import type { ZodType } from "zod";

import {
  auctionSchema,
  placeBidInputSchema,
  startAuctionInputSchema,
} from "../../shared/types/auction.schema";
import { awardsSchema } from "../../shared/types/awards.schema";
import type { GameApi } from "../../shared/types/game-api.types";
import {
  advanceRoundInputSchema,
  leagueSchema,
} from "../../shared/types/league.schema";
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
  const lobbyPath = (code: string) => `/api/lobbies/${normaliseCode(code)}`;
  const lobbyContext = (code: string): RefusalContext => ({
    code: normaliseCode(code),
    guestId: "",
    franchiseId: "",
  });

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
          context: { code: "", guestId: parsed.guestId, franchiseId: "" },
        },
        lobbySchema,
      );
    },

    getLobby: (code) =>
      request(
        send,
        origin,
        {
          method: "GET",
          path: lobbyPath(code),
          context: lobbyContext(code),
        },
        lobbySchema,
      ),

    joinLobby: async (input) => {
      const parsed = joinLobbyInputSchema.parse({
        ...input,
        code: normaliseCode(input.code),
      });
      return request(
        send,
        origin,
        {
          method: "POST",
          path: `${lobbyPath(parsed.code)}/join`,
          body: { guestId: parsed.guestId, displayName: parsed.displayName },
          context: { ...lobbyContext(parsed.code), guestId: parsed.guestId },
        },
        lobbySchema,
      );
    },

    claimFranchise: async (input) => {
      const parsed = claimFranchiseInputSchema.parse({
        ...input,
        code: normaliseCode(input.code),
      });
      return request(
        send,
        origin,
        {
          method: "POST",
          path: `${lobbyPath(parsed.code)}/franchise`,
          body: { guestId: parsed.guestId, franchiseId: parsed.franchiseId },
          context: {
            code: parsed.code,
            guestId: parsed.guestId,
            franchiseId: parsed.franchiseId,
          },
        },
        lobbySchema,
      );
    },

    startAuction: async (input) => {
      const parsed = startAuctionInputSchema.parse({
        ...input,
        code: normaliseCode(input.code),
      });
      return request(
        send,
        origin,
        {
          method: "POST",
          path: `${lobbyPath(parsed.code)}/auction/start`,
          body: { guestId: parsed.guestId },
          context: { ...lobbyContext(parsed.code), guestId: parsed.guestId },
        },
        lobbySchema,
      );
    },

    getAuction: (code) =>
      request(
        send,
        origin,
        {
          method: "GET",
          path: `${lobbyPath(code)}/auction`,
          context: lobbyContext(code),
        },
        auctionSchema,
      ),

    placeBid: async (input) => {
      const parsed = placeBidInputSchema.parse({
        ...input,
        code: normaliseCode(input.code),
      });
      return request(
        send,
        origin,
        {
          method: "POST",
          path: `${lobbyPath(parsed.code)}/auction/bids`,
          body: {
            guestId: parsed.guestId,
            amountLakhs: parsed.amountLakhs,
          },
          context: { ...lobbyContext(parsed.code), guestId: parsed.guestId },
        },
        auctionSchema,
      );
    },

    getSquad: async (input) => {
      const parsed = getSquadInputSchema.parse({
        ...input,
        code: normaliseCode(input.code),
      });
      const guest = encodeURIComponent(parsed.guestId);
      return request(
        send,
        origin,
        {
          method: "GET",
          path: `${lobbyPath(parsed.code)}/squad?guestId=${guest}`,
          context: { ...lobbyContext(parsed.code), guestId: parsed.guestId },
        },
        squadSchema,
      );
    },

    setStartingXi: async (input) => {
      const parsed = setStartingXiInputSchema.parse({
        ...input,
        code: normaliseCode(input.code),
      });
      return request(
        send,
        origin,
        {
          method: "POST",
          path: `${lobbyPath(parsed.code)}/squad/xi`,
          body: {
            guestId: parsed.guestId,
            playerIds: parsed.playerIds,
            captainId: parsed.captainId,
            viceCaptainId: parsed.viceCaptainId,
          },
          context: { ...lobbyContext(parsed.code), guestId: parsed.guestId },
        },
        squadSchema,
      );
    },

    substitute: async (input) => {
      const parsed = substituteInputSchema.parse({
        ...input,
        code: normaliseCode(input.code),
      });
      return request(
        send,
        origin,
        {
          method: "POST",
          path: `${lobbyPath(parsed.code)}/squad/substitution`,
          body: {
            guestId: parsed.guestId,
            outPlayerId: parsed.outPlayerId,
            inPlayerId: parsed.inPlayerId,
          },
          context: { ...lobbyContext(parsed.code), guestId: parsed.guestId },
        },
        squadSchema,
      );
    },

    getLeague: (code) =>
      request(
        send,
        origin,
        {
          method: "GET",
          path: `${lobbyPath(code)}/league`,
          context: lobbyContext(code),
        },
        leagueSchema,
      ),

    advanceRound: async (input) => {
      const parsed = advanceRoundInputSchema.parse({
        ...input,
        code: normaliseCode(input.code),
      });
      return request(
        send,
        origin,
        {
          method: "POST",
          path: `${lobbyPath(parsed.code)}/league/advance`,
          body: { guestId: parsed.guestId },
          context: { ...lobbyContext(parsed.code), guestId: parsed.guestId },
        },
        leagueSchema,
      );
    },

    getPlayoffs: (code) =>
      request(
        send,
        origin,
        {
          method: "GET",
          path: `${lobbyPath(code)}/playoffs`,
          context: lobbyContext(code),
        },
        playoffsSchema,
      ),

    getAwards: (code) =>
      request(
        send,
        origin,
        {
          method: "GET",
          path: `${lobbyPath(code)}/awards`,
          context: lobbyContext(code),
        },
        awardsSchema,
      ),
  };
}
