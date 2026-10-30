import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link MatchEntry}: a match card and its owner highlight. */
export const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    backgroundColor: tokens.colorBase,
    borderRadius: tokens.radiusSm,
    borderLeftColor: "transparent",
    borderLeftStyle: "solid",
    borderLeftWidth: tokens.borderWidthHairline,
    color: tokens.colorText,
    padding: tokens.spaceMd,
  },
  /** A match between two owners: a thick gold edge, with both names in the badge. */
  twoOwners: {
    borderLeftColor: tokens.colorGoldPrimary,
    borderLeftWidth: tokens.borderWidthAccent,
  },
  /** A match with one owner: a thick green edge, with that owner's name in the badge. */
  oneOwner: {
    borderLeftColor: tokens.colorStatusSuccess,
    borderLeftWidth: tokens.borderWidthAccent,
  },
  summary: {
    font: "inherit",
    color: "inherit",
    backgroundColor: "transparent",
    borderWidth: 0,
    cursor: "pointer",
    padding: 0,
    textAlign: "left",
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
  headline: {
    margin: 0,
    fontWeight: tokens.fontWeightBold,
  },
  badge: {
    alignSelf: "flex-start",
    color: tokens.colorGoldPrimary,
    fontSize: tokens.fontSizeSmall,
    fontWeight: tokens.fontWeightBold,
  },
});
