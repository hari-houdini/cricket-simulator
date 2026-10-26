import { describe, expect, it } from "vitest";

import { BID_TIMER_MS, SQUAD_SIZE } from "../../shared/const/auction.const";
import { LEAGUE_MATCHES, LEAGUE_ROUNDS } from "../../shared/const/league.const";
import { XI_SIZE } from "../../shared/const/squad.const";
import type { Player } from "../../shared/types/player.types";
import {
  LeagueAdvanceBlockedError,
  LeagueNotStartedError,
  NotAnOwnerError,
} from "../../shared/utils/game-api.errors";
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

describe("mock league", () => {
  it("refuses the league before the auction has started", async () => {
    const clock = 0;
    const api = createMockGameApi({ seed: "early", now: () => clock });
    const created = await api.createLobby({ name: "Early", ...asha });

    await expect(api.getLeague(created.code)).rejects.toBeInstanceOf(
      LeagueNotStartedError,
    );
    await expect(
      api.advanceRound({ code: created.code, guestId: asha.guestId }),
    ).rejects.toBeInstanceOf(LeagueNotStartedError);
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
    expect(league.seasonComplete).toBe(false);
  });

  it("refuses to play a round while an owner has no starting XI", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);

    await expect(
      game.api.advanceRound({ code: game.code, guestId: asha.guestId }),
    ).rejects.toMatchObject({ reason: "missing-starting-xi" });
  });

  it("refuses a round from a guest who is not an owner", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);

    await expect(
      game.api.advanceRound({ code: game.code, guestId: "stranger" }),
    ).rejects.toBeInstanceOf(NotAnOwnerError);
  });

  it("plays round one: five results, the round reached, and points that add up", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);

    const league = await game.api.advanceRound({
      code: game.code,
      guestId: asha.guestId,
    });

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

    const playedFirst = await first.api.advanceRound({
      code: first.code,
      guestId: asha.guestId,
    });
    const playedSecond = await second.api.advanceRound({
      code: second.code,
      guestId: asha.guestId,
    });

    expect(playedFirst.fixtures).toEqual(playedSecond.fixtures);
  });

  it("plays a full season of fourteen rounds, then refuses another round", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);

    let league = await game.api.getLeague(game.code);
    for (let round = 1; round <= LEAGUE_ROUNDS; round += 1) {
      league = await game.api.advanceRound({
        code: game.code,
        guestId: asha.guestId,
      });
    }

    expect(league.round).toBe(LEAGUE_ROUNDS);
    expect(league.seasonComplete).toBe(true);
    expect(league.fixtures.every((fixture) => fixture.result !== null)).toBe(
      true,
    );
    expect(league.standings.every((row) => row.played === 14)).toBe(true);
    await expect(
      game.api.advanceRound({ code: game.code, guestId: asha.guestId }),
    ).rejects.toBeInstanceOf(LeagueAdvanceBlockedError);
  });
});
