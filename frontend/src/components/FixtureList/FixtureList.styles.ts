import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link FixtureList}. */
export const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceMd,
  },
  heading: {
    fontFamily: tokens.fontSerif,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  row: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceXs,
    backgroundColor: tokens.colorBase,
    borderRadius: tokens.radiusSm,
    padding: tokens.spaceSm,
  },
  fixture: {
    fontWeight: tokens.fontWeightBold,
  },
  score: {
    color: tokens.colorText,
  },
  summary: {
    color: tokens.colorGoldSecondary,
  },
  muted: {
    color: tokens.colorText,
  },
});
