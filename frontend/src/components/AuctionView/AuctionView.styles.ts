import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link AuctionView}. One column on a phone; the lot card and
 * the sidebar sit side by side from 768px.
 */
export const styles = stylex.create({
  layout: {
    display: "grid",
    gap: tokens.spaceXl,
    "@media (min-width: 768px)": {
      gridTemplateColumns: "2fr 1fr",
      alignItems: "start",
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
  heading: {
    fontFamily: tokens.fontSerif,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
  },
  playerName: {
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeHeading,
    fontWeight: tokens.fontWeightBold,
    margin: 0,
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spaceMd,
    margin: 0,
  },
  note: {
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
  announcement: {
    margin: 0,
    color: tokens.colorGoldPrimary,
  },
});
