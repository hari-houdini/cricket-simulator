import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link LobbyView}. Sections stack, with the same gap on every width. */
export const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceXl,
  },
  heading: {
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeHeading,
    fontWeight: tokens.fontWeightBold,
    margin: 0,
  },
  subheading: {
    fontFamily: tokens.fontSerif,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spaceMd,
    margin: 0,
  },
  shareLink: {
    overflowWrap: "anywhere",
    color: tokens.colorGoldPrimary,
    outlineColor: tokens.colorGoldPrimary,
    outlineOffset: tokens.offsetFocusRing,
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    outlineWidth: tokens.widthFocusRing,
  },
  ownerList: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  joinForm: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceMd,
    backgroundColor: tokens.colorMid,
    borderRadius: tokens.radiusMd,
    boxShadow: tokens.shadowRaised,
    padding: tokens.spaceLg,
  },
  note: {
    margin: 0,
  },
});
