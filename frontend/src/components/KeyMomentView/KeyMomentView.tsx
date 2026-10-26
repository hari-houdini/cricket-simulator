"use client";

import * as stylex from "@stylexjs/stylex";

import { describeKeyMoment } from "../../shared/utils/key-moments";
import { Button } from "../Button/Button";
import { styles } from "./KeyMomentView.styles";
import type { KeyMomentViewProps } from "./KeyMomentView.types";

/**
 * The key moments of a playoff match, shown one after another. A guest can skip
 * to the result at any time, which shows every moment at once.
 *
 * @param props.moments - Every key moment in the match, in order.
 * @param props.shown - How many have been shown so far.
 * @param props.onSkip - Called when the guest skips to the result.
 * @returns The moments shown so far, and a skip control until they are all shown.
 */
export function KeyMomentView({ moments, shown, onSkip }: KeyMomentViewProps) {
  const visible = moments.slice(0, shown);
  const finished = shown >= moments.length;

  return (
    <section aria-label="Key moments" {...stylex.props(styles.panel)}>
      <ol aria-live="polite" {...stylex.props(styles.list)}>
        {visible.map((moment, index) => (
          <li
            key={`${index}-${describeKeyMoment(moment)}`}
            {...stylex.props(
              styles.item,
              index === visible.length - 1 && styles.latest,
            )}
          >
            {describeKeyMoment(moment)}
          </li>
        ))}
      </ol>
      {finished ? null : <Button onClick={onSkip}>Skip to result</Button>}
    </section>
  );
}
