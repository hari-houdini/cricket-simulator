import * as stylex from "@stylexjs/stylex";

import { tokens } from "../shared/const/tokens.stylex";

/**
 * Document-level styles for the root layout, and the app shell that every page
 * sits inside: the skip link, header, primary navigation and main landmark.
 *
 * The app is dark-only, so `color-scheme` is fixed to `dark` and the browser's
 * own form controls and scrollbars match the palette.
 */
export const styles = stylex.create({
  root: {
    colorScheme: "dark",
    height: "100%",
  },
  body: {
    backgroundColor: tokens.colorBase,
    color: tokens.colorText,
    fontFamily: tokens.fontSans,
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    WebkitFontSmoothing: "antialiased",
  },
  /**
   * Off-screen until it receives keyboard focus, then slides into view. Using
   * `transform` keeps the motion to a property the animation rules allow. Users
   * who ask for reduced motion get an instant jump.
   */
  skipLink: {
    position: "absolute",
    left: tokens.spaceMd,
    top: tokens.spaceMd,
    padding: `${tokens.spaceSm} ${tokens.spaceMd}`,
    borderRadius: tokens.radiusSm,
    backgroundColor: tokens.colorGoldPrimary,
    color: tokens.colorBase,
    fontWeight: tokens.fontWeightSemibold,
    transform: {
      default: "translateY(-200%)",
      ":focus-visible": "translateY(0)",
    },
    transitionProperty: "transform",
    transitionDuration: {
      default: tokens.durationMicro,
      "@media (prefers-reduced-motion: reduce)": "0ms",
    },
    transitionTimingFunction: tokens.easingOut,
    zIndex: 1,
  },
  /** Shared keyboard focus ring for links in the header. */
  focusRing: {
    outlineColor: tokens.colorGoldPrimary,
    outlineOffset: tokens.offsetFocusRing,
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    outlineWidth: tokens.widthFocusRing,
  },
  header: {
    alignItems: "center",
    borderBottomColor: tokens.colorMid,
    borderBottomStyle: "solid",
    borderBottomWidth: tokens.borderWidthHairline,
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spaceSm,
    justifyContent: "space-between",
    padding: tokens.spaceMd,
  },
  brand: {
    color: tokens.colorText,
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeBrand,
    fontWeight: tokens.fontWeightBold,
    textDecoration: "none",
  },
  navList: {
    display: "flex",
    gap: tokens.spaceMd,
    listStyleType: "none",
    margin: 0,
    padding: 0,
  },
  navLink: {
    color: tokens.colorText,
    textDecoration: "none",
    paddingBlock: tokens.spaceXs,
  },
  brandLink: {
    color: tokens.colorText,
    textDecoration: "none",
  },
  main: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    width: "100%",
    maxWidth: tokens.widthShell,
    marginInline: "auto",
    paddingInline: tokens.spaceMd,
    paddingBlock: tokens.spaceXl,
    boxSizing: "border-box",
  },
});
