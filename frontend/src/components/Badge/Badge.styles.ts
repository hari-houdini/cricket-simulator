import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link Badge}. Each kind and status is a top-level key, for
 * the same type-checking reason as in `Button.styles.ts`.
 */
export const styles = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spaceXs,
    paddingInline: tokens.spaceSm,
    paddingBlock: tokens.spaceXs,
    borderRadius: tokens.radiusSm,
    fontFamily: tokens.fontSans,
    fontSize: "12px",
    fontWeight: 600,
    lineHeight: 1,
  },
  team: {
    backgroundColor: tokens.colorMid,
    color: tokens.colorText,
  },
  swatch: {
    width: "16px",
    height: "16px",
    borderRadius: tokens.spaceXs,
  },
  role: {
    backgroundColor: tokens.colorGoldPrimary,
    color: tokens.colorBase,
  },
  statusAvailable: {
    backgroundColor: tokens.colorStatusSuccess,
    color: tokens.colorBase,
  },
  statusSold: {
    backgroundColor: tokens.colorStatusError,
    color: tokens.colorBase,
  },
  statusCaptain: {
    backgroundColor: tokens.colorGoldSecondary,
    color: tokens.colorBase,
  },
});
