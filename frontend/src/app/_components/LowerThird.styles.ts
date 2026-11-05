import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link LowerThird}. It is the title block that a broadcast
 * puts over a scene: a gold edge, a small uppercase label, and a large serif title.
 */
export const styles = stylex.create({
  block: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceXs,
    paddingInline: tokens.spaceMd,
    borderInlineStartColor: tokens.colorGoldPrimary,
    borderInlineStartStyle: "solid",
    borderInlineStartWidth: tokens.borderWidthAccent,
  },
  eyebrow: {
    margin: 0,
    fontSize: tokens.fontSizeEyebrow,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: tokens.trackingEyebrow,
    textTransform: "uppercase",
    color: tokens.colorChalkMuted,
  },
  title: {
    margin: 0,
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeDisplay,
    fontWeight: tokens.fontWeightBold,
    lineHeight: 1.02,
    color: tokens.colorText,
  },
});
