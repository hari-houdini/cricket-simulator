import type { FixtureRow } from "../../shared/types/fixture-row.types";

/** Props for {@link FixtureList}. */
export type FixtureListProps = {
  /** The schedule rows, in round order, already paced by the reveal. */
  readonly rows: readonly FixtureRow[];
};
