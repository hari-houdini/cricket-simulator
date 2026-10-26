import { describe, expect, it } from "vitest";

import { playerSchema } from "./player.schema";

const kohli = {
  id: "virat-kohli",
  name: "Virat Kohli",
  franchiseId: "rcb",
  role: "batter",
  category: "marquee",
  retired: false,
  batting: 90,
  bowling: 20,
  fielding: 70,
  basePrice: 200,
};

describe("playerSchema", () => {
  it("accepts a current player with the base price for its category", () => {
    expect(playerSchema.parse(kohli)).toEqual(kohli);
  });

  it("accepts a player with no trouble rating, which means the base value applies", () => {
    expect(playerSchema.parse(kohli).troubleRating).toBeUndefined();
  });

  it("accepts a retired player with the franchise they last represented", () => {
    expect(playerSchema.parse({ ...kohli, retired: true }).franchiseId).toBe(
      "rcb",
    );
  });

  it("rejects a current player with no franchise", () => {
    expect(() => playerSchema.parse({ ...kohli, franchiseId: null })).toThrow();
  });

  it("rejects a base price that does not match the category", () => {
    expect(() => playerSchema.parse({ ...kohli, basePrice: 100 })).toThrow();
  });

  it("rejects a rating above 100", () => {
    expect(() => playerSchema.parse({ ...kohli, batting: 101 })).toThrow();
  });

  it("rejects a fractional rating, since ratings are integers", () => {
    expect(() => playerSchema.parse({ ...kohli, bowling: 20.5 })).toThrow();
  });

  it("rejects a trouble rating above 10", () => {
    expect(() => playerSchema.parse({ ...kohli, troubleRating: 11 })).toThrow();
  });

  it("accepts a trouble rating from 0 to 10", () => {
    expect(
      playerSchema.parse({ ...kohli, troubleRating: 0 }).troubleRating,
    ).toBe(0);
    expect(
      playerSchema.parse({ ...kohli, troubleRating: 10 }).troubleRating,
    ).toBe(10);
  });

  it("rejects an id that is not a lowercase slug", () => {
    expect(() => playerSchema.parse({ ...kohli, id: "Virat Kohli" })).toThrow();
  });

  it("rejects a role outside the four roles in the glossary", () => {
    expect(() => playerSchema.parse({ ...kohli, role: "keeper" })).toThrow();
  });
});
