import * as stylex from "@stylexjs/stylex";

import type {
  FairPlayFranchise,
  FairPlayLine,
} from "../../shared/types/awards.types";
import { franchiseName } from "../../shared/utils/franchise-label";
import { styles } from "./FairPlayScreen.styles";
import type { FairPlayScreenProps } from "./FairPlayScreen.types";

/**
 * One column of a franchise's Fair Play screen: its title, and the players in it
 * with their average effect, or a line saying there are none.
 *
 * @param props.title - The column's heading.
 * @param props.lines - The players in the column.
 * @param props.empty - What to show when the column has no players.
 * @returns A labelled list of players and their effects.
 */
function Column({
  title,
  lines,
  empty,
}: {
  readonly title: string;
  readonly lines: readonly FairPlayLine[];
  readonly empty: string;
}) {
  return (
    <div>
      <h4 {...stylex.props(styles.columnTitle)}>{title}</h4>
      {lines.length === 0 ? (
        <p {...stylex.props(styles.item)}>{empty}</p>
      ) : (
        <ul {...stylex.props(styles.list)}>
          {lines.map((line) => (
            <li key={line.playerId} {...stylex.props(styles.item)}>
              {line.name}: {line.averageEffect.toFixed(1)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One franchise's Fair Play card: the players who pulled its rating down, and
 * the players who held it up. The winner is named in text as well as styled.
 *
 * @param props.franchise - The franchise's rating.
 * @param props.isWinner - Whether this franchise holds the Fair Play award.
 * @returns A section for the franchise.
 */
function FranchiseFairPlay({
  franchise,
  isWinner,
}: {
  readonly franchise: FairPlayFranchise;
  readonly isWinner: boolean;
}) {
  const name = franchiseName(franchise.franchiseId);
  return (
    <section aria-label={name} {...stylex.props(styles.franchise)}>
      <h3 {...stylex.props(styles.heading)}>
        {name}
        {isWinner ? (
          <span {...stylex.props(styles.winnerBadge)}> · Fair Play winner</span>
        ) : null}
      </h3>
      <p {...stylex.props(styles.item)}>Table position: {franchise.standing}</p>
      <div {...stylex.props(styles.columns)}>
        <Column
          title="Pulled the rating down"
          lines={franchise.lowering}
          empty="No one pulled the rating down."
        />
        <Column
          title="Held the rating up"
          lines={franchise.lifting}
          empty="No one held the rating up."
        />
      </div>
    </section>
  );
}

/**
 * The Fair Play screen: each franchise's two columns, with the winner named.
 * Fair Play is a fantasy mechanic, not an IPL award, and the note says so.
 *
 * @param props - The franchises' ratings and the winner.
 * @returns The screen, or a line saying it begins after the first match.
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
        are unverified, so the ratings are a working estimate.
      </p>
      {franchises.length === 0 ? (
        <p {...stylex.props(styles.note)}>
          Fair Play begins after the first match.
        </p>
      ) : (
        franchises.map((franchise) => (
          <FranchiseFairPlay
            key={franchise.franchiseId}
            franchise={franchise}
            isWinner={franchise.franchiseId === winnerFranchiseId}
          />
        ))
      )}
    </section>
  );
}
