import type { MatchScore } from "../types/league.types";
import type { KeyMoment } from "../types/playoffs.types";
import { franchiseAbbreviation } from "./franchise-label";

/**
 * The key moments of a playoff match, in the order they happen: the first
 * innings' wickets, then the second innings', then the result. Only wickets and
 * the result are produced, since the engine does not yet play ball by ball.
 *
 * @param score - The match score, with its winner set.
 * @param homeFranchiseId - The home franchise, which bats first.
 * @param awayFranchiseId - The away franchise, which bats second.
 * @returns The moments, in order. The result is always last.
 */
export function keyMomentsFor(
  score: MatchScore,
  homeFranchiseId: string,
  awayFranchiseId: string,
): KeyMoment[] {
  const moments: KeyMoment[] = [];
  for (
    let wicketNumber = 1;
    wicketNumber <= score.homeWickets;
    wicketNumber += 1
  ) {
    moments.push({
      kind: "wicket",
      innings: 1,
      wicketNumber,
      battingFranchiseId: homeFranchiseId,
    });
  }
  for (
    let wicketNumber = 1;
    wicketNumber <= score.awayWickets;
    wicketNumber += 1
  ) {
    moments.push({
      kind: "wicket",
      innings: 2,
      wicketNumber,
      battingFranchiseId: awayFranchiseId,
    });
  }
  moments.push({ kind: "result", winnerFranchiseId: score.winnerFranchiseId });
  return moments;
}

/**
 * Says what happened in one key moment, in words for the key-moment view.
 *
 * @param moment - The key moment.
 * @returns A sentence such as `"Wicket 3 falls for CSK in the first innings."`.
 */
export function describeKeyMoment(moment: KeyMoment): string {
  if (moment.kind === "result") {
    return moment.winnerFranchiseId === null
      ? "The match is tied."
      : `${franchiseAbbreviation(moment.winnerFranchiseId)} win the match.`;
  }
  const innings = moment.innings === 1 ? "first innings" : "second innings";
  return `Wicket ${moment.wicketNumber} falls for ${franchiseAbbreviation(moment.battingFranchiseId)} in the ${innings}.`;
}
