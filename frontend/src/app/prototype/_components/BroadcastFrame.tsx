import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { styles } from "./BroadcastFrame.styles";

/** The props for {@link BroadcastFrame}. */
type BroadcastFrameProps = {
  /** The step the guest is on, shown in the bar so the journey reads as a broadcast run. */
  readonly stage: string;
  /** The step's content. */
  readonly children: ReactNode;
};

/**
 * The prototype's broadcast strip. A live dot, the prototype's name and the
 * current stage, set on one bar above the step's content, like a channel's on-air
 * graphic. The bar is plain text, so it reads the same to a screen reader.
 *
 * The root layout already has the app's header, so the bar does not repeat the
 * wordmark. It is a `<div>`, not a `<header>`, to keep one banner landmark per page.
 *
 * @param props.stage - The step's name, such as "Lobby entry".
 * @param props.children - The step's content.
 * @returns The bar followed by the content, as siblings in the layout's column.
 */
export function BroadcastFrame({ stage, children }: BroadcastFrameProps) {
  return (
    <>
      <div {...stylex.props(styles.bar)}>
        <span {...stylex.props(styles.live)}>
          <span aria-hidden="true" {...stylex.props(styles.dot)} />
          On air
        </span>
        <span {...stylex.props(styles.stage)}>Prototype · {stage}</span>
      </div>
      {children}
    </>
  );
}
