import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, userEvent } from "storybook/test";

import { Tabs } from "./Tabs";
import type { TabsProps } from "./Tabs.types";

const fixtureTabs = [
  { id: "upcoming", label: "Upcoming" },
  { id: "development", label: "Development" },
  { id: "completed", label: "Completed" },
];

/**
 * Holds the selected id in state, as a screen would, so a click or arrow key
 * moves the glider. The story's `onChange` mock still sees every change.
 *
 * @param props - The story's args, with `onChange` as the mock to forward to.
 * @returns The controlled tab bar.
 */
function ControlledTabs({ value, onChange, ...rest }: TabsProps) {
  const [selected, setSelected] = useState(value);
  return (
    <Tabs
      {...rest}
      value={selected}
      onChange={(id) => {
        setSelected(id);
        onChange(id);
      }}
    />
  );
}

const meta = {
  component: Tabs,
  render: (args) => <ControlledTabs {...args} />,
  args: {
    "aria-label": "Fixture status",
    tabs: fixtureTabs,
    value: "upcoming",
    onChange: fn(),
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The first tab is selected, so the glider sits at the left end. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("tab", { name: "Upcoming" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  },
};

/** The middle tab is selected, so the glider sits over it. */
export const MiddleSelected: Story = {
  args: { value: "development" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("tab", { name: "Development" }),
    ).toHaveAttribute("aria-selected", "true");
  },
};

/** The last tab is selected, so the glider sits at the right end. */
export const LastSelected: Story = {
  args: { value: "completed" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("tab", { name: "Completed" }),
    ).toHaveAttribute("aria-selected", "true");
  },
};

/**
 * Arrow keys move focus and selection, wrap at both ends, and Home and End jump
 * to the ends. Only the selected tab is in the tab order.
 */
export const Keyboard: Story = {
  play: async ({ canvas, args }) => {
    const upcoming = canvas.getByRole("tab", { name: "Upcoming" });
    upcoming.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(args.onChange).toHaveBeenLastCalledWith("development");
    await expect(
      canvas.getByRole("tab", { name: "Development" }),
    ).toHaveFocus();

    await userEvent.keyboard("{End}");
    await expect(args.onChange).toHaveBeenLastCalledWith("completed");

    await userEvent.keyboard("{ArrowRight}");
    await expect(args.onChange).toHaveBeenLastCalledWith("upcoming");

    await userEvent.keyboard("{ArrowLeft}");
    await expect(args.onChange).toHaveBeenLastCalledWith("completed");

    await userEvent.keyboard("{Home}");
    await expect(args.onChange).toHaveBeenLastCalledWith("upcoming");
    await expect(canvas.getByRole("tab", { name: "Upcoming" })).toHaveFocus();
  },
};

/**
 * At a 320px viewport the tabs fill the bar and every tab stays at least 44px
 * tall, the touch-target minimum from `AGENTS.md`.
 */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvas }) => {
    for (const tab of canvas.getAllByRole("tab")) {
      await expect(tab.getBoundingClientRect().height).toBeGreaterThanOrEqual(
        44,
      );
    }
  },
};
