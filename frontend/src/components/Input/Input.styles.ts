import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link Input}. Field, control, and toggle styles are
 * top-level keys, for the same type-checking reason as in `Button.styles.ts`.
 *
 * The focus ring is a 2px gold outline, shown only for keyboard focus, so a
 * mouse click does not leave a ring behind.
 */
export const styles = stylex.create({
  field: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceXs,
    fontFamily: tokens.fontSans,
    color: tokens.colorText,
  },
  label: {
    fontSize: "14px",
  },
  control: {
    minHeight: "44px",
    paddingInline: tokens.spaceMd,
    paddingBlock: tokens.spaceSm,
    backgroundColor: tokens.colorMid,
    color: tokens.colorText,
    fontFamily: tokens.fontSans,
    fontSize: "16px",
    borderRadius: tokens.radiusSm,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    boxShadow: tokens.shadowPressed,
    outlineColor: tokens.colorGoldPrimary,
    outlineWidth: "2px",
    outlineOffset: "2px",
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    ":disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
  toggleRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spaceSm,
    minHeight: "44px",
    fontFamily: tokens.fontSans,
    color: tokens.colorText,
    cursor: "pointer",
  },
  toggle: {
    width: "24px",
    height: "24px",
    accentColor: tokens.colorGoldPrimary,
    outlineColor: tokens.colorGoldPrimary,
    outlineWidth: "2px",
    outlineOffset: "2px",
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    ":disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
});
