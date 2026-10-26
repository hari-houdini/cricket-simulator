import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { Skeleton } from "./Skeleton";

const meta = {
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A text-line placeholder. The play checks it is hidden from assistive technology. */
export const Line: Story = {
  args: { width: "60%", height: "16px" },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector('[aria-hidden="true"]'),
    ).not.toBeNull();
  },
};

/** A card-sized placeholder. */
export const Card: Story = {
  args: { width: "100%", height: "96px" },
};
