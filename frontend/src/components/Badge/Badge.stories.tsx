import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { Badge } from "./Badge";

const meta = {
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Franchise badge. The abbreviation is text, so the team reads without the swatch. */
export const Team: Story = {
  args: { kind: "team", label: "CSK", color: "#F9CD05" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("CSK")).toBeVisible();
  },
};

/** Player role badge. */
export const RoleBatter: Story = {
  args: { kind: "role", role: "BAT" },
};

/** Wicket-keeper role badge. */
export const RoleWicketKeeper: Story = {
  args: { kind: "role", role: "WK" },
};

/** Available status chip. Green with a text label. */
export const StatusAvailable: Story = {
  args: { kind: "status", status: "available" },
};

/** Sold status chip. The play checks the label, so the state is not conveyed by color alone. */
export const StatusSold: Story = {
  args: { kind: "status", status: "sold" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Sold")).toBeVisible();
  },
};

/** Captain status chip. */
export const StatusCaptain: Story = {
  args: { kind: "status", status: "captain" },
};
