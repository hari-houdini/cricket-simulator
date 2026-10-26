import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { FixtureList } from "./FixtureList";
import { roundInProgress } from "./FixtureList.mock";

const meta = {
  component: FixtureList,
  args: {
    rows: roundInProgress,
  },
} satisfies Meta<typeof FixtureList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A round in progress shows the finished match with its scores, the live one as in play, and the rest as yet to play. */
export const RoundInProgress: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("CSK 176/5 · MI 158/8")).toBeVisible();
    await expect(canvas.getByText("CSK won by 18 runs")).toBeVisible();
    await expect(canvas.getByText("In play…")).toBeVisible();
    await expect(canvas.getByText("Yet to play")).toBeVisible();
  },
};
