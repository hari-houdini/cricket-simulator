import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * A card rises into place. Each card starts a little later than the one before it
 * (its `--i` index sets the delay), so the ten franchises arrive as a wave rather
 * than all at once.
 */
const cardIn = stylex.keyframes({
  from: { opacity: 0, transform: "translateY(24px) scale(0.94)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

/** A claimed card gives one springy press when it becomes the viewer's. */
const claimBurst = stylex.keyframes({
  "0%": { transform: "scale(0.97)" },
  "60%": { transform: "scale(1.035)" },
  "100%": { transform: "scale(1)" },
});

/** The ticker's track scrolls one copy's width, then starts again: a seamless loop. */
const tickerRun = stylex.keyframes({
  from: { transform: "translateX(0)" },
  to: { transform: "translateX(-50%)" },
});

/**
 * StyleX rules for {@link ProtoFranchiseGrid}. The grid fits as many cards as the
 * width allows, so the same markup is one column on a phone and four or five on a
 * wide screen. Every animation is switched off under reduced motion, and the tilt
 * is switched off by the component on touch screens.
 */
export const styles = stylex.create({
  /** The stage, ticker and grid stacked, with room between each. */
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceLg,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${tokens.widthCard}), 1fr))`,
    gap: tokens.spaceGrid,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  /**
   * The card tilts toward the pointer. The component writes `--rx` and `--ry` from
   * the pointer's position, and `--team` carries the franchise colour. The card
   * takes its own depth from `perspective`, so no parent needs one.
   */
  card: {
    position: "relative",
    isolation: "isolate",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    padding: tokens.spaceMd,
    paddingBlockStart: `calc(${tokens.spaceMd} + ${tokens.widthStripe})`,
    backgroundColor: tokens.colorBase,
    borderRadius: tokens.radiusMd,
    transform:
      "perspective(680px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
    transitionProperty: "transform, box-shadow",
    transitionDuration: tokens.durationMicro,
    transitionTimingFunction: tokens.easingOut,
    animationName: cardIn,
    animationDuration: "700ms",
    animationTimingFunction: tokens.easingOut,
    animationFillMode: "both",
    "@media (prefers-reduced-motion: reduce)": {
      animationName: "none",
      transform: "none",
      transitionProperty: "none",
    },
  },
  /** A cut of the franchise colour across the card's top edge, from `--team`. */
  crown: {
    position: "absolute",
    insetInline: 0,
    insetBlockStart: 0,
    height: tokens.widthStripe,
    backgroundColor: "var(--team)",
  },
  /** A light band that sweeps across the card when a pointer enters it. */
  sheen: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    pointerEvents: "none",
    background:
      "linear-gradient(105deg, transparent 38%, rgba(244, 241, 232, 0.2) 50%, transparent 62%)",
    transform: "translateX(-120%)",
    transitionProperty: "transform",
    transitionDuration: "700ms",
    transitionTimingFunction: tokens.easingInOut,
    "@media (hover: hover) and (prefers-reduced-motion: no-preference)": {
      [stylex.when.ancestor(":hover")]: {
        transform: "translateX(120%)",
      },
    },
  },
  /** The franchise code: large Bodoni, the card's focal point. */
  code: {
    position: "relative",
    zIndex: 2,
    margin: 0,
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeReadout,
    fontWeight: tokens.fontWeightBold,
    lineHeight: 1,
    letterSpacing: tokens.trackingEyebrow,
  },
  name: {
    position: "relative",
    zIndex: 2,
    margin: 0,
    fontSize: tokens.fontSizeSmall,
    color: tokens.colorChalkMuted,
  },
  footer: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spaceSm,
    marginBlockStart: tokens.spaceXs,
    minHeight: tokens.sizeTouch,
  },
  status: {
    fontSize: tokens.fontSizeSmall,
    fontWeight: tokens.fontWeightSemibold,
  },
  statusMine: {
    color: tokens.colorGoldPrimary,
  },
  statusFree: {
    color: tokens.colorStatusSuccess,
  },
  statusTaken: {
    color: tokens.colorChalkMuted,
  },
  /** The viewer's own card lifts with an offset glow in its team colour, and bursts once. */
  mine: {
    boxShadow: "0 14px 30px -12px var(--team)",
    animationName: claimBurst,
    animationDuration: "520ms",
    animationTimingFunction: tokens.easingOut,
    animationDelay: "0ms",
    animationFillMode: "none",
  },
  /** A taken card dims its colour, so a claimed franchise reads as spent. */
  taken: {
    filter: "saturate(0.55)",
  },
  /** The ticker strip above the grid: a scrolling band of franchise states. */
  ticker: {
    overflow: "hidden",
    maskImage:
      "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
    borderBlock: `${tokens.borderWidthHairline} solid ${tokens.colorLine}`,
  },
  tickerTrack: {
    display: "flex",
    width: "max-content",
    gap: tokens.spaceLg,
    paddingBlock: tokens.spaceSm,
    animationName: tickerRun,
    animationDuration: "32s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    "@media (prefers-reduced-motion: reduce)": {
      animationName: "none",
    },
  },
  /**
   * One copy of the ticker's items. Padding the end by the same gap as between
   * items makes the two copies join with no visible seam when the track loops.
   */
  tickerCopy: {
    display: "flex",
    gap: tokens.spaceLg,
    paddingInlineEnd: tokens.spaceLg,
  },
  tickerItem: {
    display: "inline-flex",
    alignItems: "baseline",
    gap: tokens.spaceXs,
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeLead,
    fontWeight: tokens.fontWeightBold,
    whiteSpace: "nowrap",
    color: tokens.colorText,
  },
  tickerStatus: {
    fontFamily: tokens.fontSans,
    fontSize: tokens.fontSizeSmall,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorChalkMuted,
  },
  tickerDivider: {
    color: tokens.colorGoldPrimary,
  },
});
