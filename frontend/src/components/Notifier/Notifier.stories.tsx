import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Button } from "../Button/Button";
import { Notifier, notify, useConnectionNotice } from "./Notifier";

/**
 * Clears every notice when the story unmounts. Sonner keeps its queue at module
 * scope, so without this a notice from one story would still be on screen when
 * the next story runs.
 */
function useClearNoticesOnUnmount() {
  useEffect(() => {
    return () => {
      toast.dismiss();
    };
  }, []);
}

/**
 * The toast region with a button for each tone. Each notice floats over the
 * page, so the buttons never move when one appears.
 *
 * @returns The region and the demo buttons.
 */
function NotifierDemo() {
  useClearNoticesOnUnmount();
  return (
    <>
      <Button
        variant="secondary"
        onClick={() =>
          notify({
            tone: "success",
            message: "Squad saved. The season is starting.",
          })
        }
      >
        Show success
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          notify({
            tone: "error",
            message: "That bid is more than your purse has left.",
          })
        }
      >
        Show error
      </Button>
    </>
  );
}

/**
 * A connection notice that stays up while its message is set. The button clears
 * the message, which stands in for a read that succeeds again.
 *
 * @returns The region, the notice, and the button that restores the connection.
 */
function ConnectionDemo() {
  const [message, setMessage] = useState<string | null>(
    "Connection unstable. Retrying...",
  );
  useConnectionNotice(message);
  useClearNoticesOnUnmount();
  return (
    <Button variant="secondary" onClick={() => setMessage(null)}>
      Connection restored
    </Button>
  );
}

const meta = {
  component: Notifier,
  render: () => <NotifierDemo />,
} satisfies Meta<typeof Notifier>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A refused action raises an error notice as an alert, so a screen reader announces it at once. */
export const RefusedAction: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show error" }));
    const notice = await canvas.findByText(
      "That bid is more than your purse has left.",
    );
    await expect(notice).toHaveAttribute("role", "alert");
  },
};

/** A confirmation is a status notice, which waits for a pause before it is read out. */
export const Confirmation: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show success" }));
    const notice = await canvas.findByText(
      "Squad saved. The season is starting.",
    );
    await expect(notice).toHaveAttribute("role", "status");
  },
};

/** A dropped connection stays on screen until the next read succeeds, then it clears. */
export const ConnectionNotice: Story = {
  render: () => <ConnectionDemo />,
  play: async ({ canvas }) => {
    const notice = await canvas.findByText("Connection unstable. Retrying...");
    await expect(notice).toHaveAttribute("role", "alert");
    await userEvent.click(
      canvas.getByRole("button", { name: "Connection restored" }),
    );
    await waitFor(() => {
      expect(
        within(document.body).queryByText("Connection unstable. Retrying..."),
      ).toBeNull();
    });
  },
};
