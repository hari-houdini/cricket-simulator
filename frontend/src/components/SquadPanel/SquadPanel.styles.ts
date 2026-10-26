import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link SquadPanel}: the card that holds the squad picker. */
export const styles = stylex.create({
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceMd,
    backgroundColor: tokens.colorMid,
    borderRadius: tokens.radiusMd,
    boxShadow: tokens.shadowRaised,
    padding: tokens.spaceLg,
  },
  loading: {
    margin: 0,
    color: tokens.colorText,
  },
});
