import { describe, expect, it } from "vitest";

import { BID_TIMER_MS, SQUAD_SIZE } from "../../shared/const/auction.const";
import { LAST_ROUND } from "../../shared/const/lobby.const";
import { XI_SIZE } from "../../shared/const/squad.const";
import type { Player } from "../../shared/types/player.types";
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
function must<T>(value: T | undefined | null, message: string): T {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
  return value;
}

/**
 * Builds a one-owner lobby with a fake clock, and starts its auction.
 *
 * @returns The API, the clock, and the lobby code.
 */
async function setUpSoloLobby() {
  let clock = 1_000_000;
  const api = createMockGameApi({ seed: "league", now: () => clock });
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
 * Saves a legal starting XI for the owner.
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
      player.role === "bowler" ||
      (player.role === "all-rounder" && player.bowling >= 50),
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

/**
 * Plays rounds until the season has reached the given round.
 *
 * @param game - A lobby with a saved XI.
 * @param round - The round to reach.
 */
async function playTo(game: Game, round: number) {
  while ((await game.api.getLeague(game.code)).round < round) {
    await game.api.advanceRound({ code: game.code, guestId: asha.guestId });
  }
}

describe("mock awards", () => {
  it("has no awards to give before any match is played", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);

    const awards = await game.api.getAwards(game.code);

    expect(awards.seasonComplete).toBe(false);
    expect(awards.orangeCap).toEqual({ winner: null, runnerUp: null });
    expect(awards.purpleCap).toEqual({ winner: null, runnerUp: null });
    expect(awards.mostValuable).toEqual({ winner: null, runnerUp: null });
    expect(awards.emerging).toEqual({ winner: null, runnerUp: null });
    expect(awards.fairPlay).toEqual({
      winnerFranchiseId: null,
      franchises: [],
    });
    expect(awards.manOfTheMatch).toEqual([]);
  });

  it("names a Man of the Match for every league match, from one of its two sides", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);
    await game.api.advanceRound({ code: game.code, guestId: asha.guestId });

    const awards = await game.api.getAwards(game.code);

    expect(awards.manOfTheMatch).toHaveLength(5);
    for (const award of awards.manOfTheMatch) {
      expect([award.homeFranchiseId, award.awayFranchiseId]).toContain(
        award.franchiseId,
      );
      expect(award.round).toBe(1);
    }
  });

  it("gives the caps, Most Valuable Player and Fair Play once the first round is played", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);
    await game.api.advanceRound({ code: game.code, guestId: asha.guestId });

    const awards = await game.api.getAwards(game.code);

    expect(awards.orangeCap.winner).not.toBeNull();
    expect(awards.purpleCap.winner).not.toBeNull();
    expect(awards.mostValuable.winner?.guestId).toBe(asha.guestId);
    expect(awards.fairPlay.franchises).toHaveLength(10);
    expect(awards.fairPlay.winnerFranchiseId).not.toBeNull();
  });

  it("orders the caps: the Orange Cap winner has at least as many runs as the runner-up", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);
    await playTo(game, 3);

    const { orangeCap, purpleCap } = await game.api.getAwards(game.code);

    expect(orangeCap.winner?.runs ?? 0).toBeGreaterThanOrEqual(
      orangeCap.runnerUp?.runs ?? 0,
    );
    expect(purpleCap.winner?.wickets ?? 0).toBeGreaterThanOrEqual(
      purpleCap.runnerUp?.wickets ?? 0,
    );
  });

  it("lists the two most lowering and most lifting players for each franchise", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);
    await playTo(game, 2);

    const { fairPlay } = await game.api.getAwards(game.code);

    for (const franchise of fairPlay.franchises) {
      expect(franchise.lowering.length).toBeLessThanOrEqual(2);
      expect(franchise.lifting.length).toBeLessThanOrEqual(2);
      for (const line of franchise.lowering) {
        expect(line.averageEffect).toBeLessThan(0);
      }
    }
  });

  it("completes the season: a Man of the Match for all 74 matches, and the season marked complete", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);
    await playTo(game, LAST_ROUND);

    const awards = await game.api.getAwards(game.code);

    expect(awards.seasonComplete).toBe(true);
    expect(awards.manOfTheMatch).toHaveLength(74);
  });

  it("gives the same awards for the same lobby and seed", async () => {
    const first = await setUpSoloLobby();
    const second = await setUpSoloLobby();
    for (const game of [first, second]) {
      await completeSoloAuction(game);
      await saveLegalXi(game);
      await playTo(game, 4);
    }

    expect(await second.api.getAwards(second.code)).toEqual(
      await first.api.getAwards(first.code),
    );
  });
});
