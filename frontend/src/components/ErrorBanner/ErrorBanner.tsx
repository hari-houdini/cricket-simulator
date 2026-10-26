import * as stylex from "@stylexjs/stylex";

import { errorBannerSchema } from "./ErrorBanner.schema";
import { styles } from "./ErrorBanner.styles";
import type { ErrorBannerProps } from "./ErrorBanner.types";

/**
 * A persistent notice at the top of the screen when the connection is unstable.
 *
 * It uses `role="alert"` so assistive technology announces it. The warning
 * symbol is decorative because the message already says what is wrong.
 *
 * @param props - The message to show.
 * @returns A full-width `<div>` announced as an alert.
 * @throws {ZodError} When the message is empty.
 */
export function ErrorBanner(props: ErrorBannerProps) {
  const parsed = errorBannerSchema.parse(props);

  return (
    <div role="alert" {...stylex.props(styles.base)}>
      <span aria-hidden="true">⚠</span>
      <span>{parsed.message}</span>
    </div>
  );
}
