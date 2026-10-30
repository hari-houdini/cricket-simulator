import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link Scorecard}: a two-column table of totals, and its notes. */
export const styles = stylex.create({
  scorecard: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  cell: {
    padding: tokens.spaceSm,
    textAlign: "left",
    borderBottomColor: tokens.colorShadow,
    borderBottomStyle: "solid",
    borderBottomWidth: tokens.borderWidthHairline,
  },
  figure: {
    fontVariantNumeric: "tabular-nums",
    fontWeight: tokens.fontWeightBold,
  },
  note: {
    margin: 0,
    fontSize: tokens.fontSizeSmall,
  },
});
