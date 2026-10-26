import type { FixtureRow } from "../../shared/types/fixture-row.types";

/**
 * A round in progress: one finished match, one being played, and one still to
 * come, so the stories show all three states.
 */
export const roundInProgress: readonly FixtureRow[] = [
  {
    key: "1:csk:mi",
    round: 1,
    homeFranchiseId: "csk",
    awayFranchiseId: "mi",
    status: "played",
    result: {
      homeRuns: 176,
      homeWickets: 5,
      awayRuns: 158,
      awayWickets: 8,
      winnerFranchiseId: "csk",
    },
  },
  {
    key: "1:gt:rcb",
    round: 1,
    homeFranchiseId: "gt",
    awayFranchiseId: "rcb",
    status: "in-play",
    result: null,
  },
  {
    key: "1:kkr:dc",
    round: 1,
    homeFranchiseId: "kkr",
    awayFranchiseId: "dc",
    status: "to-play",
    result: null,
  },
];
