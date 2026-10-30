import { describe, expect, it } from "vitest";

import { BID_TIMER_MS, SQUAD_SIZE } from "../../shared/const/auction.const";
import {
  LEAGUE_MATCHES,
  LEAGUE_ROUNDS,
  MATCH_INTERVAL_MS,
} from "../../shared/const/league.const";
import { LAST_ROUND } from "../../shared/const/lobby.const";
import { XI_SIZE } from "../../shared/const/squad.const";
import type { Player } from "../../shared/types/player.types";
import { LeagueNotStartedError } from "../../shared/utils/game-api.errors";
import { startingXiBlock } from "../../shared/utils/squad-rules";
import { advanceMatches } from "./advance-steps.mock";
import { createMockGameApi } from "./mock-game-api";

const asha = { guestId: "asha", displayName: "Asha" };

/**
 * Returns a value the test expects to exist, and fails the test when it does not.
 *
 * @param value - The value that should be present.
 * @param message - What is missing, for the failure message.
 * @returns The value, typed without `undefined`.
 * @throws {Error} When the value is missing.
 */
function must<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

/**
 * Builds a one-owner lobby with a fake clock, and starts its auction.
 *
 * @param seed - The mock's seed, so two calls can give the same lobby code.
 * @returns The API, the clock, and the lobby code.
 */
async function setUpSoloLobby(seed = "league") {
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
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

type Game = Awaited<ReturnType<typeof setUpSoloLobby>>;

/**
 * Drives the one-owner auction to the end, so the owner holds a full squad.
 *
 * @param game - The lobby from {@link setUpSoloLobby}.
 */
async function completeSoloAuction(game: Game) {
  for (let lot = 0; lot < SQUAD_SIZE; lot += 1) {
    const auction = await game.api.getAuction(game.code);
    if (!auction.lot) {
      break;
    }
    await game.api.placeBid({
      code: game.code,
      guestId: asha.guestId,
      amountLakhs: auction.lot.minimumBidLakhs,
    });
    game.advance(BID_TIMER_MS + 1);
  }
  await game.api.getAuction(game.code);
}

/**
 * Picks a legal starting XI from a squad, and saves it for the owner.
 *
 * @param game - A lobby whose auction has finished.
 */
async function saveLegalXi(game: Game) {
  const squad = await game.api.getSquad({
    code: game.code,
    guestId: asha.guestId,
  });
  const keeper = must(
    squad.players.find((player: Player) => player.role === "wicket-keeper"),
    "No wicket-keeper.",
  );
  const bowlers = squad.players.filter(
    (player: Player) =>
      player.role === "bowler" || player.role === "all-rounder",
  );
  const chosen = [keeper, ...bowlers.slice(0, 4)];
  for (const player of squad.players) {
    if (chosen.length === XI_SIZE) {
      break;
    }
    if (!chosen.includes(player) && player.role !== "wicket-keeper") {
      chosen.push(player);
    }
  }
  await game.api.setStartingXi({
    code: game.code,
    guestId: asha.guestId,
    playerIds: chosen.map((player) => player.id),
    captainId: must(bowlers[0], "No bowler for captain.").id,
    viceCaptainId: must(bowlers[1], "No bowler for vice-captain.").id,
  });
}

describe("mock league", () => {
  it("refuses the league before the auction has started", async () => {
    const clock = 0;
    const api = createMockGameApi({ seed: "early", now: () => clock });
    const created = await api.createLobby({ name: "Early", ...asha });

    await expect(api.getLeague(created.code)).rejects.toBeInstanceOf(
      LeagueNotStartedError,
    );
  });

  it("refuses the league while the auction is still running", async () => {
    const game = await setUpSoloLobby();

    await expect(game.api.getLeague(game.code)).rejects.toBeInstanceOf(
      LeagueNotStartedError,
    );
  });

  it("moves the lobby to the league phase once the auction completes", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);

    const lobby = await game.api.getLobby(game.code);

    expect(lobby.phase).toBe("league");
    expect(lobby.round).toBe(0);
  });

  it("shows every fixture unplayed and an empty table before round one", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);

    const league = await game.api.getLeague(game.code);

    expect(league.round).toBe(0);
    expect(league.fixtures).toHaveLength(LEAGUE_MATCHES);
    expect(league.fixtures.every((fixture) => fixture.result === null)).toBe(
      true,
    );
    expect(league.standings.every((row) => row.played === 0)).toBe(true);
    expect(league.leagueComplete).toBe(false);
  });

  it("gives an owner who saved no XI a default one when round one is played", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);

    await advanceMatches(game.api, game.code, 1, game.advance);
    const squad = await game.api.getSquad({
      code: game.code,
      guestId: asha.guestId,
    });

    const xi = squad.startingXi;
    expect(xi).not.toBeNull();
    expect(squad.locked).toBe(true);
    expect(xi && startingXiBlock(squad.players, xi)).toBeNull();
  });

  it("plays one match per step, and the round reached is the round of the last match played", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);

    await advanceMatches(game.api, game.code, 1, game.advance);
    const first = await game.api.getLeague(game.code);
    expect(
      first.fixtures.filter((fixture) => fixture.result !== null),
    ).toHaveLength(1);
    expect(first.round).toBe(1);

    await advanceMatches(game.api, game.code, 4, game.advance);
    const league = await game.api.getLeague(game.code);

    const played = league.fixtures.filter((fixture) => fixture.result !== null);
    expect(league.round).toBe(1);
    expect(played).toHaveLength(5);
    expect(played.every((fixture) => fixture.round === 1)).toBe(true);
    const points = league.standings.reduce(
      (total, row) => total + row.points,
      0,
    );
    expect(points).toBe(played.length * 2);
    expect((await game.api.getLobby(game.code)).round).toBe(1);
  });

  it("gives the same results for the same lobby and seed", async () => {
    const first = await setUpSoloLobby();
    const second = await setUpSoloLobby();
    for (const game of [first, second]) {
      await completeSoloAuction(game);
      await saveLegalXi(game);
    }

    await advanceMatches(first.api, first.code, 3, first.advance);
    await advanceMatches(second.api, second.code, 3, second.advance);
    const playedFirst = await first.api.getLeague(first.code);
    const playedSecond = await second.api.getLeague(second.code);

    expect(playedFirst.fixtures).toEqual(playedSecond.fixtures);
  });

  it("plays the league and playoffs to the end of the season, then plays nothing more", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);

    const steps = LEAGUE_MATCHES + (LAST_ROUND - LEAGUE_ROUNDS);
    await advanceMatches(game.api, game.code, steps, game.advance);
    const league = await game.api.getLeague(game.code);

    expect(league.round).toBe(LAST_ROUND);
    expect(league.leagueComplete).toBe(true);
    expect(league.fixtures.every((fixture) => fixture.result !== null)).toBe(
      true,
    );
    expect(league.standings.every((row) => row.played === 14)).toBe(true);
    game.advance(MATCH_INTERVAL_MS * 3);
    const after = await game.api.getLeague(game.code);
    expect(after.fixtures).toEqual(league.fixtures);
  });
});
