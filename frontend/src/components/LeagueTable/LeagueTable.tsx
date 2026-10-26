"use client";

import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { focusRing } from "../../shared/const/focus-ring.styles";
import { franchiseName } from "../../shared/utils/franchise-label";
import {
  formatNetRunRate,
  type SortDirection,
  type StandingSortKey,
  sortStandings,
} from "../../shared/utils/standings";
import { styles } from "./LeagueTable.styles";
import type { LeagueTableProps } from "./LeagueTable.types";

/** The columns a reader can sort by, with the heading each shows. */
const SORTABLE_COLUMNS: readonly {
  readonly key: StandingSortKey;
  readonly label: string;
}[] = [
  { key: "played", label: "Played" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
  { key: "points", label: "Points" },
  { key: "netRunRate", label: "NRR" },
];

/** A column the table is sorted by. */
type Sort = {
  readonly key: StandingSortKey;
  readonly direction: SortDirection;
};

/**
 * The league table. Each sortable column header is a button: the first press
 * sorts the column largest first, and a second press reverses it. Rows that tie
 * keep their table order. The header carries `aria-sort`, so a screen reader
 * says which column the table is sorted by.
 *
 * @param props.standings - The table rows, in table order.
 * @returns A table of franchises with their results and points.
 */
export function LeagueTable({ standings }: LeagueTableProps) {
  const [sort, setSort] = useState<Sort | null>(null);
  const rows = sort
    ? sortStandings(standings, sort.key, sort.direction)
    : standings;

  /**
   * Sorts by a column, or reverses the sort when the column is already the sort.
   *
   * @param key - The column that was pressed.
   */
  function choose(key: StandingSortKey) {
    setSort((current) => {
      if (current?.key === key) {
        return {
          key,
          direction:
            current.direction === "descending" ? "ascending" : "descending",
        };
      }
      return { key, direction: "descending" };
    });
  }

  /**
   * @param key - The column to describe.
   * @returns The `aria-sort` value for its header.
   */
  function ariaSortFor(
    key: StandingSortKey,
  ): "ascending" | "descending" | "none" {
    return sort?.key === key ? sort.direction : "none";
  }

  return (
    <section
      aria-label="Standings"
      // A scroll container must be focusable, so keyboard users can reach the
      // columns that sit off-screen on a phone (axe: scrollable-region-focusable).
      // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region, see the comment above
      tabIndex={0}
      {...stylex.props(styles.scroll, focusRing.ring)}
    >
      <table aria-label="League table" {...stylex.props(styles.table)}>
        <thead>
          <tr>
            <th
              scope="col"
              {...stylex.props(styles.headerCell, styles.headerTeam)}
            >
              Franchise
            </th>
            {SORTABLE_COLUMNS.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={ariaSortFor(column.key)}
                {...stylex.props(styles.headerCell)}
              >
                <button
                  type="button"
                  onClick={() => choose(column.key)}
                  {...stylex.props(styles.sortButton)}
                >
                  {column.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.franchiseId}>
              <th scope="row" {...stylex.props(styles.cell, styles.teamCell)}>
                {franchiseName(row.franchiseId)}
              </th>
              <td {...stylex.props(styles.cell)}>{row.played}</td>
              <td {...stylex.props(styles.cell)}>{row.won}</td>
              <td {...stylex.props(styles.cell)}>{row.lost}</td>
              <td {...stylex.props(styles.cell)}>{row.points}</td>
              <td {...stylex.props(styles.cell)}>
                {formatNetRunRate(row.netRunRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
