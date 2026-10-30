import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";

import { MatchLogView } from "./MatchLogView";
import { playedFinal } from "./MatchLogView.mock";

const meta = {
  component: MatchLogView,
  args: {
    title: "Final: CSK v MI",
    result: playedFinal,
    live: false,
    onDone: fn(),
  },
} satisfies Meta<typeof MatchLogView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** While the log is revealed, the result and the scorecard wait, and a guest can skip ahead. */
export const Revealing: Story = {
  args: { live: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Skip to result" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Scorecard" }),
    ).toBeNull();
  },
};

/** Once the log has finished, the result shows, and the scorecard opens from an accordion. */
export const Finished: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText("Chennai Super Kings won.")).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Skip to result" }),
    ).toBeNull();
    const scorecard = canvas.getByRole("button", { name: "Scorecard" });
    await expect(scorecard).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(scorecard);
    await expect(scorecard).toHaveAttribute("aria-expanded", "true");
    await expect(
      canvas.getByRole("table", { name: "Final: CSK v MI scorecard" }),
    ).toBeVisible();
    await expect(
      canvas.getByText("Man of the Match: CSK Opener A, Chennai Super Kings"),
    ).toBeVisible();
  },
};
