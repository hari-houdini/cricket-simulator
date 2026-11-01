import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link Toast}. Each tone is a top-level key. Every tone pairs
 * its color with a text label, so the tone is never conveyed by color alone.
 */
export const styles = stylex.create({
  base: {
    display: "flex",
    alignItems: "center",
    minHeight: "44px",
    paddingInline: tokens.spaceMd,
    paddingBlock: tokens.spaceSm,
    borderRadius: tokens.radiusSm,
    boxShadow: tokens.shadowSubtle,
    fontFamily: tokens.fontSans,
    fontSize: "14px",
  },
  toneInfo: {
    backgroundColor: tokens.colorMid,
    color: tokens.colorText,
  },
  toneSuccess: {
    backgroundColor: tokens.colorStatusSuccess,
    color: tokens.colorBase,
  },
  toneWarning: {
    backgroundColor: tokens.colorStatusWarning,
    color: tokens.colorBase,
  },
  /**
   * The error fill is light, so the text is the deepest navy. `colorBase` gave
   * 3.86:1 on it, below the 4.5:1 minimum for body text; `colorMid` gives 5.28:1.
   */
  toneError: {
    backgroundColor: tokens.colorStatusError,
    color: tokens.colorMid,
  },
});
