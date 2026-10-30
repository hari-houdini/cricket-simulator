import * as stylex from "@stylexjs/stylex";

import { focusRing } from "../../shared/const/focus-ring.styles";
import type { FairPlayLine } from "../../shared/types/awards.types";
import { franchiseName } from "../../shared/utils/franchise-label";
import { styles } from "./FairPlayScreen.styles";
import type {
  FairPlayPlayersProps,
  FairPlayScreenProps,
} from "./FairPlayScreen.types";

/**
 * The players in one column of a franchise's entry, each with its average effect to two
 * decimal places, or a line saying there are none.
 *
 * @param props.lines - The players in the column.
 * @returns A list of players, or the word "None".
 */
function FairPlayPlayers({ lines }: FairPlayPlayersProps) {
  if (lines.length === 0) {
    return <span>None</span>;
  }
  return (
    <ul {...stylex.props(styles.list)}>
      {lines.map((line: FairPlayLine) => (
        <li key={line.playerId} {...stylex.props(styles.item)}>
          {line.name}: {line.averageEffect.toFixed(2)}
        </li>
      ))}
    </ul>
  );
}

/**
 * The Fair Play table, ranked best first. Each franchise shows its rating to two decimal
 * places, and the players who pulled the rating down and the players who held it up. The
 * winner is named in text as well as by its rank. Fair Play is a fantasy mechanic, not an IPL
 * award, and the note says so.
 *
 * @param props - The ranked franchises and the winner.
 * @returns The table, or a line saying it begins after the first match.
 */
export function FairPlayScreen({
  franchises,
  winnerFranchiseId,
}: FairPlayScreenProps) {
  return (
    <section aria-label="Fair Play" {...stylex.props(styles.stack)}>
      <p {...stylex.props(styles.note)}>
        Fair Play is a fantasy mechanic, not an IPL award. Each franchise&apos;s
        rating moves with the conduct of its players in matches. Trouble ratings
        are unverified, so the ratings are a working estimate. The table is
        ranked by rating, then league points, then net run rate.
      </p>
      {franchises.length === 0 ? (
        <p {...stylex.props(styles.note)}>
          Fair Play begins after the first match.
        </p>
      ) : (
        <section
          aria-label="Fair Play ranking"
          // A scroll container must be focusable, so keyboard users can reach the columns that sit
          // off-screen on a phone (axe: scrollable-region-focusable).
          // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region, see the comment above
          tabIndex={0}
          {...stylex.props(styles.scroll, focusRing.ring)}
        >
          <table aria-label="Fair Play ranking" {...stylex.props(styles.table)}>
            <thead>
              <tr>
                <th scope="col" {...stylex.props(styles.headerCell)}>
                  Rank
                </th>
                <th scope="col" {...stylex.props(styles.headerCell)}>
                  Franchise
                </th>
                <th scope="col" {...stylex.props(styles.headerCell)}>
                  Rating
                </th>
                <th scope="col" {...stylex.props(styles.headerCell)}>
                  Pulled the rating down
                </th>
                <th scope="col" {...stylex.props(styles.headerCell)}>
                  Held the rating up
                </th>
              </tr>
            </thead>
            <tbody>
              {franchises.map((franchise) => (
                <tr key={franchise.franchiseId}>
                  <td {...stylex.props(styles.cell)}>{franchise.rank}</td>
                  <td {...stylex.props(styles.cell)}>
                    {franchiseName(franchise.franchiseId)}
                    {franchise.franchiseId === winnerFranchiseId ? (
                      <span {...stylex.props(styles.winnerBadge)}>
                        {" "}
                        · Fair Play winner
                      </span>
                    ) : null}
                  </td>
                  <td {...stylex.props(styles.cell, styles.rating)}>
                    {franchise.standing.toFixed(2)}
                  </td>
                  <td {...stylex.props(styles.cell)}>
                    <FairPlayPlayers lines={franchise.lowering} />
                  </td>
                  <td {...stylex.props(styles.cell)}>
                    <FairPlayPlayers lines={franchise.lifting} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </section>
  );
}
