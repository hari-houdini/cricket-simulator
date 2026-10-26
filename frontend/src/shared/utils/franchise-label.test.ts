import { describe, expect, it } from "vitest";

import { franchiseAbbreviation, franchiseName } from "./franchise-label";

describe("franchiseName", () => {
  it("gives the full name of a seeded franchise", () => {
    expect(franchiseName("csk")).toBe("Chennai Super Kings");
  });

  it("falls back to the id for an unknown franchise", () => {
    expect(franchiseName("ghost")).toBe("ghost");
  });
});

describe("franchiseAbbreviation", () => {
  it("gives the short name of a seeded franchise", () => {
    expect(franchiseAbbreviation("mi")).toBe("MI");
  });

  it("upper-cases the id of an unknown franchise", () => {
    expect(franchiseAbbreviation("ghost")).toBe("GHOST");
  });
});
