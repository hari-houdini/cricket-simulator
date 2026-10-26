import { describe, expect, it } from "vitest";

import { formatLakhs } from "./format-money";

describe("formatLakhs", () => {
  it("reads amounts under a crore in lakhs", () => {
    expect(formatLakhs(40)).toBe("₹40L");
  });

  it("reads exactly one crore in crores", () => {
    expect(formatLakhs(100)).toBe("₹1.00cr");
  });

  it("reads larger amounts in crores with two decimals", () => {
    expect(formatLakhs(150)).toBe("₹1.50cr");
    expect(formatLakhs(1234)).toBe("₹12.34cr");
  });
});
