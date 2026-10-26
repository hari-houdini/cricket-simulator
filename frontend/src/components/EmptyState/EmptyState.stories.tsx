import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { EmptyState } from "./EmptyState";

const meta = {
  component: EmptyState,
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default copy with no action. */
export const Default: Story = {};

/**
 * With a retry action. The play checks the action slot renders its control, so
 * the user has a way to recover from an empty result.
 */
export const WithRetry: Story = {
  args: {
    action: <button type="button">Retry</button>,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Retry" })).toBeVisible();
  },
};
