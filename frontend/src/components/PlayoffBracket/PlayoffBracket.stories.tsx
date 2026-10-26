import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { PlayoffBracket } from "./PlayoffBracket";
import { decidedBracket, pendingBracket } from "./PlayoffBracket.mock";

const meta = {
  component: PlayoffBracket,
  args: {
    matches: decidedBracket,
    champion: "csk",
  },
} satisfies Meta<typeof PlayoffBracket>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before the Final is played, the places that are not known yet read "To be decided". */
export const BeforeTheFinal: Story = {
  args: { matches: pendingBracket, champion: null },
  play: async ({ canvas }) => {
    // Qualifier 2 and the Final each have one line with both places unknown.
    await expect(canvas.getAllByText(/To be decided/)).toHaveLength(2);
    await expect(canvas.getAllByText("Not played yet")).toHaveLength(4);
  },
};

/** After the Final, each slot shows its result, and the champion is named. */
export const AfterTheFinal: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("CSK won by 15 runs")).toBeVisible();
    await expect(
      canvas.getByText("Champion: Chennai Super Kings"),
    ).toBeVisible();
  },
};

/**
 * The bracket scrolls inside its own region, so a narrow phone never scrolls the
 * page sideways. The region must take keyboard focus.
 */
export const ScrollRegionIsFocusable: Story = {
  play: async ({ canvas }) => {
    const region = canvas.getByRole("region", { name: "Playoff bracket" });
    await expect(region).toHaveAttribute("tabindex", "0");
    await expect(getComputedStyle(region).overflowX).toBe("auto");
  },
};
