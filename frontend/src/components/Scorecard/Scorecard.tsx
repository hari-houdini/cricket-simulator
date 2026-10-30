"use client";

import * as stylex from "@stylexjs/stylex";

import { styles } from "./Scorecard.styles";
import type { ScorecardProps } from "./Scorecard.types";

/**
 * A minimal scorecard for one match: the two teams' totals side by side, the winner, and the
 * Man of the Match. Shared by the league stack and the playoff match log, so both read the same.
 *
 * @param props - The two teams, the winner line, and the Man of the Match.
 * @returns The scorecard.
 */
export function Scorecard({
  id,
  label,
  home,
  away,
  winnerLine,
  manOfTheMatch,
}: ScorecardProps) {
  return (
    <div id={id} {...stylex.props(styles.scorecard)}>
      <table aria-label={label} {...stylex.props(styles.table)}>
        <thead>
          <tr>
            <th scope="col" {...stylex.props(styles.cell)}>
              {home.name}
            </th>
            <th scope="col" {...stylex.props(styles.cell)}>
              {away.name}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td {...stylex.props(styles.cell, styles.figure)}>
              {home.runs}/{home.wickets}
            </td>
            <td {...stylex.props(styles.cell, styles.figure)}>
              {away.runs}/{away.wickets}
            </td>
          </tr>
        </tbody>
      </table>
      <p {...stylex.props(styles.note)}>{winnerLine}</p>
      {manOfTheMatch ? (
        <p {...stylex.props(styles.note)}>
          Man of the Match: {manOfTheMatch.name}, {manOfTheMatch.franchise}
        </p>
      ) : null}
    </div>
  );
}
