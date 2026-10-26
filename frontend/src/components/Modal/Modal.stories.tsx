import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, userEvent } from "storybook/test";

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

/**
 * Opener button that owns the dialog's open state, so the focus story can open
 * and close the real component.
 *
 * @returns The opener button and the dialog it controls.
 */
function FocusHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <Modal title="Confirm squad" open={open} onClose={() => setOpen(false)}>
        <button type="button">Keep squad</button>
        <button type="button">Edit squad</button>
      </Modal>
    </>
  );
}

/**
 * Focus handling. Opening moves focus into the dialog, Tab and Shift+Tab cycle
 * through its controls and wrap at the ends without leaving it, and closing
 * returns focus to the button that opened it.
 */
export const FocusCycle: Story = {
  args: { open: false },
  render: () => <FocusHarness />,
  play: async ({ canvas }) => {
    const opener = canvas.getByRole("button", { name: "Open dialog" });
    await userEvent.click(opener);

    await expect(
      canvas.getByRole("dialog", { name: "Confirm squad" }),
    ).toHaveFocus();

    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Close" })).toHaveFocus();
    await userEvent.tab();
    await expect(
      canvas.getByRole("button", { name: "Keep squad" }),
    ).toHaveFocus();
    await userEvent.tab();
    await expect(
      canvas.getByRole("button", { name: "Edit squad" }),
    ).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Close" })).toHaveFocus();

    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    await expect(
      canvas.getByRole("button", { name: "Edit squad" }),
    ).toHaveFocus();

    await userEvent.click(canvas.getByRole("button", { name: "Close" }));
    await expect(canvas.queryByRole("dialog")).toBeNull();
    await expect(opener).toHaveFocus();
  },
};
