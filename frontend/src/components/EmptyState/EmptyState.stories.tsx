import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Button } from "../Button/Button";

import { EmptyState } from "./EmptyState";

const meta = {
  component: EmptyState,
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default copy and the brand sphere. The play checks the sphere renders, since
 * it is the only visual when no `icon` is passed.
 */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId("empty-state-sphere")).toBeVisible();
  },
};

/**
 * With a retry action. The play checks the action slot renders its control, so
 * the user has a way to recover from an empty result.
 */
export const WithRetry: Story = {
  args: {
    action: <Button variant="primary">Retry</Button>,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Retry" })).toBeVisible();
  },
};

/** A custom icon replaces the default sphere. The play checks the sphere is gone. */
export const CustomIcon: Story = {
  args: {
    icon: <span>🏏</span>,
    title: "No bids yet",
    description: "Be the first to bid on this player.",
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByTestId("empty-state-sphere")).toBeNull();
  },
};
