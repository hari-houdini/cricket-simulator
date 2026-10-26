import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link Modal}. The backdrop dims the page behind the dialog,
 * and the dialog uses the card surface and raised shadow from the design system.
 */
export const styles = stylex.create({
  backdrop: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.spaceMd,
    backgroundColor: tokens.colorShadow,
  },
  dialog: {
    width: "100%",
    maxWidth: "480px",
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceMd,
    padding: tokens.spaceLg,
    backgroundColor: tokens.colorMid,
    color: tokens.colorText,
    borderRadius: tokens.radiusMd,
    boxShadow: tokens.shadowRaised,
    fontFamily: tokens.fontSans,
    // The dialog takes focus on open so screen readers announce it. It is not
    // itself a control, so it shows no focus ring.
    outlineStyle: "none",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spaceSm,
  },
  title: {
    fontFamily: tokens.fontSerif,
    fontSize: "24px",
    fontWeight: 400,
  },
  closeButton: {
    minWidth: "44px",
    minHeight: "44px",
    backgroundColor: "transparent",
    color: tokens.colorGoldPrimary,
    borderWidth: "0px",
    borderRadius: tokens.radiusSm,
    fontSize: "16px",
    cursor: "pointer",
    transitionProperty: "background-color, color",
    transitionDuration: tokens.durationDefault,
    transitionTimingFunction: tokens.easingInOut,
    ":hover": {
      backgroundColor: tokens.colorBase,
    },
    "@media (prefers-reduced-motion: reduce)": {
      transitionProperty: "none",
    },
    outlineColor: tokens.colorGoldPrimary,
    outlineWidth: "2px",
    outlineOffset: "2px",
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
  },
});
