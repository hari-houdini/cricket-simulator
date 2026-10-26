import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { FairPlayScreen } from "./FairPlayScreen";

const meta = {
  component: FairPlayScreen,
  args: {
    franchises: [
      {
        franchiseId: "csk",
        standing: 1,
        lowering: [
          { playerId: "p-1", name: "Ravi Shah", averageEffect: -2.4 },
          { playerId: "p-2", name: "Dev Patel", averageEffect: -0.8 },
        ],
        lifting: [{ playerId: "p-3", name: "Arjun Mehta", averageEffect: -0 }],
      },
      {
        franchiseId: "mi",
        standing: 2,
        lowering: [],
        lifting: [],
      },
    ],
    winnerFranchiseId: "mi",
  },
} satisfies Meta<typeof FairPlayScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Each franchise shows its two columns, and the winner is named in text. */
export const WithStandings: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Ravi Shah: -2.4")).toBeVisible();
    await expect(canvas.getByText("Arjun Mehta: 0.0")).toBeVisible();
    await expect(canvas.getByText(/Fair Play winner/)).toBeVisible();
    await expect(
      canvas.getAllByText("No one pulled the rating down."),
    ).toHaveLength(1);
  },
};

/** Before the first match there are no ratings, and the screen says when it begins. */
export const BeforeTheFirstMatch: Story = {
  args: { franchises: [], winnerFranchiseId: null },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("Fair Play begins after the first match."),
    ).toBeVisible();
  },
};
