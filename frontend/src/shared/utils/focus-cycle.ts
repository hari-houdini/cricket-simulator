/**
 * Picks the next focusable item when Tab wraps inside a dialog. Keeping focus
 * inside the dialog is what makes a modal usable by keyboard and screen reader.
 *
 * @param current - Index of the focused item, or `-1` when focus is outside the list.
 * @param count - How many focusable items there are.
 * @param direction - `"forward"` for Tab, `"backward"` for Shift+Tab.
 * @returns The index to focus next, or `-1` when there are no items.
 */
export function nextFocusIndex(
  current: number,
  count: number,
  direction: "forward" | "backward",
): number {
  if (count === 0) {
    return -1;
  }
  const backward = direction === "backward";
  if (current < 0) {
    return backward ? count - 1 : 0;
  }
  return backward ? (current - 1 + count) % count : (current + 1) % count;
}
