import { LOBBY_CODE_LENGTH, MAX_OWNERS } from "../../shared/const/lobby.const";
import { SEED_VERSION } from "../../shared/const/seed.const";
import { TEAMS } from "../../shared/const/teams.const";
import {
  auctionSchema,
  placeBidInputSchema,
  startAuctionInputSchema,
} from "../../shared/types/auction.schema";
import type { Auction } from "../../shared/types/auction.types";
import type { GameApi } from "../../shared/types/game-api.types";
import {
  claimFranchiseInputSchema,
  createLobbyInputSchema,
  joinLobbyInputSchema,
  lobbyCodeSchema,
  lobbySchema,
} from "../../shared/types/lobby.schema";
import type { Lobby, Owner } from "../../shared/types/lobby.types";
import type { Player } from "../../shared/types/player.types";
import { bidBlockReason } from "../../shared/utils/auction-rules";
import { franchiseClaimBlock } from "../../shared/utils/franchise-claim";
import {
  AuctionAlreadyStartedError,
  AuctionNotStartedError,
  AuctionStartBlockedError,
  BidBlockedError,
  FranchiseClaimClosedError,
  FranchiseNotFoundError,
  FranchiseTakenError,
  LobbyFullError,
  LobbyNotFoundError,
  NotAnOwnerError,
} from "../../shared/utils/game-api.errors";
import { createSeededRandom } from "../../shared/utils/seeded-random";
import { auctionOrder } from "./auction-pool";
import {
  createMockAuction,
  recordBid,
  settleExpiredLots,
} from "./mock-auction";

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Options for the mock game API.
 */
export type MockGameApiOptions = {
  /**
   * Seed for lobby codes. The same seed and the same sequence of creates give
   * the same codes, so tests and Storybook can assert on them. When omitted, a
   * fresh seed is drawn, so codes differ between page loads.
   */
  readonly seed?: string;
  /**
   * The clock, in epoch milliseconds. Tests pass a fake clock so bid timers
   * are deterministic. Defaults to `Date.now`.
   */
  readonly now?: () => number;
};

/**
 * Draws a fresh seed for a mock that was not given one.
 *
 * @returns A short random string.
 */
function freshSeed(): string {
  return Math.random().toString(36).slice(2);
}

/**
 * A lobby's auction as the mock keeps it: the public state, plus the players
 * not yet on a lot, which the public state only counts.
 */
type StoredAuction = {
  readonly auction: Auction;
  readonly queue: Player[];
};

/**
 * Builds the in-memory mock of the game API. It keeps lobbies for as long as
 * the returned object lives, so each page load starts with an empty set, as
 * `docs/specs/mock-api-mvp.md` accepts.
 *
 * Every result is a fresh copy parsed through the schemas, so callers cannot
 * mutate the mock's state by accident.
 *
 * @param options - Optional seed for lobby codes, and an optional clock.
 * @returns A {@link GameApi} backed by memory.
 */
