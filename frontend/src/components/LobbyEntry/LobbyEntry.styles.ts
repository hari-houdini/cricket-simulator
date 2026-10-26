import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link LobbyEntry}. The two forms stack on a phone and sit
 * side by side from 768px.
 */
export const styles = stylex.create({
  grid: {
    display: "grid",
    gap: tokens.spaceXl,
    "@media (min-width: 768px)": {
      gridTemplateColumns: "1fr 1fr",
    },
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceMd,
    backgroundColor: tokens.colorMid,
    borderRadius: tokens.radiusMd,
    boxShadow: tokens.shadowRaised,
    padding: tokens.spaceLg,
  },
  title: {
    fontFamily: tokens.fontSerif,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
  },
});
