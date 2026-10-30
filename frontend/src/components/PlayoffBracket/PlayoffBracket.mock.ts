import type { MatchScore } from "../../shared/types/league.types";
import type { PlayoffSlotView } from "../../shared/types/playoffs.types";
import { matchLogFor } from "../../shared/utils/match-log";

/**
 * A score with its match log, for a stories' playoff result.
 *
 * @param home - The home franchise.
 * @param away - The away franchise.
 * @param score - The score, with its winner set.
 * @param superOver - Whether the match was settled by a super over.
 * @returns The result as the bracket stores it.
 */
function resultFor(
  home: string,
  away: string,
  score: MatchScore,
  superOver = false,
) {
  return {
    homeFranchiseId: home,
    awayFranchiseId: away,
    winnerFranchiseId: score.winnerFranchiseId ?? home,
    superOver,
    score,
    manOfTheMatch: null,
    matchLog: matchLogFor(score, home, away),
  };
}

/** The bracket before the league is over: no teams are set beyond the table. */
export const pendingBracket: readonly PlayoffSlotView[] = [
  {
    slot: "qualifier-1",
    round: 15,
    homeFranchiseId: "csk",
    awayFranchiseId: "gt",
    result: null,
  },
  {
    slot: "eliminator",
    round: 16,
    homeFranchiseId: "mi",
    awayFranchiseId: "rcb",
    result: null,
  },
  {
    slot: "qualifier-2",
    round: 17,
    homeFranchiseId: null,
    awayFranchiseId: null,
    result: null,
  },
  {
    slot: "final",
    round: 18,
    homeFranchiseId: null,
    awayFranchiseId: null,
    result: null,
  },
];

/** The bracket after the Final: every match played, with a champion. */
export const decidedBracket: readonly PlayoffSlotView[] = [
  {
    slot: "qualifier-1",
    round: 15,
    homeFranchiseId: "csk",
    awayFranchiseId: "gt",
    result: resultFor("csk", "gt", {
      homeRuns: 180,
      homeWickets: 6,
      awayRuns: 170,
      awayWickets: 9,
      winnerFranchiseId: "csk",
    }),
  },
  {
    slot: "eliminator",
    round: 16,
    homeFranchiseId: "mi",
    awayFranchiseId: "rcb",
    result: resultFor("mi", "rcb", {
      homeRuns: 160,
      homeWickets: 8,
      awayRuns: 150,
      awayWickets: 10,
      winnerFranchiseId: "mi",
    }),
  },
  {
    slot: "qualifier-2",
    round: 17,
    homeFranchiseId: "gt",
    awayFranchiseId: "mi",
    result: resultFor("gt", "mi", {
      homeRuns: 165,
      homeWickets: 7,
      awayRuns: 166,
      awayWickets: 6,
      winnerFranchiseId: "mi",
    }),
  },
  {
    slot: "final",
    round: 18,
    homeFranchiseId: "csk",
    awayFranchiseId: "mi",
    result: resultFor("csk", "mi", {
      homeRuns: 190,
      homeWickets: 5,
      awayRuns: 175,
      awayWickets: 9,
      winnerFranchiseId: "csk",
    }),
  },
];
