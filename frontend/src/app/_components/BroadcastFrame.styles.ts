import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * A soft pulse for the live dot. It fades `opacity` only, so it never triggers
 * layout, and it stops under reduced motion.
 */
const livePulse = stylex.keyframes({
  "0%": { opacity: 1 },
  "50%": { opacity: 0.35 },
  "100%": { opacity: 1 },
});

/**
 * StyleX rules for {@link BroadcastFrame}. The bar and the page shell.
 */
export const styles = stylex.create({
  /** The broadcast bar: a single strip with a gold rule underneath, like a channel's on-air strip. */
  bar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spaceSm,
    paddingBlock: tokens.spaceSm,
    paddingInline: tokens.spaceMd,
    backgroundColor: tokens.colorMid,
    borderBottomColor: tokens.colorGoldPrimary,
    borderBottomStyle: "solid",
    borderBottomWidth: tokens.borderWidthHairline,
    borderRadius: tokens.radiusSm,
    fontSize: tokens.fontSizeSmall,
    textTransform: "uppercase",
    letterSpacing: tokens.trackingEyebrow,
  },
  live: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spaceSm,
    fontWeight: tokens.fontWeightSemibold,
  },
  dot: {
    width: tokens.sizeDot,
    height: tokens.sizeDot,
    borderRadius: "50%",
    backgroundColor: tokens.colorStatusError,
    animationName: livePulse,
    animationDuration: tokens.durationShimmer,
    animationTimingFunction: tokens.easingInOut,
    animationIterationCount: "infinite",
    "@media (prefers-reduced-motion: reduce)": {
      animationName: "none",
    },
  },
  stage: {
    color: tokens.colorChalkMuted,
  },
});
