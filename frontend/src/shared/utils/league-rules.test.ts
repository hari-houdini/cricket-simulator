import { describe, expect, it } from "vitest";

import { LAST_ROUND } from "../const/lobby.const";
import { advanceBlock } from "./league-rules";

describe("advanceBlock", () => {
  it("allows the first round once every owner can field an XI", () => {
    expect(
      advanceBlock({ round: 0, everyOwnerCanField: true, paused: false }),
    ).toBeNull();
  });

  it("refuses to play while an owner cannot field a legal XI", () => {
    expect(
      advanceBlock({ round: 0, everyOwnerCanField: false, paused: false }),
    ).toBe("no-legal-starting-xi");
  });

  it("allows a later round without re-checking the XIs", () => {
    expect(
      advanceBlock({
        round: LAST_ROUND - 1,
        everyOwnerCanField: true,
        paused: false,
      }),
    ).toBeNull();
  });

  it("refuses to play once the season is over", () => {
    expect(
      advanceBlock({
        round: LAST_ROUND,
        everyOwnerCanField: true,
        paused: false,
      }),
    ).toBe("season-over");
  });

  it("reports the season first, when both reasons apply", () => {
    expect(
      advanceBlock({
        round: LAST_ROUND,
        everyOwnerCanField: false,
        paused: true,
      }),
    ).toBe("season-over");
  });

  it("refuses to play while a substitution is open", () => {
    expect(
      advanceBlock({ round: 3, everyOwnerCanField: true, paused: true }),
    ).toBe("sim-paused");
  });

  it("reports the pause before a missing XI, since the pause clears first", () => {
    expect(
      advanceBlock({ round: 3, everyOwnerCanField: false, paused: true }),
    ).toBe("sim-paused");
  });
});
