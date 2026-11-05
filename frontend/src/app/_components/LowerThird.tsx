import * as stylex from "@stylexjs/stylex";

import { styles } from "./LowerThird.styles";

/** The props for {@link LowerThird}. */
type LowerThirdProps = {
  /** The small uppercase label above the title, such as "Step 2 of 8". */
  readonly eyebrow: string;
  /**
   * The page's one `h1`, such as "Your season starts here". Omit it on a page that
   * already has its own heading, so the page keeps a single `h1`.
   */
  readonly title?: string;
};

/**
 * The broadcast title block for a step: a small uppercase label over a large
 * serif title, on a gold edge. The label is a `<p>`, and the title, when given,
 * is the page's only `h1`. The text is what a screen reader hears, in reading order.
 *
 * @param props.eyebrow - The label above the title.
 * @param props.title - The page heading, when the page has no heading of its own.
 * @returns The title block.
 */
export function LowerThird({ eyebrow, title }: LowerThirdProps) {
  return (
    <div {...stylex.props(styles.block)}>
      <p {...stylex.props(styles.eyebrow)}>{eyebrow}</p>
      {title ? <h1 {...stylex.props(styles.title)}>{title}</h1> : null}
    </div>
  );
}
