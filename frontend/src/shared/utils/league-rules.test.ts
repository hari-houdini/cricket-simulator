import { describe, expect, it } from "vitest";

import { LAST_ROUND } from "../const/lobby.const";
import { advanceBlock } from "./league-rules";

describe("advanceBlock", () => {
  it("allows the first round once every owner has an XI", () => {
    expect(
      advanceBlock({ round: 0, everyOwnerHasStartingXi: true }),
    ).toBeNull();
  });

  it("refuses to play while an owner has no XI", () => {
    expect(advanceBlock({ round: 0, everyOwnerHasStartingXi: false })).toBe(
      "missing-starting-xi",
    );
  });

  it("allows a later round without re-checking the XIs", () => {
    expect(
      advanceBlock({ round: LAST_ROUND - 1, everyOwnerHasStartingXi: true }),
    ).toBeNull();
  });

  it("refuses to play once the season is over", () => {
    expect(
      advanceBlock({ round: LAST_ROUND, everyOwnerHasStartingXi: true }),
    ).toBe("season-over");
  });

  it("reports the season first, when both reasons apply", () => {
    expect(
      advanceBlock({ round: LAST_ROUND, everyOwnerHasStartingXi: false }),
    ).toBe("season-over");
  });
});
