import { MAX_WICKETS } from "../const/match.const";
import type { MatchScore } from "../types/league.types";

/**
 * Says who won a league match and by how much, in words for the results list.
 * The home side bats first, so a home win is by runs, and an away win is a
 * chase, won by the wickets the chasing side still had in hand.
 *
 * @param homeAbbreviation - The home franchise's short name, such as `"CSK"`.
 * @param awayAbbreviation - The away franchise's short name.
 * @param score - The match score.
 * @returns A sentence such as `"CSK won by 12 runs"`, or `"Match tied"`.
 */
export function summarizeMatch(
  homeAbbreviation: string,
  awayAbbreviation: string,
  score: MatchScore,
): string {
  if (score.winnerFranchiseId === null) {
    return "Match tied";
  }
  if (score.homeRuns > score.awayRuns) {
    return `${homeAbbreviation} won by ${score.homeRuns - score.awayRuns} runs`;
  }
  const wicketsInHand = MAX_WICKETS - score.awayWickets;
  if (wicketsInHand === 0) {
    return `${awayAbbreviation} won with no wickets to spare`;
  }
  return `${awayAbbreviation} won by ${wicketsInHand} wickets`;
}
