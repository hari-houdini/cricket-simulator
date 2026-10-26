import * as stylex from "@stylexjs/stylex";

import { styles } from "./AwardCard.styles";
import type { AwardCardProps, AwardEntry } from "./AwardCard.types";

/**
 * One place on the card: its label and the stats behind it, or a line saying
 * nobody has earned the place yet.
 *
 * @param props.title - The place's name, such as "Winner".
 * @param props.entry - The entry, or null when the place is still open.
 * @param props.empty - What to show when the place is still open.
 * @returns A list item for the place.
 */
function Place({
  title,
  entry,
  empty,
}: {
  readonly title: string;
  readonly entry: AwardEntry | null;
  readonly empty: string;
}) {
  return (
    <li {...stylex.props(styles.place)}>
      <span {...stylex.props(styles.placeTitle)}>{title}</span>
      {entry ? (
        <>
          <span {...stylex.props(styles.placeLabel)}>{entry.label}</span>
          <span {...stylex.props(styles.placeDetail)}>{entry.detail}</span>
        </>
      ) : (
        <span {...stylex.props(styles.placeDetail)}>{empty}</span>
      )}
    </li>
  );
}

/**
 * One individual or owner award: the winner and the runner-up, each with the
 * stats that earned the place. The place is named in text, so the card does not
 * rely on colour or position alone.
 *
 * @param props - The award's name and description, and the two places.
 * @returns A labelled section for the award.
 */
export function AwardCard({
  title,
  description,
  winner,
  runnerUp,
}: AwardCardProps) {
  return (
    <section aria-label={title} {...stylex.props(styles.card)}>
      <h3 {...stylex.props(styles.heading)}>{title}</h3>
      <p {...stylex.props(styles.description)}>{description}</p>
      <ol {...stylex.props(styles.places)}>
        <Place title="Winner" entry={winner} empty="Not decided yet" />
        <Place title="Runner-up" entry={runnerUp} empty="No runner-up yet" />
      </ol>
    </section>
  );
}