export function createMockGameApi(options: MockGameApiOptions = {}): GameApi {
  // Built on first use, not here. Building it draws a fresh seed when none is
  // given, and Next forbids reading Math.random while it prerenders the app.
  let random: (() => number) | undefined;

  /**
   * Returns the next value from the lobby code generator.
   *
   * @returns A number in [0, 1).
   */
  function nextRandom(): number {
    random ??= createSeededRandom(options.seed ?? freshSeed());
    return random();
  }

  const now = options.now ?? Date.now;
  const lobbiesByCode = new Map<string, Lobby>();
  const auctionsByCode = new Map<string, StoredAuction>();
  let sequence = 0;

  /**
   * Draws a code that no existing lobby uses. Retries on collision, which is
   * rare with 36^6 codes but cheap to handle.
   *
   * @returns A code of {@link LOBBY_CODE_LENGTH} characters.
   */
  function drawUnusedCode(): string {
    let code: string;
    do {
      code = "";
      for (let index = 0; index < LOBBY_CODE_LENGTH; index += 1) {
        code += CODE_ALPHABET.charAt(
          Math.floor(nextRandom() * CODE_ALPHABET.length),
        );
      }
    } while (lobbiesByCode.has(code));
    return code;
  }

  /**
   * Normalises a code the guest typed, then validates it. Guests may type
   * lowercase or pad the code with spaces. Every entry point goes through here,
   * so every method accepts the same inputs.
   *
   * @param code - The raw code from the caller.
   * @returns The uppercase, trimmed code.
   * @throws {ZodError} When the code is not a valid lobby code.
   */
  function normalizeCode(code: string): string {
    return lobbyCodeSchema.parse(code.trim().toUpperCase());
  }

  /**
   * Looks up a lobby by normalised code.
   *
   * @param code - A code that has already been normalised.
   * @returns The stored lobby.
   * @throws {LobbyNotFoundError} When no lobby has that code.
   */
  function findLobby(code: string): Lobby {
    const lobby = lobbiesByCode.get(code);
    if (!lobby) {
      throw new LobbyNotFoundError(code);
    }
    return lobby;
  }

  /**
   * Looks up a lobby's auction, settles any lot whose timer has run out, and
   * keeps the lobby's `auctionStatus` in step with the auction.
   *
   * @param code - A normalised lobby code.
   * @returns The stored auction, settled to the current time.
   * @throws {AuctionNotStartedError} When the auction has not started.
   */
  function settledAuction(code: string): StoredAuction {
    const stored = auctionsByCode.get(code);
    if (!stored) {
      throw new AuctionNotStartedError(code);
    }
    settleExpiredLots(stored.auction, stored.queue, now());
    const lobby = findLobby(code);
    lobby.auctionStatus = stored.auction.status;
    return stored;
  }

  return {
    async createLobby(rawInput) {
      const input = createLobbyInputSchema.parse(rawInput);
      const owner: Owner = {
        guestId: input.guestId,
        displayName: input.displayName,
        franchiseId: null,
      };
      const code = drawUnusedCode();
      sequence += 1;
      const lobby: Lobby = {
        id: `lobby-${sequence}`,
        code,
        name: input.name,
        phase: "auction",
        auctionStatus: "waiting",
        round: 0,
        owners: [owner],
        seedVersion: SEED_VERSION,
      };
      lobbiesByCode.set(code, lobby);
      return lobbySchema.parse(lobby);
    },

    async getLobby(rawCode) {
      const code = normalizeCode(rawCode);
      return lobbySchema.parse(findLobby(code));
    },

    async joinLobby(rawInput) {
      const input = joinLobbyInputSchema.parse({
        ...rawInput,
        code: normalizeCode(rawInput.code),
      });
      const lobby = findLobby(input.code);

      const alreadyOwner = lobby.owners.some(
        (owner) => owner.guestId === input.guestId,
      );
      if (alreadyOwner) {
        return lobbySchema.parse(lobby);
      }
      if (lobby.auctionStatus !== "waiting") {
        throw new AuctionAlreadyStartedError(input.code);
      }
      if (lobby.owners.length >= MAX_OWNERS) {
        throw new LobbyFullError(input.code);
      }

      lobby.owners.push({
        guestId: input.guestId,
        displayName: input.displayName,
        franchiseId: null,
      });
      return lobbySchema.parse(lobby);
    },

    async claimFranchise(rawInput) {
      const input = claimFranchiseInputSchema.parse({
        ...rawInput,
        code: normalizeCode(rawInput.code),
      });
      const lobby = findLobby(input.code);

      if (!TEAMS.some((team) => team.id === input.franchiseId)) {
        throw new FranchiseNotFoundError(input.franchiseId);
      }

      const block = franchiseClaimBlock(
        lobby,
        input.guestId,
        input.franchiseId,
      );
      if (block === "closed") {
        throw new FranchiseClaimClosedError();
      }
      if (block === "not-an-owner") {
        throw new NotAnOwnerError(input.guestId);
      }
      if (block === "taken") {
        throw new FranchiseTakenError(input.franchiseId);
      }

      const owner = lobby.owners.find((item) => item.guestId === input.guestId);
      if (owner) {
        owner.franchiseId = input.franchiseId;
      }
      return lobbySchema.parse(lobby);
    },

    async startAuction(rawInput) {
      const input = startAuctionInputSchema.parse({
        ...rawInput,
        code: normalizeCode(rawInput.code),
      });
      const lobby = findLobby(input.code);

      if (lobby.auctionStatus !== "waiting") {
        throw new AuctionAlreadyStartedError(input.code);
      }
      if (!lobby.owners.some((owner) => owner.guestId === input.guestId)) {
        throw new NotAnOwnerError(input.guestId);
      }
      if (lobby.owners.length === 0) {
        throw new AuctionStartBlockedError("no-owners");
      }
      if (lobby.owners.some((owner) => owner.franchiseId === null)) {
        throw new AuctionStartBlockedError("unclaimed-franchise");
      }

      const queue = auctionOrder(input.code);
      const auction = createMockAuction(input.code, lobby.owners, queue, now());
      auctionsByCode.set(input.code, { auction, queue });
      lobby.auctionStatus = auction.status;
      return lobbySchema.parse(lobby);
    },

    async getAuction(rawCode) {
      const code = normalizeCode(rawCode);
      return auctionSchema.parse(settledAuction(code).auction);
    },

    async placeBid(rawInput) {
      const input = placeBidInputSchema.parse({
        ...rawInput,
        code: normalizeCode(rawInput.code),
      });
      const stored = settledAuction(input.code);
      const clock = now();

      const reason = bidBlockReason(
        stored.auction,
        input.guestId,
        input.amountLakhs,
        clock,
      );
      if (reason !== null) {
        throw new BidBlockedError(reason);
      }
      recordBid(stored.auction, input.guestId, input.amountLakhs, clock);
      return auctionSchema.parse(stored.auction);
    },
  };
}
