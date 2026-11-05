import * as stylex from "@stylexjs/stylex";

import { tokens } from "./tokens.stylex";

/**
 * The prototype's "stadium at night" palette, for the throwaway `/prototype` route.
 *
 * It is a StyleX theme, so it applies only inside the element that carries its
 * class. The production tokens in `tokens.stylex.ts` are not changed, so every
 * other route keeps the navy and gold palette. Each override is contrast-checked
 * against the surface it sits on at WCAG 2.2 AA: 4.5:1 for body text, 3:1 for
 * large text and UI components. The ratios are in the comment beside each value.
 *
 * Hex values live only in this file and in `tokens.stylex.ts`, as the styling
 * rules require.
 */

/** Prototype-only values that have no production token. Used by the prototype's own components. */
export const prototypeVars = stylex.defineVars({
  /** Secondary text. 10.3:1 on the turf night base. */
  colorChalkMuted: "#c5cdbf",
  /** Dark ink for text on an ochre fill. 7.8:1 on ochre. */
  colorInk: "#0b2116",
  /** A warm floodlight glow, drifting in the background. Decorative, so no text sits on it. */
  colorFloodlight: "rgba(232, 163, 61, 0.22)",
  /** A cool chalk glow for the second floodlight. Decorative. */
  colorChalkGlow: "rgba(244, 241, 232, 0.10)",
  /** A faint light band across the pitch stripes. Decorative. */
  colorStripeLight: "rgba(244, 241, 232, 0.035)",
  /** The darker band between the stripes. Decorative. */
  colorStripeDark: "rgba(0, 0, 0, 0.22)",
  /** The fine grain, a little lighter than the surface. Decorative. */
  colorGrain: "rgba(244, 241, 232, 0.06)",
  /** A hairline rule on the broadcast frame. Structure only, not text. */
  colorBroadcastRule: "rgba(232, 163, 61, 0.45)",
});

/**
 * The pitch-at-night theme. It overrides the production token names that the
 * shared components read, so the same components pick up the new palette.
 *
 * - `colorMid`, the page and card surface: turf night, `#0b2116`.
 * - `colorBase`, the raised surface: turf deep, `#0f2d1e`. Chalk text is 13.2:1 on it.
 * - `colorText`, body text: chalk, `#f4f1e8`, 15.0:1 on turf night.
 * - `colorGoldPrimary`, the accent: ochre, `#e8a33d`, 7.8:1 on turf night. Primary buttons use ink on it.
 * - `colorGoldSecondary`, the accent's hover: a lighter ochre, `#f0b55a`.
 * - `colorStatusSuccess`: lime, `#9fdc6a`, 10.4:1 on turf night.
 * - `colorStatusWarning`: amber, `#f2a65a`, 8.4:1 on turf night and 7.3:1 on turf deep.
 * - `colorStatusError`, the red ball: cherry, `#ff6b66`, 6.1:1 on turf night and 5.3:1 on turf deep, so it works for text too.
 */
export const prototypeTheme = stylex.createTheme(tokens, {
  colorMid: "#0b2116",
  colorBase: "#0f2d1e",
  colorShadow: "#050f0a",
  colorText: "#f4f1e8",
  colorGoldPrimary: "#e8a33d",
  colorGoldSecondary: "#f0b55a",
  colorStatusSuccess: "#9fdc6a",
  colorStatusWarning: "#f2a65a",
  colorStatusError: "#ff6b66",
  colorBackdropBase: "#0b2116",
  colorBackdropWaveDeep: "#0b2116",
  colorBackdropWaveLight: "#0b2116",
  colorShimmer: "rgba(244, 241, 232, 0.08)",
});
