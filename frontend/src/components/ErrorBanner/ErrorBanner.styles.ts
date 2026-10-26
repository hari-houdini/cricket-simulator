import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link ErrorBanner}. Amber surface with dark text, as the
 * design system specifies for connection problems.
 */
export const styles = stylex.create({
  base: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spaceSm,
    width: "100%",
    minHeight: "44px",
    paddingInline: tokens.spaceMd,
    paddingBlock: tokens.spaceSm,
    backgroundColor: tokens.colorStatusWarning,
    color: tokens.colorBase,
    fontFamily: tokens.fontSans,
    fontSize: "14px",
    fontWeight: 500,
  },
});
