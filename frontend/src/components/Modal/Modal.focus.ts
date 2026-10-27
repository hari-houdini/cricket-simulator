"use client";

import { type RefObject, useEffect } from "react";

import { nextFocusIndex } from "../../shared/utils/focus-cycle";

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
 * Lists the elements inside a dialog that a Tab press can reach, in document order.
 *
 * @param root - The dialog element to search inside.
 * @returns The focusable elements, possibly empty.
 */
function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Moves Tab focus one step through the dialog, wrapping at either end. Focus that
 * sits on the dialog itself, which is not in the list, starts the cycle.
 *
 * @param root - The dialog element that keeps focus inside it.
 * @param direction - `"forward"` for Tab, `"backward"` for Shift+Tab.
 */
export function cycleFocusWithin(
  root: HTMLElement,
  direction: "forward" | "backward",
): void {
  const focusables = focusableWithin(root);
  const active = document.activeElement;
  const current =
    active instanceof HTMLElement ? focusables.indexOf(active) : -1;
  const nextIndex = nextFocusIndex(current, focusables.length, direction);
  focusables[nextIndex]?.focus();
}

/**
 * Moves focus into the dialog when it opens, and returns focus to whatever had it
 * before when it closes, including when the parent unmounts while open.
 *
 * @param dialogRef - Ref to the dialog element that receives focus on open.
 * @param isOpen - Whether the dialog is open. Nothing happens while it is closed.
 */
export function useModalFocus(
  dialogRef: RefObject<HTMLDivElement | null>,
  isOpen: boolean,
): void {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const opener = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (opener instanceof HTMLElement) {
        opener.focus();
      }
    };
  }, [dialogRef, isOpen]);
}
