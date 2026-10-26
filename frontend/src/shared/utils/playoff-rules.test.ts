import { describe, expect, it } from "vitest";

import type { PlayoffSlot, PlayoffSource } from "../types/schedule.types";
import {
  decisionFor,
  resolvePlayoffSource,
  type SlotDecision,
  superOverWinner,
} from "./playoff-rules";

const decided: ReadonlyMap<PlayoffSlot, SlotDecision> = new Map<
  PlayoffSlot,
  SlotDecision
>([["qualifier-1", { winnerFranchiseId: "csk", loserFranchiseId: "mi" }]]);

const table = ["csk", "mi", "gt", "rcb"];

describe("decisionFor", () => {
  it("names the home side as winner, with the away side as loser", () => {
    expect(decisionFor("csk", "mi", "csk")).toEqual({
      winnerFranchiseId: "csk",
      loserFranchiseId: "mi",
    });
  });

  it("names the away side as winner, with the home side as loser", () => {
    expect(decisionFor("csk", "mi", "mi")).toEqual({
      winnerFranchiseId: "mi",
      loserFranchiseId: "csk",
    });
  });
});

describe("superOverWinner", () => {
  it("gives the home side the super over when the draw is in its half", () => {
    expect(superOverWinner("csk", "mi", 0.2)).toBe("csk");
  });

  it("gives the away side the super over when the draw is in the other half", () => {
    expect(superOverWinner("csk", "mi", 0.8)).toBe("mi");
  });
});

describe("resolvePlayoffSource", () => {
  it("takes a league place from the table", () => {
    const source: PlayoffSource = { kind: "standing", position: 2 };

    expect(resolvePlayoffSource(source, table, decided)).toBe("mi");
  });

  it("gives null for a league place the table does not reach", () => {
    const source: PlayoffSource = { kind: "standing", position: 2 };

    expect(resolvePlayoffSource(source, [], decided)).toBeNull();
  });

  it("takes the winner of a decided slot", () => {
    const source: PlayoffSource = { kind: "winner", slot: "qualifier-1" };

    expect(resolvePlayoffSource(source, table, decided)).toBe("csk");
  });

  it("takes the loser of a decided slot", () => {
    const source: PlayoffSource = { kind: "loser", slot: "qualifier-1" };

    expect(resolvePlayoffSource(source, table, decided)).toBe("mi");
  });

  it("gives null for a slot that has not been decided", () => {
    const source: PlayoffSource = { kind: "winner", slot: "eliminator" };

    expect(resolvePlayoffSource(source, table, decided)).toBeNull();
  });
});
