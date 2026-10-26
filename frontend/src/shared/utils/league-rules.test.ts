import { describe, expect, it } from "vitest";

import { LEAGUE_ROUNDS } from "../const/league.const";
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
      advanceBlock({ round: LEAGUE_ROUNDS - 1, everyOwnerHasStartingXi: true }),
    ).toBeNull();
  });

  it("refuses to play once the league rounds are over", () => {
    expect(
      advanceBlock({ round: LEAGUE_ROUNDS, everyOwnerHasStartingXi: true }),
    ).toBe("season-over");
  });

  it("reports the season first, when both reasons apply", () => {
    expect(
      advanceBlock({ round: LEAGUE_ROUNDS, everyOwnerHasStartingXi: false }),
    ).toBe("season-over");
  });
});
