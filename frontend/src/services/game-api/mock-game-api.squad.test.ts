import { describe, expect, it } from "vitest";

import { BID_TIMER_MS, SQUAD_SIZE } from "../../shared/const/auction.const";
import { XI_SIZE } from "../../shared/const/squad.const";
import type { Player } from "../../shared/types/player.types";
import {
  AuctionNotStartedError,
  NotAnOwnerError,
  SquadNotReadyError,
  XiBlockedError,
} from "../../shared/utils/game-api.errors";
import { startingXiBlock } from "../../shared/utils/squad-rules";
import { createMockGameApi } from "./mock-game-api";

const asha = { guestId: "asha", displayName: "Asha" };

/**
 * Returns a value the test expects to exist, and fails the test with a clear
 * message when it does not.
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
 * @returns The API, the clock, the lobby code and the owner's guest ID.
 */
async function setUpSoloLobby() {
  let clock = 1_000_000;
  const api = createMockGameApi({ seed: "squad", now: () => clock });
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

/**
 * Drives the one-owner auction to the end: the owner bids the minimum on each
 * lot, and the lot's timer runs out, until every squad place is filled.
 *
 * @param game - The lobby from {@link setUpSoloLobby}.
 */
async function completeSoloAuction(
  game: Awaited<ReturnType<typeof setUpSoloLobby>>,
) {
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
  // One read settles the final lot and marks the auction complete.
  await game.api.getAuction(game.code);
}

/**
 * Picks a legal starting XI from a squad: one wicket-keeper, four bowling
 * options, and the rest in squad order. The first two bowling options are the
 * captain and vice-captain, so the keeper can be swapped out without also
 * removing the captain. Fails the test when the squad cannot make one.
 *
 * @param players - The owner's squad.
 * @returns The ids and the captain and vice-captain.
 */
function legalXi(players: readonly Player[]) {
  const keeper = players.find((player) => player.role === "wicket-keeper");
  const bowlers = players.filter(
    (player) =>
      player.role === "bowler" ||
      (player.role === "all-rounder" && player.bowling >= 50),
  );
  if (!keeper || bowlers.length < 4) {
    throw new Error("The squad cannot make a legal starting XI.");
  }
  const chosen = [keeper, ...bowlers.slice(0, 4)];
  for (const player of players) {
    if (chosen.length === XI_SIZE) {
      break;
    }
    if (!chosen.includes(player)) {
      chosen.push(player);
    }
  }
  return {
    playerIds: chosen.map((player) => player.id),
    captainId: must(bowlers[0], "No first bowling option.").id,
    viceCaptainId: must(bowlers[1], "No second bowling option.").id,
  };
}

describe("mock squad", () => {
  it("refuses a squad before the auction has started", async () => {
    const game = await setUpSoloLobby();
    const created = await game.api.createLobby({
      name: "Other",
      guestId: "ravi",
      displayName: "Ravi",
    });

    await expect(
      game.api.getSquad({ code: created.code, guestId: "ravi" }),
    ).rejects.toBeInstanceOf(AuctionNotStartedError);
  });

  it("refuses a squad while the auction is still running", async () => {
    const game = await setUpSoloLobby();

    await expect(
      game.api.getSquad({ code: game.code, guestId: asha.guestId }),
    ).rejects.toBeInstanceOf(SquadNotReadyError);
  });

  it("gives the squad once the auction is complete, with no XI yet and nothing locked", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);

    const squad = await game.api.getSquad({
      code: game.code,
      guestId: asha.guestId,
    });

    expect(squad.players).toHaveLength(SQUAD_SIZE);
    expect(squad.startingXi).toBeNull();
    expect(squad.locked).toBe(false);
    expect(squad.substitutionUsed).toBe(false);
  });

  it("refuses a squad to a guest who holds none in the lobby", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);

    await expect(
      game.api.getSquad({ code: game.code, guestId: "stranger" }),
    ).rejects.toBeInstanceOf(NotAnOwnerError);
  });

  it("saves a legal starting XI and returns it on the next read", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    const squad = await game.api.getSquad({
      code: game.code,
      guestId: asha.guestId,
    });
    const selection = legalXi(squad.players);

    const saved = await game.api.setStartingXi({
      code: game.code,
      guestId: asha.guestId,
      ...selection,
    });
    const reread = await game.api.getSquad({
      code: game.code,
      guestId: asha.guestId,
    });

    expect(saved.startingXi).toEqual(selection);
    expect(reread.startingXi).toEqual(selection);
    expect(startingXiBlock(squad.players, selection)).toBeNull();
  });

  it("refuses an XI that breaks a rule, and says which rule", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    const squad = await game.api.getSquad({
      code: game.code,
      guestId: asha.guestId,
    });
    const selection = legalXi(squad.players);
    const keeperId = must(
      squad.players.find((player) => player.role === "wicket-keeper"),
      "No wicket-keeper in the squad.",
    ).id;
    const bench = must(
      squad.players.find(
        (player) =>
          player.role !== "wicket-keeper" &&
          !selection.playerIds.includes(player.id),
      ),
      "No bench player outside the XI.",
    );
    const withoutKeeper = {
      ...selection,
      playerIds: selection.playerIds.map((id) =>
        id === keeperId ? bench.id : id,
      ),
    };

    await expect(
      game.api.setStartingXi({
        code: game.code,
        guestId: asha.guestId,
        ...withoutKeeper,
      }),
    ).rejects.toMatchObject({ reason: "no-wicket-keeper" });
    await expect(
      game.api.setStartingXi({
        code: game.code,
        guestId: asha.guestId,
        playerIds: [],
        captainId: selection.captainId,
        viceCaptainId: selection.viceCaptainId,
      }),
    ).rejects.toBeInstanceOf(XiBlockedError);
  });

  it("refuses the free substitution before the first match", async () => {
    const game = await setUpSoloLobby();
    await completeSoloAuction(game);
    const squad = await game.api.getSquad({
      code: game.code,
      guestId: asha.guestId,
    });
    const selection = legalXi(squad.players);
    await game.api.setStartingXi({
      code: game.code,
      guestId: asha.guestId,
      ...selection,
    });
    const bench = must(
      squad.players.find((player) => !selection.playerIds.includes(player.id)),
      "No bench player outside the XI.",
    );

    await expect(
      game.api.beginSubstitution({ code: game.code, guestId: asha.guestId }),
    ).rejects.toMatchObject({ reason: "not-yet-played" });
    await expect(
      game.api.substitute({
        code: game.code,
        guestId: asha.guestId,
        outPlayerId: must(
          selection.playerIds[5],
          "The XI has no sixth player.",
        ),
        inPlayerId: bench.id,
      }),
    ).rejects.toMatchObject({ reason: "not-in-progress" });
  });
});
