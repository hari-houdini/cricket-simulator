import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link SimView}: the card that holds the sim, its controls, and the stack. */
export const styles = stylex.create({
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceLg,
    backgroundColor: tokens.colorMid,
    borderRadius: tokens.radiusMd,
    boxShadow: tokens.shadowRaised,
    padding: tokens.spaceLg,
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
  subheading: {
    fontFamily: tokens.fontSerif,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
  },
  note: {
    margin: 0,
    color: tokens.colorText,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spaceSm,
  },
  skip: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    borderTopColor: tokens.colorShadow,
    borderTopStyle: "solid",
    borderTopWidth: tokens.borderWidthHairline,
    paddingTop: tokens.spaceMd,
  },
  loading: {
    margin: 0,
    color: tokens.colorText,
  },
});
