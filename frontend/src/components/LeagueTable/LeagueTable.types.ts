import type { Standing } from "../../shared/types/league.types";

/** Props for {@link LeagueTable}. */
export type LeagueTableProps = {
  /** The table rows, in table order (points, then net run rate). */
  readonly standings: readonly Standing[];
};
