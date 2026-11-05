import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * A slow drift for the warm floodlight. It moves and scales with `transform`
 * only, so it runs on the compositor and never re-runs layout (`AGENTS.md`).
 */
const driftWarm = stylex.keyframes({
  from: { transform: "translate3d(0, 0, 0) scale(1)" },
  to: { transform: "translate3d(14vw, 8vh, 0) scale(1.12)" },
});

/** The cool chalk glow drifts the other way, so the two lights cross over time. */
const driftChalk = stylex.keyframes({
  from: { transform: "translate3d(0, 0, 0) scale(1.04)" },
  to: { transform: "translate3d(-12vw, -10vh, 0) scale(0.96)" },
});

/**
 * The pitch-stripe bands slide by exactly one stripe period (60px light, 60px
 * dark), so the loop has no visible jump.
 */
const slideStripes = stylex.keyframes({
  from: { transform: "translate3d(0, 0, 0)" },
  to: { transform: "translate3d(-120px, 0, 0)" },
});

/** Dust rises, brightens and fades. Opacity is kept low so no speck competes with text. */
const rise = stylex.keyframes({
  "0%": { transform: "translate3d(0, 0, 0)", opacity: 0 },
  "15%": { opacity: 0.7 },
  "100%": { transform: "translate3d(0, -40vh, 0)", opacity: 0 },
});

/**
 * A fine grain: a fractal noise texture rendered as an SVG data URI, which CSP
 * allows through `img-src data:`. It is static, so it adds texture and no motion.
 */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.96 0 0 0 0 0.95 0 0 0 0 0.91 0 0 0 0.9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * StyleX rules for {@link StadiumBackground}.
 *
 * Every animation is off under `prefers-reduced-motion`, and the dust is hidden
 * with it, so the background is still and keeps its colour and grain.
 */
export const styles = stylex.create({
  root: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: -1,
    overflow: "hidden",
    backgroundColor: tokens.colorMid,
    pointerEvents: "none",
  },
  glowWarm: {
    position: "absolute",
    top: "-30vmax",
    left: "-20vmax",
    width: "70vmax",
    height: "70vmax",
    borderRadius: "50%",
    backgroundImage: `radial-gradient(closest-side, ${tokens.colorFloodlight}, transparent)`,
    animationName: driftWarm,
    animationDuration: "36s",
    animationTimingFunction: "ease-in-out",
    animationDirection: "alternate",
    animationIterationCount: "infinite",
    "@media (prefers-reduced-motion: reduce)": {
      animationName: "none",
    },
  },
  glowChalk: {
    position: "absolute",
    top: "40vh",
    right: "-25vmax",
    width: "60vmax",
    height: "60vmax",
    borderRadius: "50%",
    backgroundImage: `radial-gradient(closest-side, ${tokens.colorChalkGlow}, transparent)`,
    animationName: driftChalk,
    animationDuration: "44s",
    animationTimingFunction: "ease-in-out",
    animationDirection: "alternate",
    animationIterationCount: "infinite",
    "@media (prefers-reduced-motion: reduce)": {
      animationName: "none",
    },
  },
  /**
   * The skew sits on this wrapper, because the slide on {@link stripes} already
   * uses `transform`, and one element can only carry one transform animation.
   */
  stripesFrame: {
    position: "absolute",
    right: "-10%",
    bottom: "-8vh",
    left: "-10%",
    height: "42vh",
    transform: "skewY(-6deg)",
  },
  stripes: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundImage: `repeating-linear-gradient(90deg, ${tokens.colorStripeLight} 0 60px, ${tokens.colorStripeDark} 60px 120px)`,
    animationName: slideStripes,
    animationDuration: "40s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    "@media (prefers-reduced-motion: reduce)": {
      animationName: "none",
    },
  },
  grain: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundImage: GRAIN,
    opacity: 0.14,
  },
  dust: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    "@media (prefers-reduced-motion: reduce)": {
      display: "none",
    },
  },
  speck: {
    position: "absolute",
    borderRadius: "50%",
    backgroundColor: tokens.colorChalkMuted,
    opacity: 0,
    animationName: rise,
    animationDuration: "var(--speck-duration)",
    animationDelay: "var(--speck-delay)",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },
});
