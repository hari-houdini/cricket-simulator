import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link CricketBackdrop}. The SVG's fills are set through
 * these classes, not through SVG `fill` attributes, so the wave colors stay
 * design tokens (`AGENTS.md`, Styling).
 *
 * The layer is `fixed`, so it stays put while the page scrolls. It sits at
 * `zIndex: -1` so it paints behind every view's content, and `pointerEvents`
 * is off so it never takes a click.
 */
export const styles = stylex.create({
  layer: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: -1,
    pointerEvents: "none",
  },
  /**
   * The full artwork, centred. Shown from 768px up, where the viewport is wide
   * enough for the whole curve to read. Hidden below that, where the mobile layer
   * takes over.
   */
  desktopLayer: {
    "@media (max-width: 767px)": {
      display: "none",
    },
  },
  /**
   * A left-anchored crop for phones. At 390px wide the centred crop shows only
   * the empty band between the two waves, so this one anchors to the left edge,
   * where the deep wave's diagonal sits. Hidden from 768px up.
   */
  mobileLayer: {
    display: "none",
    "@media (max-width: 767px)": {
      display: "block",
    },
  },
  base: {
    fill: tokens.colorBackdropBase,
  },
  waveDeep: {
    fill: tokens.colorBackdropWaveDeep,
  },
  waveLight: {
    fill: tokens.colorBackdropWaveLight,
  },
});
