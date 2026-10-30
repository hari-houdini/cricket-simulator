import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link SimStack}: the list of matches and the log lines between them. */
export const styles = stylex.create({
  list: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  /** A line in the log: a substitution or a skip. Dashed, so it reads apart from a match card. */
  log: {
    borderColor: tokens.colorShadow,
    borderStyle: "dashed",
    borderWidth: tokens.borderWidthHairline,
    borderRadius: tokens.radiusSm,
    color: tokens.colorText,
    fontSize: tokens.fontSizeSmall,
    margin: 0,
    padding: tokens.spaceSm,
  },
  /** The line shown while the sim waits. Gold, so a pause is never mistaken for a match. */
  pauseLog: {
    display: "block",
    borderColor: tokens.colorGoldPrimary,
    borderStyle: "solid",
    borderWidth: tokens.borderWidthHairline,
    borderRadius: tokens.radiusSm,
    color: tokens.colorGoldPrimary,
    fontWeight: tokens.fontWeightBold,
    margin: 0,
    padding: tokens.spaceSm,
  },
});
