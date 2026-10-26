import * as stylex from "@stylexjs/stylex";
import { type KeyboardEvent, useId } from "react";

import { modalSchema } from "./Modal.schema";
import { styles } from "./Modal.styles";
import type { ModalProps } from "./Modal.types";

/**
 * A dialog that interrupts the page for a decision, such as confirming a squad.
 *
 * The dialog is named by its title through `aria-labelledby`, so screen readers
 * announce it. Escape and the close button both call `onClose`. Nothing renders
 * while `open` is false.
 *
 * Known gap: focus is not yet moved into the dialog or trapped inside it. Callers
 * should place a control inside `children` so keyboard users have somewhere to go.
 *
 * @param props - Title, open state, close handler, and dialog content.
 * @returns The dialog when open, otherwise `null`.
 * @throws {ZodError} When the title is empty.
 */
export function Modal({ title, open, onClose, children }: ModalProps) {
  const titleId = useId();
  const parsed = modalSchema.parse({ title, open });

  if (!parsed.open) {
    return null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onClose();
    }
  }

  return (
    <div {...stylex.props(styles.backdrop)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        {...stylex.props(styles.dialog)}
      >
        <header {...stylex.props(styles.header)}>
          <h2 id={titleId} {...stylex.props(styles.title)}>
            {parsed.title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            {...stylex.props(styles.closeButton)}
          >
            ✕
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
