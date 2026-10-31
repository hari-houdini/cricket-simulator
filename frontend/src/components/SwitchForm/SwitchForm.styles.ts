import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link SwitchForm}.
 *
 * Desktop: the two forms sit side by side, and the overlay slides between the
 * left and right edges. It moves with `transform` only, so the browser does not
 * re-run layout on each frame (`AGENTS.md`, Animation). A `translateX` percentage
 * is of the element's own width, so the overlay (40% of the card) moves 150% to
 * reach the right edge.
 *
 * Below 768px, the overlay is hidden, the {@link Tabs} bar shows above the card's
 * single visible form, and the card grows to fit its content, so nothing scales.
 */
export const styles = stylex.create({
  card: {
    position: "relative",
    width: "100%",
    maxWidth: "1000px",
    height: "600px",
    overflow: "hidden",
    backgroundColor: tokens.colorMid,
    color: tokens.colorText,
    fontFamily: tokens.fontSans,
    borderRadius: tokens.radiusMd,
    boxShadow: tokens.shadowRaised,
    "@media (max-width: 767px)": {
      height: "auto",
    },
  },
  tabs: {
    display: "none",
    padding: tokens.spaceMd,
    "@media (max-width: 767px)": {
      display: "block",
    },
  },
  panel: {
    position: "absolute",
    top: 0,
    width: "60%",
    height: "100%",
    margin: 0,
    padding: tokens.spaceLg,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spaceMd,
    transitionProperty: "opacity",
    transitionDuration: tokens.durationCard,
    transitionTimingFunction: tokens.easingInOut,
    "@media (prefers-reduced-motion: reduce)": {
      transitionProperty: "none",
    },
    "@media (max-width: 767px)": {
      position: "static",
      width: "auto",
      height: "auto",
    },
  },
  panelSignUp: {
    left: "40%",
  },
  panelSignIn: {
    left: 0,
  },
  panelActive: {
    opacity: 1,
  },
  panelInactive: {
    opacity: 0,
    "@media (max-width: 767px)": {
      display: "none",
    },
  },
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    width: "100%",
    maxWidth: "350px",
  },
  title: {
    margin: 0,
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeHeading,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorText,
    textAlign: "center",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 2,
    width: "40%",
    height: "100%",
    padding: tokens.spaceLg,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spaceMd,
    overflow: "hidden",
    backgroundColor: tokens.colorBase,
    boxShadow: tokens.shadowSubtle,
    transitionProperty: "transform",
    transitionDuration: tokens.durationCard,
    transitionTimingFunction: tokens.easingInOut,
    "@media (prefers-reduced-motion: reduce)": {
      transitionProperty: "none",
    },
    "@media (max-width: 767px)": {
      display: "none",
    },
  },
  overlaySignIn: {
    transform: "translateX(150%)",
  },
  /** A decorative inset disc behind the overlay's text. Hidden from assistive tech. */
  decorLarge: {
    position: "absolute",
    zIndex: -1,
    bottom: "-150px",
    left: "-150px",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    backgroundColor: tokens.colorBase,
    boxShadow: tokens.shadowPressed,
  },
  decorSmall: {
    position: "absolute",
    zIndex: -1,
    top: "-60px",
    right: "-60px",
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    backgroundColor: tokens.colorBase,
    boxShadow: tokens.shadowPressed,
  },
  description: {
    margin: 0,
    maxWidth: "300px",
    fontSize: "14px",
    lineHeight: 1.6,
    textAlign: "center",
  },
});
