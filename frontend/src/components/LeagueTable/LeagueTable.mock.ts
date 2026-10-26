import type { Standing } from "../../shared/types/league.types";

/**
 * A mid-season table for the stories. It is in table order: points, then net run rate.
 */
export const midSeasonStandings: readonly Standing[] = [
  {
    franchiseId: "csk",
    played: 2,
    won: 2,
    tied: 0,
    lost: 0,
    points: 4,
    runsFor: 340,
    runsAgainst: 290,
    netRunRate: 0.31,
  },
  {
    franchiseId: "gt",
    played: 2,
    won: 1,
    tied: 0,
    lost: 1,
    points: 2,
    runsFor: 330,
    runsAgainst: 320,
    netRunRate: 0.12,
  },
  {
    franchiseId: "mi",
    played: 2,
    won: 1,
    tied: 0,
    lost: 1,
    points: 2,
    runsFor: 310,
    runsAgainst: 305,
    netRunRate: 0.05,
  },
  {
    franchiseId: "rcb",
    played: 2,
    won: 0,
    tied: 0,
    lost: 2,
    points: 0,
    runsFor: 280,
    runsAgainst: 340,
    netRunRate: -0.4,
  },
];
