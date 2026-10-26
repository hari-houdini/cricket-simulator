import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent } from "storybook/test";

import { KeyMomentView } from "./KeyMomentView";
import { csKeyMoments } from "./KeyMomentView.mock";

const meta = {
  component: KeyMomentView,
  args: {
    moments: csKeyMoments,
    shown: 2,
    onSkip: fn(),
  },
} satisfies Meta<typeof KeyMomentView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Part way through a match, the shown moments are listed and the skip control is offered. */
export const PartWayThrough: Story = {
  play: async ({ canvas, args }) => {
    await expect(
      canvas.getByText("Wicket 1 falls for CSK in the first innings."),
    ).toBeVisible();
    await expect(canvas.queryByText("CSK win the match.")).toBeNull();
    await userEvent.click(
      canvas.getByRole("button", { name: "Skip to result" }),
    );
    await expect(args.onSkip).toHaveBeenCalledOnce();
  },
};

/** Once every moment has been shown, the result is the last line and there is no skip control. */
export const Finished: Story = {
  args: { shown: csKeyMoments.length },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("CSK win the match.")).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Skip to result" }),
    ).toBeNull();
  },
};
