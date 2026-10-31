import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { CricketBackdrop } from "./CricketBackdrop";

const meta = {
  component: CricketBackdrop,
} satisfies Meta<typeof CricketBackdrop>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The backdrop on its own. The preview decorator also renders one behind every
 * story, so this story checks the layer is present and hidden from assistive
 * technology, and not that it looks any particular way.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const layer = canvasElement.querySelector("svg[aria-hidden='true']");
    await expect(layer).not.toBeNull();
  },
};
