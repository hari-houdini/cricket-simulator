import { describe, expect, it } from "vitest";

import { nextFocusIndex } from "./focus-cycle";

describe("nextFocusIndex", () => {
  it("returns -1 when there is nothing to focus", () => {
    expect(nextFocusIndex(-1, 0, "forward")).toBe(-1);
    expect(nextFocusIndex(0, 0, "backward")).toBe(-1);
  });

  it("moves forward one step", () => {
    expect(nextFocusIndex(1, 4, "forward")).toBe(2);
  });

  it("wraps from the last item to the first going forward", () => {
    expect(nextFocusIndex(3, 4, "forward")).toBe(0);
  });

  it("moves backward one step", () => {
    expect(nextFocusIndex(2, 4, "backward")).toBe(1);
  });

  it("wraps from the first item to the last going backward", () => {
    expect(nextFocusIndex(0, 4, "backward")).toBe(3);
  });

  it("starts at the first item going forward when focus is outside the list", () => {
    expect(nextFocusIndex(-1, 4, "forward")).toBe(0);
  });

  it("starts at the last item going backward when focus is outside the list", () => {
    expect(nextFocusIndex(-1, 4, "backward")).toBe(3);
  });
});
