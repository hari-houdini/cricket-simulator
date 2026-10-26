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
import {
  getSquadInputSchema,
  setStartingXiInputSchema,
  squadSchema,
  startingXiSchema,
  substituteInputSchema,
} from "../../shared/types/squad.schema";
import type { Squad, StartingXi } from "../../shared/types/squad.types";
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
  SquadNotReadyError,
  SubstitutionBlockedError,
  XiBlockedError,
  XiLockedError,
} from "../../shared/utils/game-api.errors";
import { createSeededRandom } from "../../shared/utils/seeded-random";
import {
  isXiLocked,
  startingXiBlock,
  substitutionBlock,
} from "../../shared/utils/squad-rules";
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
 * One owner's choices in a lobby. The squad's players come from the auction, so
 * only the XI and the substitution are kept here.
 */
type StoredSquadChoices = {
  startingXi: StartingXi | null;
  substitutionUsed: boolean;
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
  const squadChoices = new Map<string, StoredSquadChoices>();
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

  /**
   * Returns one owner's saved squad choices, creating an empty record the first
   * time the owner reads or changes the squad.
   *
   * @param code - A normalised lobby code.
   * @param guestId - The owner's guest ID.
   * @returns The owner's choices, which the caller may change.
   */
  function choicesFor(code: string, guestId: string): StoredSquadChoices {
    const key = JSON.stringify([code, guestId]);
    let choices = squadChoices.get(key);
    if (!choices) {
      choices = { startingXi: null, substitutionUsed: false };
      squadChoices.set(key, choices);
    }
    return choices;
  }

  /**
   * Looks up an owner's squad once the auction has finished, which is the only
   * time a squad is complete.
   *
   * @param code - A normalised lobby code.
   * @param guestId - The owner's guest ID.
   * @returns The squad's players, the lobby round and the owner's choices.
   * @throws {SquadNotReadyError} When the auction has not finished.
   * @throws {NotAnOwnerError} When the guest holds no squad in the lobby.
   */
  function completedSquad(code: string, guestId: string) {
    const stored = settledAuction(code);
    if (stored.auction.status !== "complete") {
      throw new SquadNotReadyError(code);
    }
    const purse = stored.auction.purses.find(
      (item) => item.guestId === guestId,
    );
    if (!purse) {
      throw new NotAnOwnerError(guestId);
    }
    return {
      players: purse.squad,
      round: findLobby(code).round,
      choices: choicesFor(code, guestId),
    };
  }

  /**
   * Builds the squad the API returns from a completed squad and its choices.
   *
   * @param guestId - The owner's guest ID.
   * @param completed - The result of {@link completedSquad}.
   * @returns A validated squad.
   */
  function squadView(
    guestId: string,
    completed: ReturnType<typeof completedSquad>,
  ): Squad {
    return squadSchema.parse({
      guestId,
      players: completed.players,
      startingXi: completed.choices.startingXi,
      locked: isXiLocked(completed.round),
      substitutionUsed: completed.choices.substitutionUsed,
    });
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

    async getSquad(rawInput) {
      const input = getSquadInputSchema.parse({
        ...rawInput,
        code: normalizeCode(rawInput.code),
      });
      return squadView(
        input.guestId,
        completedSquad(input.code, input.guestId),
      );
    },

    async setStartingXi(rawInput) {
      const input = setStartingXiInputSchema.parse({
        ...rawInput,
        code: normalizeCode(rawInput.code),
      });
      const completed = completedSquad(input.code, input.guestId);
      if (isXiLocked(completed.round)) {
        throw new XiLockedError(input.code);
      }

      const selection = {
        playerIds: input.playerIds,
        captainId: input.captainId,
        viceCaptainId: input.viceCaptainId,
      };
      const block = startingXiBlock(completed.players, selection);
      if (block !== null) {
        throw new XiBlockedError(block);
      }
      completed.choices.startingXi = startingXiSchema.parse(selection);
      return squadView(input.guestId, completed);
    },

    async substitute(rawInput) {
      const input = substituteInputSchema.parse({
        ...rawInput,
        code: normalizeCode(rawInput.code),
      });
      const completed = completedSquad(input.code, input.guestId);
      const { choices } = completed;
      const block = substitutionBlock({
        squad: completed.players,
        startingXi: choices.startingXi,
        substitutionUsed: choices.substitutionUsed,
        round: completed.round,
        outPlayerId: input.outPlayerId,
        inPlayerId: input.inPlayerId,
      });
      if (block !== null) {
        throw new SubstitutionBlockedError(block);
      }

      // The block check above passed, so the XI exists and holds the outgoing player.
      const xi = choices.startingXi;
      if (xi) {
        choices.startingXi = startingXiSchema.parse({
          ...xi,
          playerIds: xi.playerIds.map((id) =>
            id === input.outPlayerId ? input.inPlayerId : id,
          ),
        });
      }
      choices.substitutionUsed = true;
      return squadView(input.guestId, completed);
    },
  };
}
