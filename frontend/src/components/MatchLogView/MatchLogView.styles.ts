import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link MatchLogView}: the card, its key moments, and its scorecard accordion. */
export const styles = stylex.create({
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    backgroundColor: tokens.colorBase,
    borderRadius: tokens.radiusSm,
    color: tokens.colorText,
    padding: tokens.spaceMd,
  },
  heading: {
    margin: 0,
    fontWeight: tokens.fontWeightBold,
  },
  note: {
    margin: 0,
    fontSize: tokens.fontSizeSmall,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    listStyleType: "none",
    margin: 0,
    padding: 0,
  },
  item: {
    margin: 0,
  },
  /** An innings' start or end, set apart from the moments inside it. */
  inningsItem: {
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorGoldPrimary,
  },
  accordion: {
    font: "inherit",
    color: "inherit",
    backgroundColor: "transparent",
    borderWidth: 0,
    cursor: "pointer",
    padding: 0,
    textAlign: "left",
    fontWeight: tokens.fontWeightBold,
    outlineWidth: {
      default: null,
      ":focus-visible": tokens.widthFocusRing,
    },
    outlineStyle: {
      default: null,
      ":focus-visible": "solid",
    },
    outlineColor: {
      default: null,
      ":focus-visible": tokens.colorGoldPrimary,
    },
  },
});
