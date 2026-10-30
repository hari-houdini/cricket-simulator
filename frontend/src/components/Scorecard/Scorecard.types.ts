/** One team's line in a scorecard. */
export type ScorecardSide = {
  /** The team's name, shown as the column heading. */
  readonly name: string;
  /** The team's total runs. */
  readonly runs: number;
  /** The team's wickets lost. */
  readonly wickets: number;
};

/** Props for {@link Scorecard}. */
export type ScorecardProps = {
  /** The id of the element, so the accordion button can control it. */
  readonly id: string;
  /** Names the table for screen readers, such as "CSK vs MI scorecard". */
  readonly label: string;
  /** The home team, shown in the first column. */
  readonly home: ScorecardSide;
  /** The away team, shown in the second column. */
  readonly away: ScorecardSide;
  /** The winner in words, such as "Chennai Super Kings won", or "Tied". */
  readonly winnerLine: string;
  /** The Man of the Match's name and team, or null when there is none. */
  readonly manOfTheMatch: {
    readonly name: string;
    readonly franchise: string;
  } | null;
};
