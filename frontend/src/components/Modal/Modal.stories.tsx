import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";

import { Modal } from "./Modal";

const meta = {
  component: Modal,
  args: { onClose: fn(), title: "Confirm squad" },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Open dialog. The play checks the dialog is named by its title, which is what
 * screen readers announce.
 */
export const Open: Story = {
  args: {
    open: true,
    children: "Lock in these 11 players for the first match?",
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("dialog", { name: "Confirm squad" }),
    ).toBeVisible();
  },
};

/** Closed modal renders nothing. The play checks there is no dialog in the DOM. */
export const Closed: Story = {
  args: { open: false },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("dialog")).toBeNull();
  },
};
