import * as stylex from "@stylexjs/stylex";

import { WAVE_DEEP_PATH, WAVE_LIGHT_PATH } from "./CricketBackdrop.const";
import { styles } from "./CricketBackdrop.styles";

/**
 * The wave artwork: a navy base with two overlapping waves, in the snippet's
 * 1440×560 viewBox. Both layers in {@link CricketBackdrop} draw it, so the
 * artwork exists once in the source and is only cropped differently.
 *
 * @returns The base rect and both wave paths, for use inside an `<svg>`.
 */
function WaveArt() {
  return (
    <>
      <rect
        width="1440"
        height="560"
        x="0"
        y="0"
        {...stylex.props(styles.base)}
      />
      <path d={WAVE_DEEP_PATH} {...stylex.props(styles.waveDeep)} />
      <path d={WAVE_LIGHT_PATH} {...stylex.props(styles.waveLight)} />
    </>
  );
}

/**
 * The wave artwork behind every view: a fixed, full-viewport SVG.
 *
 * Two layers draw the same art with different crops. From 768px up it is
 * centred, so the whole curve shows. Below that, a left-anchored crop keeps a
 * phone's narrow viewport from showing only the empty band between the waves.
 * `slice` in both keeps the proportions, so nothing stretches. The snippet's
 * `preserveAspectRatio="none"` would have stretched it, and its full-white mask
 * did nothing, so both are dropped.
 *
 * It is decorative, so both layers are `aria-hidden` and not focusable. This is
 * a server component: it has no state or effects, and the markup ships with the
 * page, so there is no extra request for the artwork.
 *
 * @returns The two backdrop layers. CSS shows one of them at each width.
 */
export function CricketBackdrop() {
  return (
    <>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 1440 560"
        preserveAspectRatio="xMidYMid slice"
        {...stylex.props(styles.layer, styles.desktopLayer)}
      >
        <WaveArt />
      </svg>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 1440 560"
        preserveAspectRatio="xMidYMax meet"
        {...stylex.props(styles.layer, styles.mobileLayer)}
      >
        <WaveArt />
      </svg>
    </>
  );
}
