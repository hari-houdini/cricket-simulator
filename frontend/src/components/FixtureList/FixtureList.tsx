"use client";

import * as stylex from "@stylexjs/stylex";

import type { FixtureRow } from "../../shared/types/fixture-row.types";
import type { MatchScore } from "../../shared/types/league.types";
import { franchiseAbbreviation } from "../../shared/utils/franchise-label";
import { summarizeMatch } from "../../shared/utils/match-summary";
import { styles } from "./FixtureList.styles";
import type { FixtureListProps } from "./FixtureList.types";

/**
 * One side's score as the schedule shows it, such as `"CSK 170/5"`.
 *
 * @param abbreviation - The side's short name.
 * @param runs - Runs scored.
 * @param wickets - Wickets lost.
 * @returns The score text.
 */
function sideScore(
  abbreviation: string,
  runs: number,
  wickets: number,
): string {
  return `${abbreviation} ${runs}/${wickets}`;
}

/**
 * The schedule, grouped by round. A played match shows both scores and who won;
 * a match in play says so; a match still to come says that.
 *
 * @param props.rows - The schedule rows, in round order.
 * @returns One section per round, each a list of matches.
 */
export function FixtureList({ rows }: FixtureListProps) {
  const rounds = [...new Set(rows.map((row) => row.round))];

  return (
    <div {...stylex.props(styles.stack)}>
      {rounds.map((round) => (
        <section key={round} aria-labelledby={`round-${round}`}>
          <h4 id={`round-${round}`} {...stylex.props(styles.heading)}>
            Round {round}
          </h4>
          <ul aria-live="polite" {...stylex.props(styles.list)}>
            {rows
              .filter((row) => row.round === round)
              .map((row) => (
                <li key={row.key} {...stylex.props(styles.row)}>
                  <FixtureLine row={row} />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * One match line. Kept separate so the status and the score read in one place.
 *
 * @param props.row - The schedule row to show.
 * @returns The match's teams and its status or score.
 */
function FixtureLine({ row }: { readonly row: FixtureRow }) {
  const home = franchiseAbbreviation(row.homeFranchiseId);
  const away = franchiseAbbreviation(row.awayFranchiseId);
  return (
    <>
      <span {...stylex.props(styles.fixture)}>
        {home} v {away}
      </span>
      {row.status === "in-play" ? (
        <span {...stylex.props(styles.muted)}>In play…</span>
      ) : null}
      {row.status === "to-play" ? (
        <span {...stylex.props(styles.muted)}>Yet to play</span>
      ) : null}
      {row.status === "played" && row.result ? (
        <PlayedResult home={home} away={away} result={row.result} />
      ) : null}
    </>
  );
}

/**
 * The score and the winner of a played match.
 *
 * @param props.home - The home side's short name.
 * @param props.away - The away side's short name.
 * @param props.result - The match score.
 * @returns Both scores, and a line saying who won.
 */
function PlayedResult({
  home,
  away,
  result,
}: {
  readonly home: string;
  readonly away: string;
  readonly result: MatchScore;
}) {
  return (
    <>
      <span {...stylex.props(styles.score)}>
        {sideScore(home, result.homeRuns, result.homeWickets)} ·{" "}
        {sideScore(away, result.awayRuns, result.awayWickets)}
      </span>
      <span {...stylex.props(styles.summary)}>
        {summarizeMatch(home, away, result)}
      </span>
    </>
  );
}
