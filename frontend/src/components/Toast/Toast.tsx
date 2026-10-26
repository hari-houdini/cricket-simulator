import * as stylex from "@stylexjs/stylex";

import { toastSchema } from "./Toast.schema";
import { styles } from "./Toast.styles";
import type { ToastProps } from "./Toast.types";

/**
 * A short, non-modal message, such as "Passed on Kohli" after a bid decision.
 *
 * `error` uses `role="alert"`, which interrupts the screen reader right away.
 * The other tones use `role="status"`, which waits for a pause. Toasts never
 * take focus and never block the page.
 *
 * @param props - The tone and message.
 * @returns A `<div>` announced to assistive technology.
 * @throws {ZodError} When the message is empty or the tone is unknown.
 */
export function Toast(props: ToastProps) {
  const parsed = toastSchema.parse(props);

  return (
    <div
      role={parsed.tone === "error" ? "alert" : "status"}
      {...stylex.props(
        styles.base,
        parsed.tone === "info" && styles.toneInfo,
        parsed.tone === "success" && styles.toneSuccess,
        parsed.tone === "warning" && styles.toneWarning,
        parsed.tone === "error" && styles.toneError,
      )}
    >
      {parsed.message}
    </div>
  );
}
