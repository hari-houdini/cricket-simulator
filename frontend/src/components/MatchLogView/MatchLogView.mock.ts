import type { PlayoffResult } from "../../shared/types/playoffs.types";
import { matchLogFor } from "../../shared/utils/match-log";

/** The score of the match CSK won by 15 runs, for the stories. */
const score = {
  homeRuns: 180,
  homeWickets: 4,
  awayRuns: 165,
  awayWickets: 8,
  winnerFranchiseId: "csk",
};

/** A played playoff match that CSK won, with its match log and Man of the Match. */
export const playedFinal: PlayoffResult = {
  homeFranchiseId: "csk",
  awayFranchiseId: "mi",
  winnerFranchiseId: "csk",
  superOver: false,
  score,
  manOfTheMatch: {
    round: 18,
    homeFranchiseId: "csk",
    awayFranchiseId: "mi",
    playerId: "csk-opener-a",
    name: "CSK Opener A",
    franchiseId: "csk",
  },
  matchLog: matchLogFor(score, "csk", "mi"),
};
