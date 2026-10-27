import { LEAGUE_ROUNDS } from "../../shared/const/league.const";
import {
  LAST_ROUND,
  LOBBY_CODE_LENGTH,
  MAX_OWNERS,
} from "../../shared/const/lobby.const";
import { SEED_VERSION } from "../../shared/const/seed.const";
import { TEAMS } from "../../shared/const/teams.const";
import {
  auctionSchema,
  placeBidInputSchema,
  startAuctionInputSchema,
} from "../../shared/types/auction.schema";
import type { Auction } from "../../shared/types/auction.types";
import type { Awards } from "../../shared/types/awards.types";
import type { GameApi } from "../../shared/types/game-api.types";
import {
  advanceRoundInputSchema,
  leagueSchema,
} from "../../shared/types/league.schema";
import type { League, MatchScore } from "../../shared/types/league.types";
import {
  claimFranchiseInputSchema,
  createLobbyInputSchema,
  joinLobbyInputSchema,
  lobbyCodeSchema,
  lobbySchema,
} from "../../shared/types/lobby.schema";
import type { Lobby, Owner } from "../../shared/types/lobby.types";
import type { Player } from "../../shared/types/player.types";
import { playoffsSchema } from "../../shared/types/playoffs.schema";
import type {
  PlayoffResult,
  Playoffs,
} from "../../shared/types/playoffs.types";
import type { PlayoffSlot } from "../../shared/types/schedule.types";
import {
  getSquadInputSchema,
  setStartingXiInputSchema,
  squadSchema,
  startingXiSchema,
  substituteInputSchema,
} from "../../shared/types/squad.schema";
import type { Squad, StartingXi } from "../../shared/types/squad.types";
import { bidBlockReason } from "../../shared/utils/auction-rules";
import { defaultStartingXi } from "../../shared/utils/default-xi";
import { franchiseClaimBlock } from "../../shared/utils/franchise-claim";
import {
  AuctionAlreadyStartedError,
  AuctionNotStartedError,
  AuctionStartBlockedError,
  BidBlockedError,
  FranchiseClaimClosedError,
  FranchiseNotFoundError,
  FranchiseTakenError,
  LeagueAdvanceBlockedError,
  LeagueNotStartedError,
  LobbyFullError,
  LobbyNotFoundError,
  NotAnOwnerError,
  SquadNotReadyError,
  SubstitutionBlockedError,
  XiBlockedError,
  XiLockedError,
} from "../../shared/utils/game-api.errors";
import { keyMomentsFor } from "../../shared/utils/key-moments";
import { advanceBlock } from "../../shared/utils/league-rules";
import {
  allocateMatch,
  type PlayingSide,
} from "../../shared/utils/match-performance";
import { strongestXi } from "../../shared/utils/match-simulator";
import {
  decisionFor,
  resolvePlayoffSource,
  type SlotDecision,
  superOverWinner,
} from "../../shared/utils/playoff-rules";
import { createSeededRandom } from "../../shared/utils/seeded-random";
import {
  isXiLocked,
  startingXiBlock,
  substitutionBlock,
} from "../../shared/utils/squad-rules";
import { buildStandings } from "../../shared/utils/standings";
import { auctionOrder, currentPlayers } from "./auction-pool";
import { leagueSchedule, playoffSchedule } from "./league-schedule";
import {
  createMockAuction,
  recordBid,
  settleExpiredLots,
} from "./mock-auction";
import { type AwardOwner, buildAwards } from "./mock-awards";
import {
  type MatchRecord,
  matchSeedKey,
  playMatch,
  playoffResultKey,
  recordMatch,
  resultKey,
} from "./mock-league";

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
  /** Played league results, keyed by {@link resultKey}. */
  const leagueResults = new Map<string, MatchScore>();
  /** Played playoff matches, keyed by {@link playoffResultKey}. */
  const playoffResults = new Map<string, PlayoffResult>();
  /** Every played match's player lines, by lobby code, for the awards. */
  const matchRecordsByCode = new Map<string, MatchRecord[]>();
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
    if (stored.auction.status === "complete" && lobby.phase === "auction") {
      lobby.phase = "league";
    }
    return stored;
  }

  /**
   * Checks that the season has started: the auction exists and has finished.
   *
   * @param code - A normalised lobby code.
   * @throws {LeagueNotStartedError} When the auction has not finished.
   */
  function requireSeason(code: string): void {
    if (
      !auctionsByCode.has(code) ||
      settledAuction(code).auction.status !== "complete"
    ) {
      throw new LeagueNotStartedError(code);
    }
  }

  /**
   * Every league fixture in round order, with its result if it has been played.
   *
   * @param code - A normalised lobby code.
   * @returns The 70 league fixtures.
   */
  function fixturesFor(code: string) {
    return leagueSchedule().map((match) => ({
      round: match.round,
      homeFranchiseId: match.homeFranchiseId,
      awayFranchiseId: match.awayFranchiseId,
      result: leagueResults.get(resultKey(code, match)) ?? null,
    }));
  }

  /**
   * The league table, best first, from the played league fixtures.
   *
   * @param code - A normalised lobby code.
   * @returns Franchise ids in table order.
   */
  function standingOrderFor(code: string): string[] {
    return buildStandings(
      TEAMS.map((team) => team.id),
      fixturesFor(code),
    ).map((row) => row.franchiseId);
  }

  /**
   * Builds the league view for a lobby: every fixture in round order with its
   * result if it has been played, and the table from those results.
   *
   * @param code - A normalised lobby code.
   * @returns The league, validated.
   */
  function leagueView(code: string): League {
    const lobby = findLobby(code);
    const fixtures = fixturesFor(code);
    return leagueSchema.parse({
      round: lobby.round,
      fixtures,
      standings: buildStandings(
        TEAMS.map((team) => team.id),
        fixtures,
      ),
      leagueComplete: lobby.round >= LEAGUE_ROUNDS,
    });
  }

  /**
   * Builds the bracket for a lobby. Playoff places come from the table once the
   * league is over, and from the decided slots as they are played. A place that
   * is not known yet is null.
   *
   * @param code - A normalised lobby code.
   * @returns The bracket, validated.
   */
  function playoffsView(code: string): Playoffs {
    const leagueOver = findLobby(code).round >= LEAGUE_ROUNDS;
    const standingOrder = leagueOver ? standingOrderFor(code) : [];
    const decided = new Map<PlayoffSlot, SlotDecision>();
    for (const template of playoffSchedule()) {
      const result = playoffResults.get(playoffResultKey(code, template.slot));
      if (result) {
        decided.set(
          template.slot,
          decisionFor(
            result.homeFranchiseId,
            result.awayFranchiseId,
            result.winnerFranchiseId,
          ),
        );
      }
    }

    const matches = playoffSchedule().map((template) => ({
      slot: template.slot,
      round: template.round,
      homeFranchiseId: resolvePlayoffSource(
        template.home,
        standingOrder,
        decided,
      ),
      awayFranchiseId: resolvePlayoffSource(
        template.away,
        standingOrder,
        decided,
      ),
      result: playoffResults.get(playoffResultKey(code, template.slot)) ?? null,
    }));
    return playoffsSchema.parse({
      matches,
      champion:
        playoffResults.get(playoffResultKey(code, "final"))
          ?.winnerFranchiseId ?? null,
    });
  }

  /**
   * The players who take the field for a franchise. An owned franchise plays
   * the owner's starting XI from the squad. An unowned franchise is a system
   * squad: its strongest current players from the seed.
   *
   * @param code - A normalised lobby code.
   * @param franchiseId - The franchise.
   * @returns The players on the field.
   */
  function fieldFor(code: string, franchiseId: string): Player[] {
    const owner = findLobby(code).owners.find(
      (item) => item.franchiseId === franchiseId,
    );
    if (!owner) {
      return strongestXi(
        currentPlayers().filter((player) => player.franchiseId === franchiseId),
      );
    }
    const squad = squadOf(code, owner.guestId);
    // Every owner has an XI here: advanceRound stores one before it plays.
    // The XI's order is the batting order, so the saved order is kept.
    const xiIds = choicesFor(code, owner.guestId).startingXi?.playerIds ?? [];
    return xiIds.flatMap((id) => squad.filter((player) => player.id === id));
  }

  /**
   * Reads an owner's squad from the auction. Empty before the auction has
   * started.
   *
   * @param code - A normalised lobby code.
   * @param guestId - The owner's guest ID.
   * @returns The owner's players, in the order they were bought.
   */
  function squadOf(code: string, guestId: string): Player[] {
    return (
      auctionsByCode
        .get(code)
        ?.auction.purses.find((item) => item.guestId === guestId)?.squad ?? []
    );
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

  /**
   * Plays one fixture and records every player's line. A knockout match cannot
   * be tied, so a level score goes to a super over.
   *
   * @param code - A normalised lobby code.
   * @param round - The round the fixture is played in.
   * @param homeFranchiseId - The home franchise, which bats first.
   * @param awayFranchiseId - The away franchise.
   * @param knockout - Whether the match is a playoff match.
   * @returns The score, with the winner set for a knockout, and whether a super over decided it.
   */
  function playFixture(
    code: string,
    round: number,
    homeFranchiseId: string,
    awayFranchiseId: string,
    knockout: boolean,
  ): { score: MatchScore; superOver: boolean } {
    const seedKey = matchSeedKey(code, round, homeFranchiseId, awayFranchiseId);
    const homeField = fieldFor(code, homeFranchiseId);
    const awayField = fieldFor(code, awayFranchiseId);
    const played = playMatch(
      seedKey,
      homeFranchiseId,
      awayFranchiseId,
      homeField,
      awayField,
    );

    const superOver = knockout && played.winnerFranchiseId === null;
    const score: MatchScore = {
      ...played,
      winnerFranchiseId: superOver
        ? superOverWinner(
            homeFranchiseId,
            awayFranchiseId,
            createSeededRandom(`${seedKey}:super-over`)(),
          )
        : played.winnerFranchiseId,
    };

    const home: PlayingSide = { franchiseId: homeFranchiseId, xi: homeField };
    const away: PlayingSide = { franchiseId: awayFranchiseId, xi: awayField };
    const record = recordMatch({
      matchKey: seedKey,
      round,
      homeFranchiseId,
      awayFranchiseId,
      performances: allocateMatch(seedKey, home, away, score),
      troubleRatingById: new Map(
        [...homeField, ...awayField].flatMap((player): [string, number][] =>
          player.troubleRating === undefined
            ? []
            : [[player.id, player.troubleRating]],
        ),
      ),
    });
    const records = matchRecordsByCode.get(code) ?? [];
    records.push(record);
    matchRecordsByCode.set(code, records);
    return { score, superOver };
  }

  /**
   * Plays every fixture of a league round and stores the results.
   *
   * @param code - A normalised lobby code.
   * @param round - The league round, from 1 to {@link LEAGUE_ROUNDS}.
   */
  function playLeagueRound(code: string, round: number) {
    for (const match of leagueSchedule()) {
      if (match.round === round) {
        const { score } = playFixture(
          code,
          round,
          match.homeFranchiseId,
          match.awayFranchiseId,
          false,
        );
        leagueResults.set(resultKey(code, match), score);
      }
    }
  }

  /**
   * Plays the playoff match of a round and stores it with its key moments. A
   * level score goes to a super over, so every playoff match has a winner.
   *
   * @param code - A normalised lobby code.
   * @param round - The playoff round, from {@link LEAGUE_ROUNDS} + 1 to {@link LAST_ROUND}.
   * @throws {Error} When the round's teams are not known yet, which the round order rules out.
   */
  function playPlayoffRound(code: string, round: number) {
    const match = playoffsView(code).matches.find(
      (item) => item.round === round,
    );
    const home = match?.homeFranchiseId;
    const away = match?.awayFranchiseId;
    if (!match || !home || !away) {
      throw new Error(`Playoff round ${round} has no teams to play.`);
    }

    const { score, superOver } = playFixture(code, round, home, away, true);
    // A knockout match is never tied: playFixture settles a level score.
    const winnerFranchiseId = score.winnerFranchiseId;
    if (winnerFranchiseId === null) {
      throw new Error(`Playoff round ${round} ended without a winner.`);
    }
    playoffResults.set(playoffResultKey(code, match.slot), {
      homeFranchiseId: home,
      awayFranchiseId: away,
      winnerFranchiseId,
      superOver,
      score,
      keyMoments: keyMomentsFor(score, home, away),
    });
  }

  /**
   * Builds the awards for a lobby from its played matches.
   *
   * @param code - A normalised lobby code.
   * @returns The awards, validated.
   */
  function awardsView(code: string): Awards {
    const lobby = findLobby(code);
    const owners: AwardOwner[] = lobby.owners.flatMap((owner) => {
      if (owner.franchiseId === null) {
        return [];
      }
      const xi = choicesFor(code, owner.guestId).startingXi;
      return [
        {
          guestId: owner.guestId,
          displayName: owner.displayName,
          franchiseId: owner.franchiseId,
          captainId: xi?.captainId ?? null,
          viceCaptainId: xi?.viceCaptainId ?? null,
        },
      ];
    });
    return buildAwards({
      seasonComplete: lobby.phase === "complete",
      records: matchRecordsByCode.get(code) ?? [],
      owners,
      standings: buildStandings(
        TEAMS.map((team) => team.id),
        fixturesFor(code),
      ),
      players: currentPlayers(),
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

    async getLeague(rawCode) {
      const code = normalizeCode(rawCode);
      requireSeason(code);
      return leagueView(code);
    },

    async advanceRound(rawInput) {
      const input = advanceRoundInputSchema.parse({
        ...rawInput,
        code: normalizeCode(rawInput.code),
      });
      requireSeason(input.code);
      const lobby = findLobby(input.code);
      if (!lobby.owners.some((owner) => owner.guestId === input.guestId)) {
        throw new NotAnOwnerError(input.guestId);
      }

      const everyOwnerCanField = lobby.owners.every(
        (owner) =>
          choicesFor(input.code, owner.guestId).startingXi !== null ||
          defaultStartingXi(squadOf(input.code, owner.guestId)) !== null,
      );
      const block = advanceBlock({
        round: lobby.round,
        everyOwnerCanField,
      });
      if (block !== null) {
        throw new LeagueAdvanceBlockedError(block);
      }

      // An owner who saved no XI plays with the default one. It is stored, so
      // the owner can see it and it locks with the rest of the XI.
      for (const owner of lobby.owners) {
        const choices = choicesFor(input.code, owner.guestId);
        if (choices.startingXi === null) {
          choices.startingXi = defaultStartingXi(
            squadOf(input.code, owner.guestId),
          );
        }
      }

      const round = lobby.round + 1;
      if (round <= LEAGUE_ROUNDS) {
        playLeagueRound(input.code, round);
      } else {
        playPlayoffRound(input.code, round);
      }
      lobby.round = round;
      if (round === LEAGUE_ROUNDS) {
        lobby.phase = "playoffs";
      }
      if (round === LAST_ROUND) {
        lobby.phase = "complete";
      }
      return leagueView(input.code);
    },

    async getAwards(rawCode) {
      const code = normalizeCode(rawCode);
      requireSeason(code);
      return awardsView(code);
    },

    async getPlayoffs(rawCode) {
      const code = normalizeCode(rawCode);
      requireSeason(code);
      return playoffsView(code);
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
