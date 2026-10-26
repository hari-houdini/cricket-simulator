import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Card } from "./Card";

const meta = {
  component: Card,
  args: { children: "Squad 9/15 · ₹28.5cr left" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default surface for primary content. */
export const Raised: Story = {
  args: { elevation: "raised" },
};

/** Lightweight surface for secondary content. */
export const Subtle: Story = {
  args: { elevation: "subtle" },
};
