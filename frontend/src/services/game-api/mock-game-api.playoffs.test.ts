import { describe, expect, it } from "vitest";

import { BID_TIMER_MS, SQUAD_SIZE } from "../../shared/const/auction.const";
import { LEAGUE_MATCHES } from "../../shared/const/league.const";
import { XI_SIZE } from "../../shared/const/squad.const";
import type { Player } from "../../shared/types/player.types";
import { LeagueNotStartedError } from "../../shared/utils/game-api.errors";
import {
  advanceMatches,
  PLAYOFF_STEPS,
  SEASON_STEPS,
} from "./advance-steps.mock";
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
 * Plays the league to its end, so the playoffs are next.
 *
 * @param game - A lobby with a saved XI.
 */
async function playLeague(game: Game) {
  await advanceMatches(game.api, game.code, asha.guestId, LEAGUE_MATCHES);
}

describe("mock playoffs", () => {
  it("refuses the bracket before the auction has started", async () => {
    const clock = 0;
    const api = createMockGameApi({ seed: "early", now: () => clock });
    const created = await api.createLobby({ name: "Early", ...asha });

    await expect(api.getPlayoffs(created.code)).rejects.toBeInstanceOf(
      LeagueNotStartedError,
    );
  });

  it("shows an empty bracket while the league is still being played", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);

    const bracket = await game.api.getPlayoffs(game.code);

    expect(bracket.champion).toBeNull();
    expect(bracket.matches.map((match) => match.slot)).toEqual([
      "qualifier-1",
      "eliminator",
      "qualifier-2",
      "final",
    ]);
    expect(
      bracket.matches.every((match) => match.homeFranchiseId === null),
    ).toBe(true);
    expect(bracket.matches.every((match) => match.result === null)).toBe(true);
  });

  it("moves the lobby to the playoffs once the league is over", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);

    await playLeague(game);

    expect((await game.api.getLobby(game.code)).phase).toBe("playoffs");
  });

  it("seeds Qualifier 1 and the Eliminator from the top four of the table", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);
    await playLeague(game);

    const league = await game.api.getLeague(game.code);
    const top = league.standings.slice(0, 4).map((row) => row.franchiseId);
    const bracket = await game.api.getPlayoffs(game.code);
    const byRound = (round: number) =>
      must(
        bracket.matches.find((match) => match.round === round),
        `No round ${round}.`,
      );

    expect([byRound(15).homeFranchiseId, byRound(15).awayFranchiseId]).toEqual([
      top[0],
      top[1],
    ]);
    expect([byRound(16).homeFranchiseId, byRound(16).awayFranchiseId]).toEqual([
      top[2],
      top[3],
    ]);
    expect(byRound(17).homeFranchiseId).toBeNull();
    expect(byRound(18).homeFranchiseId).toBeNull();
  });

  it("plays the four playoff matches in order, with a champion from the Final", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);
    await playLeague(game);

    await advanceMatches(game.api, game.code, asha.guestId, PLAYOFF_STEPS);

    const bracket = await game.api.getPlayoffs(game.code);
    expect(bracket.matches.every((match) => match.result !== null)).toBe(true);
    const final = must(
      bracket.matches.find((match) => match.slot === "final"),
      "No Final.",
    );
    expect(bracket.champion).toBe(final.result?.winnerFranchiseId);
    expect((await game.api.getLobby(game.code)).phase).toBe("complete");
  });

  it("feeds each playoff winner and loser into the slots that follow", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);
    await playLeague(game);
    await advanceMatches(game.api, game.code, asha.guestId, PLAYOFF_STEPS);

    const bracket = await game.api.getPlayoffs(game.code);
    const slot = (name: string) =>
      must(
        bracket.matches.find((match) => match.slot === name),
        `No ${name}.`,
      );
    const qualifier1 = slot("qualifier-1");
    const eliminator = slot("eliminator");
    const qualifier2 = slot("qualifier-2");
    const final = slot("final");
    const winnerOf = (match: typeof qualifier1) =>
      match.result?.winnerFranchiseId;
    const loserOf = (match: typeof qualifier1) =>
      match.homeFranchiseId === winnerOf(match)
        ? match.awayFranchiseId
        : match.homeFranchiseId;

    expect(qualifier2.homeFranchiseId).toBe(loserOf(qualifier1));
    expect(qualifier2.awayFranchiseId).toBe(winnerOf(eliminator));
    expect(final.homeFranchiseId).toBe(winnerOf(qualifier1));
    expect(final.awayFranchiseId).toBe(winnerOf(qualifier2));
  });

  it("gives every playoff match a winner and a closing result moment", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);
    await playLeague(game);
    await advanceMatches(game.api, game.code, asha.guestId, PLAYOFF_STEPS);

    const bracket = await game.api.getPlayoffs(game.code);
    for (const match of bracket.matches) {
      const result = must(match.result, `No result for ${match.slot}.`);
      expect([result.homeFranchiseId, result.awayFranchiseId]).toContain(
        result.winnerFranchiseId,
      );
      expect(result.matchLog.at(-1)).toEqual({
        kind: "result",
        winnerFranchiseId: result.winnerFranchiseId,
      });
    }
  });

  it("refuses to play past the Final", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    await saveLegalXi(game);
    await advanceMatches(game.api, game.code, asha.guestId, SEASON_STEPS);

    await expect(
      game.api.advanceRound({ code: game.code, guestId: asha.guestId }),
    ).rejects.toMatchObject({ reason: "season-over" });
  });

  it("gives the same bracket for the same lobby and seed", async () => {
    const first = await setUpSoloLobby();
    const second = await setUpSoloLobby();
    for (const game of [first, second]) {
      await completeSoloAuction(game);
      await saveLegalXi(game);
      await playLeague(game);
      await advanceMatches(game.api, game.code, asha.guestId, PLAYOFF_STEPS);
    }

    expect(await second.api.getPlayoffs(second.code)).toEqual(
      await first.api.getPlayoffs(first.code),
    );
  });
});
