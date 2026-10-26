/**
 * Picks the next focusable item when Tab wraps inside a dialog. Keeping focus
 * inside the dialog is what makes a modal usable by keyboard and screen reader.
 *
 * @param current - Index of the focused item, or `-1` when focus is outside the list.
 * @param count - How many focusable items there are.
 * @param backwards - `true` for Shift+Tab, which moves towards the start.
 * @returns The index to focus next, or `-1` when there are no items.
 */
export function nextFocusIndex(
  current: number,
  count: number,
  backwards: boolean,
): number {
  if (count === 0) {
    return -1;
  }
  if (current < 0) {
    return backwards ? count - 1 : 0;
  }
  return backwards ? (current - 1 + count) % count : (current + 1) % count;
}
