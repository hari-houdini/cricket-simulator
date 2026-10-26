import type { FixtureRow, Reveal } from "../types/fixture-row.types";
import type { Fixture } from "../types/league.types";

/**
 * Turns the league's fixtures into schedule rows, paced by the reveal. Matches
 * in the revealed round show their result only once their turn has come: the
 * match at the reveal's `shown` position is in play, and those after it are yet
 * to play. Every other fixture shows its result, or that it is yet to play.
 *
 * @param fixtures - The league fixtures in round order.
 * @param reveal - The round being revealed, or null for no reveal.
 * @returns One row per fixture, in the same order.
 */
export function fixtureRows(
  fixtures: readonly Fixture[],
  reveal: Reveal | null,
): FixtureRow[] {
  let revealPosition = 0;
  return fixtures.map((fixture) => {
    const base = {
      key: `${fixture.round}:${fixture.homeFranchiseId}:${fixture.awayFranchiseId}`,
      round: fixture.round,
      homeFranchiseId: fixture.homeFranchiseId,
      awayFranchiseId: fixture.awayFranchiseId,
    };
    if (reveal === null || fixture.round !== reveal.round) {
      return fixture.result === null
        ? { ...base, status: "to-play", result: null }
        : { ...base, status: "played", result: fixture.result };
    }

    const position = revealPosition;
    revealPosition += 1;
    if (position < reveal.shown) {
      return { ...base, status: "played", result: fixture.result };
    }
    if (position === reveal.shown) {
      return { ...base, status: "in-play", result: null };
    }
    return { ...base, status: "to-play", result: null };
  });
}
