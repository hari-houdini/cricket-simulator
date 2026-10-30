import { describe, expect, it } from "vitest";

import { BID_TIMER_MS, SQUAD_SIZE } from "../../shared/const/auction.const";
import {
  LEAGUE_MATCHES,
  MATCH_INTERVAL_MS,
} from "../../shared/const/league.const";
import { XI_SIZE } from "../../shared/const/squad.const";
import type { Player } from "../../shared/types/player.types";
import type { Squad } from "../../shared/types/squad.types";
import {
  LeagueAdvanceBlockedError,
  NotAnOwnerError,
  SubstitutionBlockedError,
} from "../../shared/utils/game-api.errors";
import { advanceMatches, ROUND_MATCHES } from "./advance-steps.mock";
import { createMockGameApi } from "./mock-game-api";

const asha = { guestId: "asha", displayName: "Asha" };
const ravi = { guestId: "ravi", displayName: "Ravi" };

/**
 * Returns a value the test expects to exist, and fails the test when it does not.
 *
 * @param value - The value that should be present.
 * @param message - What is missing, for the failure message.
 * @returns The value, typed without `undefined`.
 * @throws {Error} When the value is missing.
 */
function must<T>(value: T | null | undefined, message: string): T {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
  return value;
}

/**
 * Builds a two-owner lobby with a fake clock, claims both franchises, and runs the auction to its
 * end, so both owners hold a squad.
 *
 * @returns The API and the lobby code.
 */
