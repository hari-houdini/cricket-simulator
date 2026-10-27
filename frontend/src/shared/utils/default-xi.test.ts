import { describe, expect, it } from "vitest";

import { XI_SIZE } from "../const/squad.const";
import type { Player } from "../types/player.types";
import { defaultStartingXi } from "./default-xi";
import { startingXiBlock } from "./squad-rules";

/**
 * Builds a player for the picker. The overall rating orders the squad, so the
 * batting rating carries it.
 *
 * @param id - The player id.
 * @param role - The player's role.
 * @param batting - The batting rating, which sets the player's strength.
 * @returns A player with the other fields fixed.
 */
function player(id: string, role: Player["role"], batting = 50): Player {
  return {
    id,
    name: id,
    franchiseId: "csk",
    role,
    category: "capped",
    retired: false,
    batting,
    bowling: 50,
    fielding: 50,
    basePrice: 2000,
  };
}

/** A squad that can field a legal XI: one keeper, four bowlers, and batters. */
const legalSquad: Player[] = [
  player("wk", "wicket-keeper"),
  player("b1", "bowler"),
  player("b2", "bowler"),
  player("b3", "bowler"),
  player("b4", "bowler"),
  player("bat1", "batter"),
  player("bat2", "batter"),
  player("bat3", "batter"),
  player("bat4", "batter"),
  player("bat5", "batter"),
  player("bat6", "batter"),
];

describe("defaultStartingXi", () => {
  it("returns an XI that the squad rules accept", () => {
    const xi = defaultStartingXi(legalSquad);

    expect(xi).not.toBeNull();
    expect(xi && startingXiBlock(legalSquad, xi)).toBeNull();
  });

  it("names eleven players, with the first two as captain and vice-captain", () => {
    const xi = defaultStartingXi(legalSquad);

    expect(xi?.playerIds).toHaveLength(XI_SIZE);
    expect(xi?.captainId).toBe(xi?.playerIds[0]);
    expect(xi?.viceCaptainId).toBe(xi?.playerIds[1]);
  });

  it("uses the strongest players when the squad allows it", () => {
    const squad = [
      ...legalSquad,
      player("star", "batter", 99),
      player("weak", "batter", 10),
    ];
    const xi = defaultStartingXi(squad);

    expect(xi?.playerIds).toContain("star");
    expect(xi?.playerIds).not.toContain("weak");
  });

  it("returns null when the squad has no wicket-keeper", () => {
    const squad = legalSquad.filter((item) => item.role !== "wicket-keeper");

    expect(defaultStartingXi(squad)).toBeNull();
  });

  it("returns null when the squad has fewer than four bowling options", () => {
    const squad = legalSquad.map((item) =>
      item.id === "b1" || item.id === "b2" ? player(item.id, "batter") : item,
    );

    expect(defaultStartingXi(squad)).toBeNull();
  });

  it("returns null when there are not enough non-keepers to fill the XI", () => {
    const squad = legalSquad.slice(0, 9);

    expect(defaultStartingXi(squad)).toBeNull();
  });
});
