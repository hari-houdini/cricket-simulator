import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link Tabs}: the pill bar, the track the tabs sit in, the
 * tabs, and the glider that slides behind the selected one.
 *
 * The glider's width and offset depend on the tab count and the selected index,
 * so they are a dynamic style. Its transition names `transform` only, which
 * keeps it on the animation allow-list (`AGENTS.md`, Animation). Reduced-motion
 * users get no slide.
 */
export const styles = stylex.create({
  bar: {
    display: "flex",
    padding: tokens.spaceTabInset,
    backgroundColor: tokens.colorBase,
    boxShadow: tokens.shadowRaised,
    borderRadius: tokens.radiusPill,
  },
  track: {
    position: "relative",
    display: "flex",
    flex: 1,
  },
  glider: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    zIndex: 1,
    backgroundColor: tokens.colorMid,
    borderRadius: tokens.radiusPill,
    transitionProperty: "transform",
    transitionDuration: tokens.durationDefault,
    transitionTimingFunction: tokens.easingInOut,
    "@media (prefers-reduced-motion: reduce)": {
      transitionProperty: "none",
    },
  },
  /**
   * Sizes the glider to one tab and slides it onto the selected one. The
   * percentages are of the glider's own width, so `100%` is exactly one tab.
   *
   * @param count - How many tabs the bar has.
   * @param index - The position of the selected tab, from zero.
   * @returns The glider's width and its offset.
   */
  gliderPosition: (count: number, index: number) => ({
    width: `${100 / count}%`,
    transform: `translateX(${index * 100}%)`,
  }),
  tab: {
    position: "relative",
    zIndex: 2,
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: tokens.heightTab,
    borderWidth: 0,
    borderRadius: tokens.radiusPill,
    backgroundColor: "transparent",
    color: tokens.colorText,
    fontFamily: tokens.fontSans,
    fontSize: tokens.fontSizeTab,
    fontWeight: 500,
    whiteSpace: "nowrap",
    cursor: "pointer",
    transitionProperty: "color",
    transitionDuration: tokens.durationMicro,
    transitionTimingFunction: tokens.easingInOut,
    "@media (min-width: 768px)": {
      fontSize: tokens.fontSizeTabWide,
    },
  },
  tabSelected: {
    color: tokens.colorGoldPrimary,
  },
});
