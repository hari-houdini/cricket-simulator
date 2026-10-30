import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { BID_TIMER_MS, SQUAD_SIZE } from "../../shared/const/auction.const";
import { FRANCHISE_COUNT } from "../../shared/const/league.const";
import type { GameEvent } from "../../shared/types/game-event.types";
import {
  LeagueNotStartedError,
  LobbyNotFoundError,
  MatchNotFoundError,
} from "../../shared/utils/game-api.errors";
import {
  advanceMatches,
  ROUND_MATCHES,
  SEASON_STEPS,
} from "./advance-steps.mock";
import { createMockGameApi } from "./mock-game-api";
import { leagueMatchId } from "./mock-league";

const asha = { guestId: "asha", displayName: "Asha" };

/**
 * Returns a value the test expects to exist, and fails the test when it does not.
 *
 * @param value - The value that should be present.
 * @param message - What is missing, for the failure message.
 * @returns The value, typed without `undefined`.
 * @throws {Error} When the value is missing.
 */
function must<T>(value: T | null | undefined, message: string): NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
  return value;
}

/**
 * Creates a one-owner lobby on a fake clock, claims a franchise, and starts the auction.
 *
 * @param seed - The mock's seed.
 * @returns The API, the lobby code, and a way to move the clock forward.
 */
async function startSoloAuction(seed: string) {
  let clock = 1_000_000;
  const api = createMockGameApi({ seed, now: () => clock });
  const created = await api.createLobby({ name: "Solo", ...asha });
  await api.claimFranchise({
    code: created.code,
    guestId: asha.guestId,
    franchiseId: "csk",
  });
  await api.startAuction({ code: created.code, guestId: asha.guestId });
  return {
    api,
    code: created.code,
    tick: (ms: number) => {
      clock += ms;
    },
  };
}

/**
 * Starts a solo lobby and buys a full squad, so the season can be played.
 *
 * @returns The game, with the auction finished.
 */
async function finishedSoloAuction() {
  // The default seed deals a squad with a legal starting XI, which a season needs.
  const game = await startSoloAuction("league");
  for (let lot = 0; lot < SQUAD_SIZE; lot += 1) {
    const auction = await game.api.getAuction(game.code);
    const current = must(
      auction.lot,
      "The auction closed before a full squad.",
    );
    await game.api.placeBid({
      code: game.code,
      guestId: asha.guestId,
      amountLakhs: current.minimumBidLakhs,
    });
    game.tick(BID_TIMER_MS + 1);
  }
  await game.api.getAuction(game.code);
  return game;
}

/**
 * Collects every live event a lobby sends from now on.
 *
 * @param game - The lobby to listen to.
 * @returns The events array, which fills as events arrive, and the subscription's stop function.
 */
async function listen(game: {
  api: ReturnType<typeof createMockGameApi>;
  code: string;
}) {
  const events: GameEvent[] = [];
  const stop = await game.api.subscribe(game.code, (event) => {
    events.push(event);
  });
  return { events, stop };
}

