import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * Sweep that moves a translucent sheen across the placeholder. It animates only
 * `transform`, as `AGENTS.md` requires for motion.
 */
const shimmer = stylex.keyframes({
  from: { transform: "translateX(-100%)" },
  to: { transform: "translateX(100%)" },
});

/**
 * StyleX rules for {@link Skeleton}. Reduced-motion users get a static
 * placeholder with no sweep.
 */
export const styles = stylex.create({
  base: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: tokens.colorMid,
    borderRadius: tokens.radiusSm,
    "::after": {
      content: '""',
      position: "absolute",
      inset: 0,
      backgroundColor: tokens.colorShimmer,
      animationName: shimmer,
      animationDuration: tokens.durationShimmer,
      animationTimingFunction: "linear",
      animationIterationCount: "infinite",
    },
    "@media (prefers-reduced-motion: reduce)": {
      "::after": {
        animationName: "none",
      },
    },
  },
});