async function setUpTwoOwnerSeason() {
  let clock = 1_000_000;
  const api = createMockGameApi({ seed: "sim", now: () => clock });
  const created = await api.createLobby({ name: "Sim", ...asha });
  await api.joinLobby({ code: created.code, ...ravi });
  await api.claimFranchise({
    code: created.code,
    guestId: asha.guestId,
    franchiseId: "csk",
  });
  await api.claimFranchise({
    code: created.code,
    guestId: ravi.guestId,
    franchiseId: "mi",
  });
  await api.startAuction({ code: created.code, guestId: asha.guestId });
  for (let turn = 0; turn < 1_000; turn += 1) {
    const auction = await api.getAuction(created.code);
    if (auction.status === "complete") {
      break;
    }
    if (auction.lot) {
      // The first bidder alternates, so both owners fill their squads.
      const order = turn % 2 === 0 ? [asha, ravi] : [ravi, asha];
      for (const guest of order) {
        // A keeper is kept for the last place when the owner has none, so the squad always has one.
        const squad =
          auction.purses.find((purse) => purse.guestId === guest.guestId)
            ?.squad ?? [];
        const hasKeeper = squad.some(
          (player) => player.role === "wicket-keeper",
        );
        const keeperNeeded = !hasKeeper && squad.length >= SQUAD_SIZE - 1;
        const isKeeper = auction.lot.player.role === "wicket-keeper";
        if (isKeeper ? hasKeeper : keeperNeeded) {
          continue;
        }
        try {
          await api.placeBid({
            code: created.code,
            guestId: guest.guestId,
            amountLakhs: auction.lot.minimumBidLakhs,
          });
          break;
        } catch {
          // This owner cannot bid on the lot, so the next one tries.
        }
      }
    }
    clock += BID_TIMER_MS + 1;
  }
  await saveLegalXi(api, created.code, asha.guestId);
  await saveLegalXi(api, created.code, ravi.guestId);
  return {
    api,
    code: created.code,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

/**
 * Saves a legal XI for an owner, with a wicket-keeper, enough bowling options, and a bowler as
 * captain and vice-captain. The default XI is not always legal for a squad this test builds.
 *
 * @param api - The game API under test.
 * @param code - The lobby code.
 * @param guestId - The owner saving the XI.
 */
async function saveLegalXi(
  api: ReturnType<typeof createMockGameApi>,
  code: string,
  guestId: string,
) {
  const squad = await api.getSquad({ code, guestId });
  const keeper = must(
    squad.players.find((player) => player.role === "wicket-keeper"),
    "No wicket-keeper.",
  );
  const bowlers = squad.players.filter(
    (player) => player.role === "bowler" || player.role === "all-rounder",
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
  await api.setStartingXi({
    code,
    guestId,
    playerIds: chosen.map((player) => player.id),
    captainId: must(bowlers[0], "No bowler for captain.").id,
    viceCaptainId: must(bowlers[1], "No bowler for vice-captain.").id,
  });
}

/**
 * Finds a swap that keeps the XI legal: an XI player who is neither captain nor vice-captain,
 * and a bench player of the same role.
 *
 * @param squad - The owner's squad, with its XI.
 * @returns The player leaving and the player coming in.
 */
function findSwap(squad: Squad): { out: string; in: string } {
  const xi = must(squad.startingXi, "The squad has no XI.");
  const bench = squad.players.filter(
    (player: Player) => !xi.playerIds.includes(player.id),
  );
  for (const id of xi.playerIds) {
    if (id === xi.captainId || id === xi.viceCaptainId) {
      continue;
    }
    const role = squad.players.find((player) => player.id === id)?.role;
    const incoming = bench.find((player) => player.role === role);
    if (incoming) {
      return { out: id, in: incoming.id };
    }
  }
  throw new Error("No bench player shares a role with the XI.");
}

describe("mock sim control", () => {
  it("refuses a substitution before the first match", async () => {
    const { api, code } = await setUpTwoOwnerSeason();

    await expect(
      api.beginSubstitution({ code, guestId: asha.guestId }),
    ).rejects.toMatchObject({ reason: "not-yet-played" });
  });

  it("pauses the sim for every guest while a substitution is open, and resumes when it is confirmed", async () => {
    const { api, code, advance } = await setUpTwoOwnerSeason();
    await advanceMatches(api, code, 1, advance);
    const squad = await api.getSquad({ code, guestId: asha.guestId });
    const swap = findSwap(squad);

    const paused = await api.beginSubstitution({ code, guestId: asha.guestId });
    expect(paused.simPaused).toBe(true);
    expect(paused.substituting).toEqual([asha.guestId]);
    advance(MATCH_INTERVAL_MS * 4);
    await api.getLobby(code);
    expect(
      (await api.getLeague(code)).fixtures.filter((f) => f.result),
    ).toHaveLength(1);

    await api.substitute({
      code,
      guestId: asha.guestId,
      outPlayerId: swap.out,
      inPlayerId: swap.in,
    });
    const resumed = await api.getLobby(code);
    expect(resumed.simPaused).toBe(false);
    expect(resumed.substitutions).toEqual([
      {
        guestId: asha.guestId,
        outPlayerId: swap.out,
        inPlayerId: swap.in,
        matchesPlayed: 1,
      },
    ]);
    advance(MATCH_INTERVAL_MS);
    await api.getLobby(code);
    expect(
      (await api.getLeague(code)).fixtures.filter((f) => f.result),
    ).toHaveLength(2);
  });

  it("keeps the sim paused while any owner's substitution is still open", async () => {
    const { api, code, advance } = await setUpTwoOwnerSeason();
    await advanceMatches(api, code, 1, advance);
    await api.beginSubstitution({ code, guestId: asha.guestId });
    await api.beginSubstitution({ code, guestId: ravi.guestId });

    const cancelled = await api.cancelSubstitution({
      code,
      guestId: ravi.guestId,
    });
    expect(cancelled.simPaused).toBe(true);
    expect(cancelled.substituting).toEqual([asha.guestId]);

    await api.cancelSubstitution({ code, guestId: asha.guestId });
    expect((await api.getLobby(code)).simPaused).toBe(false);
  });

  it("does not use up a cancelled substitution", async () => {
    const { api, code, advance } = await setUpTwoOwnerSeason();
    await advanceMatches(api, code, 1, advance);
    const swap = findSwap(await api.getSquad({ code, guestId: asha.guestId }));

    await api.beginSubstitution({ code, guestId: asha.guestId });
    await api.cancelSubstitution({ code, guestId: asha.guestId });
    await api.beginSubstitution({ code, guestId: asha.guestId });
    await api.substitute({
      code,
      guestId: asha.guestId,
      outPlayerId: swap.out,
      inPlayerId: swap.in,
    });

    await expect(
      api.beginSubstitution({ code, guestId: asha.guestId }),
    ).rejects.toBeInstanceOf(SubstitutionBlockedError);
  });

  it("refuses a swap that was never opened, so the pause always comes first", async () => {
    const { api, code, advance } = await setUpTwoOwnerSeason();
    await advanceMatches(api, code, 1, advance);
    const swap = findSwap(await api.getSquad({ code, guestId: asha.guestId }));

    await expect(
      api.substitute({
        code,
        guestId: asha.guestId,
        outPlayerId: swap.out,
        inPlayerId: swap.in,
      }),
    ).rejects.toMatchObject({ reason: "not-in-progress" });
  });

  it("lets a strict majority of the owners skip the league, and not a tie", async () => {
    const { api, code, advance } = await setUpTwoOwnerSeason();
    await advanceMatches(api, code, 1, advance);
    expect((await api.getLobby(code)).skipThreshold).toBe(2);

    const oneVote = await api.setSkipVote({
      code,
      guestId: asha.guestId,
      vote: true,
    });
    expect(oneVote.skipVoters).toEqual([asha.guestId]);
    await advanceMatches(api, code, 1, advance);
    expect(
      (await api.getLeague(code)).fixtures.filter((f) => f.result).length,
    ).toBe(2);

    // The vote passes on this call, and the rest of the league is played at once.
    await api.setSkipVote({ code, guestId: ravi.guestId, vote: true });
    const league = await api.getLeague(code);
    expect(league.leagueComplete).toBe(true);
    expect(league.fixtures.filter((f) => f.result).length).toBe(LEAGUE_MATCHES);
    const lobby = await api.getLobby(code);
    expect(lobby.phase).toBe("playoffs");
    expect(lobby.skippedAfterMatches).toBe(2);
  });

  it("withdraws a skip vote", async () => {
    const { api, code } = await setUpTwoOwnerSeason();
    await api.setSkipVote({ code, guestId: asha.guestId, vote: true });
    const withdrawn = await api.setSkipVote({
      code,
      guestId: asha.guestId,
      vote: false,
    });
    expect(withdrawn.skipVoters).toEqual([]);
  });

  it("refuses a skip vote from someone who is not an owner", async () => {
    const { api, code } = await setUpTwoOwnerSeason();
    await expect(
      api.setSkipVote({ code, guestId: "stranger", vote: true }),
    ).rejects.toBeInstanceOf(NotAnOwnerError);
  });

  it("refuses a skip vote once the league is over", async () => {
    const { api, code, advance } = await setUpTwoOwnerSeason();
    await advanceMatches(api, code, LEAGUE_MATCHES, advance);
    await expect(
      api.setSkipVote({ code, guestId: asha.guestId, vote: true }),
    ).rejects.toBeInstanceOf(LeagueAdvanceBlockedError);
  });

  it("plays one playoff match per step once the league is over", async () => {
    const { api, code, advance } = await setUpTwoOwnerSeason();
    await advanceMatches(api, code, LEAGUE_MATCHES, advance);
    const before = await api.getLobby(code);
    expect(before.round).toBe(14);
    await advanceMatches(api, code, 1, advance);
    expect((await api.getLobby(code)).round).toBe(15);
    expect(ROUND_MATCHES).toBe(5);
  });
});
