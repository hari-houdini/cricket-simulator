import { describe, expect, it } from "vitest";

import { createSeededRandom } from "./seeded-random";

describe("createSeededRandom", () => {
  it("gives the same sequence for the same seed", () => {
    const first = createSeededRandom("ABC123");
    const second = createSeededRandom("ABC123");

    const firstRun = Array.from({ length: 20 }, () => first());
    const secondRun = Array.from({ length: 20 }, () => second());

    expect(firstRun).toEqual(secondRun);
  });

  it("gives different sequences for different seeds", () => {
    const first = createSeededRandom("ABC123");
    const second = createSeededRandom("XYZ789");

    expect(first()).not.toBe(second());
  });

  it("returns values in the half-open range [0, 1)", () => {
    const random = createSeededRandom("range-check");

    for (let index = 0; index < 1000; index += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("accepts the empty string as a valid seed", () => {
    const random = createSeededRandom("");

    expect(random()).toBeGreaterThanOrEqual(0);
  });
});
