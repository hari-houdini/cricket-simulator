"use client";

import * as stylex from "@stylexjs/stylex";
import type { KeyboardEvent } from "react";
import { useRef } from "react";

import { focusRing } from "../../shared/const/focus-ring.styles";
import { tabsSchema } from "./Tabs.schema";
import { styles } from "./Tabs.styles";
import type { TabsProps } from "./Tabs.types";

/**
 * The index focus moves to for a navigation key, or `null` when the key does
 * nothing here. The ends wrap, as a native radio group does, so arrow keys
 * never dead-end.
 *
 * @param key - The `KeyboardEvent.key` value.
 * @param current - The index of the tab the key was pressed on.
 * @param count - How many tabs the bar has.
 * @returns The index to move to, or `null` for any other key.
 */
function targetIndex(
  key: string,
  current: number,
  count: number,
): number | null {
  switch (key) {
    case "ArrowRight":
      return (current + 1) % count;
    case "ArrowLeft":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/**
 * A segmented tab bar with a sliding highlight behind the selected tab.
 *
 * The tabs are buttons in a `tablist`, so keyboard users can reach them. Arrow
 * keys, Home and End move focus and select the tab they land on, as the radio
 * group in the original design did. Only the selected tab sits in the tab order.
 *
 * The component is controlled: the parent keeps `value` and updates it in
 * `onChange`. Render the panel for the selected tab outside this component.
 *
 * @param props - The tabs, the selected id, the group's accessible name, and the change handler.
 * @returns The tab bar.
 * @throws {ZodError} When there are fewer than two tabs, ids repeat, or `value` matches no tab.
 */
export function Tabs({
  tabs,
  value,
  onChange,
  "aria-label": ariaLabel,
}: TabsProps) {
  tabsSchema.parse({ tabs, value, "aria-label": ariaLabel });

  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = tabs.findIndex((tab) => tab.id === value);

  /**
   * Passes a new id to `onChange`. Selecting the tab already selected does
   * nothing, so the parent sees only real changes.
   *
   * @param id - The id of the tab to select.
   */
  const select = (id: string) => {
    if (id !== value) {
      onChange(id);
    }
  };

  /**
   * Moves focus and selection for a navigation key pressed on a tab.
   *
   * @param event - The keydown event from the tab button.
   * @param index - The position of the tab the key was pressed on.
   */
  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const next = targetIndex(event.key, index, tabs.length);
    if (next === null) {
      return;
    }
    const nextTab = tabs[next];
    if (!nextTab) {
      return;
    }
    event.preventDefault();
    buttons.current[next]?.focus();
    select(nextTab.id);
  };

  return (
    <div {...stylex.props(styles.bar)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        {...stylex.props(styles.track)}
      >
        <span
          aria-hidden="true"
          {...stylex.props(
            styles.glider,
            styles.gliderPosition(tabs.length, selectedIndex),
          )}
        />
        {tabs.map((tab, index) => {
          const isSelected = tab.id === value;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              type="button"
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => select(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              {...stylex.props(
                styles.tab,
                isSelected && styles.tabSelected,
                focusRing.ring,
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
