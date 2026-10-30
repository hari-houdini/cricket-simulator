import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link FairPlayScreen}: the ranked table and its notes. */
export const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceMd,
  },
  note: {
    margin: 0,
    color: tokens.colorText,
  },
  /**
   * The wrapper is the only scroll container, so the page never scrolls sideways for the
   * table. It takes focus so keyboard users can reach the columns that sit off-screen.
   */
  scroll: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    color: tokens.colorText,
  },
  headerCell: {
    textAlign: "left",
    padding: tokens.spaceSm,
    borderBottomColor: tokens.colorShadow,
    borderBottomStyle: "solid",
    borderBottomWidth: tokens.borderWidthHairline,
  },
  cell: {
    textAlign: "left",
    verticalAlign: "top",
    padding: tokens.spaceSm,
    borderBottomColor: tokens.colorShadow,
    borderBottomStyle: "solid",
    borderBottomWidth: tokens.borderWidthHairline,
  },
  rating: {
    fontVariantNumeric: "tabular-nums",
    fontWeight: tokens.fontWeightBold,
  },
  winnerBadge: {
    color: tokens.colorGoldPrimary,
    fontSize: tokens.fontSizeSmall,
    fontWeight: tokens.fontWeightBold,
  },
  list: {
    margin: 0,
    paddingLeft: tokens.spaceMd,
  },
  item: {
    margin: 0,
  },
});
