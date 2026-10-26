import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link FixtureList}. */
export const styles = stylex.create({
  /**
   * The only horizontal scroll container for the schedule, so the page never
   * scrolls sideways on a phone. It takes focus (see {@link FixtureList}).
   */
  scroll: {
    overflowX: "auto",
  },
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
