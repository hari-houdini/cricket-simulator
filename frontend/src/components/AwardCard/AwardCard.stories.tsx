import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { AwardCard } from "./AwardCard";

const meta = {
  component: AwardCard,
  args: {
    title: "Orange Cap",
    description: "Most runs in the season so far.",
    winner: {
      label: "Ruturaj Gaikwad",
      detail: "Chennai Super Kings · 412 runs",
    },
    runnerUp: {
      label: "Virat Kohli",
      detail: "Royal Challengers Bengaluru · 398 runs",
    },
  },
} satisfies Meta<typeof AwardCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Once two players have earned the places, both are named with their stats. */
export const Decided: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Ruturaj Gaikwad")).toBeVisible();
    await expect(
      canvas.getByText("Chennai Super Kings · 412 runs"),
    ).toBeVisible();
    await expect(canvas.getByText("Virat Kohli")).toBeVisible();
  },
};

/** Before any match is played, both places say they are still open. */
export const BeforeAnyMatch: Story = {
  args: { winner: null, runnerUp: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Not decided yet")).toBeVisible();
    await expect(canvas.getByText("No runner-up yet")).toBeVisible();
  },
};
