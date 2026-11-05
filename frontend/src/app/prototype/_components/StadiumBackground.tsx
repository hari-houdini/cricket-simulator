import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";

import { DUST } from "./StadiumBackground.const";
import { styles } from "./StadiumBackground.styles";

/**
 * The prototype's animated background: a turf-night field under two slow
 * floodlights, pitch-stripe bands at the foot of the screen, fine grain, and a
 * few specks of floodlit dust rising through it.
 *
 * It is decorative, so it is `aria-hidden` and takes no pointer events. It is
 * fixed behind the content, so it stays put as the page scrolls. Every motion is
 * `transform` or `opacity`, and all of it stops under `prefers-reduced-motion`.
 *
 * Each dust speck's position, size and timing are per-speck values, so they are
 * set as CSS custom properties on the speck, not as StyleX rules.
 *
 * @returns The fixed background layers.
 */
export function StadiumBackground() {
  return (
    <div aria-hidden="true" {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.glowWarm)} />
      <div {...stylex.props(styles.glowChalk)} />
      <div {...stylex.props(styles.stripesFrame)}>
        <div {...stylex.props(styles.stripes)} />
      </div>
      <div {...stylex.props(styles.grain)} />
      <div {...stylex.props(styles.dust)}>
        {DUST.map((speck, index) => (
          <span
            // The list is fixed and never reordered, so its index is a stable key.
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed, never-reordered list
            key={index}
            style={
              {
                left: speck.left,
                top: speck.top,
                width: `${speck.size}px`,
                height: `${speck.size}px`,
                "--speck-duration": `${speck.duration}s`,
                "--speck-delay": `${speck.delay}s`,
              } as CSSProperties
            }
            {...stylex.props(styles.speck)}
          />
        ))}
      </div>
    </div>
  );
}
