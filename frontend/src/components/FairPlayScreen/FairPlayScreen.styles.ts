import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link FairPlayScreen}: a stack of franchises, each in two columns. */
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
  franchise: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    backgroundColor: tokens.colorBase,
    borderRadius: tokens.radiusSm,
    boxShadow: tokens.shadowSubtle,
    padding: tokens.spaceMd,
  },
  heading: {
    fontFamily: tokens.fontSerif,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
  },
  winnerBadge: {
    color: tokens.colorGoldPrimary,
    fontWeight: tokens.fontWeightBold,
  },
  columns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
    gap: tokens.spaceMd,
  },
  columnTitle: {
    margin: 0,
    fontWeight: tokens.fontWeightBold,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceXs,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  item: {
    color: tokens.colorText,
  },
});