describe("mock game API live events", () => {
  it("announces a bid to subscribers", async () => {
    const game = await startSoloAuction("events-bid");
    const { events } = await listen(game);
    const auction = await game.api.getAuction(game.code);
    const lot = must(auction.lot, "No lot is open.");

    await game.api.placeBid({
      code: game.code,
      guestId: asha.guestId,
      amountLakhs: lot.minimumBidLakhs,
    });

    expect(events).toEqual([
      {
        type: "auction_bid",
        code: game.code,
        playerId: lot.player.id,
        guestId: asha.guestId,
        amountLakhs: lot.minimumBidLakhs,
      },
    ]);
  });

  it("announces a hammer when a lot's timer runs out with a bid standing", async () => {
    const game = await startSoloAuction("events-hammer");
    const { events } = await listen(game);
    const lot = must((await game.api.getAuction(game.code)).lot, "No lot.");
    await game.api.placeBid({
      code: game.code,
      guestId: asha.guestId,
      amountLakhs: lot.minimumBidLakhs,
    });

    game.tick(BID_TIMER_MS + 1);
    await game.api.getAuction(game.code);

    expect(events.at(-1)).toEqual({
      type: "auction_hammer",
      code: game.code,
      playerId: lot.player.id,
      guestId: asha.guestId,
      amountLakhs: lot.minimumBidLakhs,
    });
  });

  it("announces each league match from start to finish, in order", async () => {
    const game = await finishedSoloAuction();
    const { events } = await listen(game);

    await advanceMatches(game.api, game.code, ROUND_MATCHES, game.tick);

    const started = events.filter((event) => event.type === "match_started");
    const completed = events.filter((event) => event.type === "match_complete");
    expect(started).toHaveLength(5);
    expect(completed).toHaveLength(5);
    for (const start of started) {
      const finishIndex = events.findIndex(
        (event) =>
          event.type === "match_complete" && event.matchId === start.matchId,
      );
      expect(finishIndex, `match ${start.matchId} finishes`).toBeGreaterThan(
        events.indexOf(start),
      );
    }
  });

  it("announces the season's champion once, when the Final is played", async () => {
    const game = await finishedSoloAuction();
    const { events } = await listen(game);

    await advanceMatches(game.api, game.code, SEASON_STEPS, game.tick);

    const champion = must(
      (await game.api.getPlayoffs(game.code)).champion,
      "No champion.",
    );
    const seasons = events.filter((event) => event.type === "season_complete");
    expect(seasons).toEqual([
      {
        type: "season_complete",
        code: game.code,
        championFranchiseId: champion,
      },
    ]);
  });

  it("stops sending events once the subscription is cancelled", async () => {
    const game = await startSoloAuction("events-stop");
    const { events, stop } = await listen(game);
    stop();
    const lot = must((await game.api.getAuction(game.code)).lot, "No lot.");

    await game.api.placeBid({
      code: game.code,
      guestId: asha.guestId,
      amountLakhs: lot.minimumBidLakhs,
    });

    expect(events).toEqual([]);
  });

  it("refuses to subscribe to a lobby that does not exist", async () => {
    const api = createMockGameApi({ seed: "events-missing" });

    await expect(api.subscribe("ZZZZZZ", () => {})).rejects.toThrow(
      LobbyNotFoundError,
    );
  });
});

describe("mock game API standings and matches", () => {
  it("refuses standings before the season starts", async () => {
    const game = await startSoloAuction("standings-early");

    await expect(game.api.getStandings(game.code)).rejects.toThrow(
      LeagueNotStartedError,
    );
  });

  it("returns the table with one row per franchise, and counts each match for both sides", async () => {
    const game = await finishedSoloAuction();
    await advanceMatches(game.api, game.code, ROUND_MATCHES, game.tick);

    const standings = await game.api.getStandings(game.code);

    expect(standings).toHaveLength(FRANCHISE_COUNT);
    expect(standings.reduce((total, row) => total + row.played, 0)).toBe(10);
  });

  it("reads a played league match by its id, and refuses one not yet played", async () => {
    const game = await finishedSoloAuction();
    await advanceMatches(game.api, game.code, ROUND_MATCHES, game.tick);
    const league = await game.api.getLeague(game.code);
    const played = must(
      league.fixtures.find((fixture) => fixture.round === 1),
      "No round 1 fixture.",
    );
    const unplayed = must(
      league.fixtures.find((fixture) => fixture.round === 2),
      "No round 2 fixture.",
    );

    const match = await game.api.getMatch(
      game.code,
      leagueMatchId(1, played.homeFranchiseId, played.awayFranchiseId),
    );
    expect(match.result).toEqual(played.result);

    await expect(
      game.api.getMatch(
        game.code,
        leagueMatchId(2, unplayed.homeFranchiseId, unplayed.awayFranchiseId),
      ),
    ).rejects.toThrow(MatchNotFoundError);
  });

  it("rejects a malformed match id before looking it up", async () => {
    const game = await finishedSoloAuction();

    await expect(game.api.getMatch(game.code, "Not An Id")).rejects.toThrow(
      ZodError,
    );
  });
});
