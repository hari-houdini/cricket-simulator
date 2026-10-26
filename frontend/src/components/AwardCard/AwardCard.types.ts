/** One place on an award screen, as the card shows it. */
export type AwardEntry = {
  /** The winner's name, as the card shows it first. */
  readonly label: string;
  /** The stats or points that earned the place, with the franchise. */
  readonly detail: string;
};

/** Props for {@link AwardCard}. */
export type AwardCardProps = {
  /** The award's name, such as "Orange Cap". */
  readonly title: string;
  /** What the award is for, in one sentence. */
  readonly description: string;
  /** The leader, or null until someone has earned the award. */
  readonly winner: AwardEntry | null;
  /** The next place, or null until someone has earned it. */
  readonly runnerUp: AwardEntry | null;
};
