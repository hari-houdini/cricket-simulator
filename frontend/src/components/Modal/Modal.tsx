import * as stylex from "@stylexjs/stylex";
import { type KeyboardEvent, useEffect, useId, useRef } from "react";

import { nextFocusIndex } from "../../shared/utils/focus-cycle";
import { modalSchema } from "./Modal.schema";
import { styles } from "./Modal.styles";
import type { ModalProps } from "./Modal.types";

/** Elements a Tab press can land on inside the dialog. Disabled controls are skipped. */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * A dialog that interrupts the page for a decision, such as confirming a squad.
 *
 * The dialog is named by its title through `aria-labelledby`, so screen readers
 * announce it. When it opens, focus moves into the dialog, and Tab and Shift+Tab
 * cycle inside it, so keyboard users cannot reach the page behind. When it closes,
 * focus returns to the element that had it before. Escape and the close button both
 * call `onClose`. Nothing renders while `open` is false.
 *
 * @param props - Title, open state, close handler, and dialog content.
 * @returns The dialog when open, otherwise `null`.
 * @throws {ZodError} When the title is empty.
 */
export function Modal({ title, open, onClose, children }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const parsed = modalSchema.parse({ title, open });
  const isOpen = parsed.open;

  // Hooks run before the early return so their order never changes. Focus is
  // remembered on open and restored on close, including when the parent unmounts.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const returnTo = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (returnTo instanceof HTMLElement) {
        returnTo.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) {
      return;
    }
    const items = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next = nextFocusIndex(current, items.length, event.shiftKey);
    event.preventDefault();
    items[next]?.focus();
  }

  return (
    <div {...stylex.props(styles.backdrop)}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
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
