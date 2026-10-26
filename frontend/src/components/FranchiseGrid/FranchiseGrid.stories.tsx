import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent } from "storybook/test";

import { twoOwnerLobby, unclaimedLobby } from "../LobbyView/LobbyView.mock";
import { FranchiseGrid } from "./FranchiseGrid";

const meta = {
  component: FranchiseGrid,
  args: {
    lobby: twoOwnerLobby,
    guestId: "asha",
    pending: false,
    onClaim: fn(),
  },
} satisfies Meta<typeof FranchiseGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing claimed yet: every franchise has a claim button. */
export const AllFree: Story = {
  args: { lobby: unclaimedLobby },
  play: async ({ canvas }) => {
    await expect(
      canvas.getAllByRole("button", { name: /^Claim / }),
    ).toHaveLength(10);
  },
};

/** Mixed: the guest's own franchise, a taken one with no button, and the rest free. */
export const MixedTaken: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Your franchise")).toBeInTheDocument();
    await expect(canvas.getByText("Taken by Ravi")).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Claim Mumbai Indians" }),
    ).toBeNull();
    await expect(
      canvas.getByRole("button", { name: "Claim Delhi Capitals" }),
    ).toBeEnabled();
  },
};

/** While a claim is in flight, every claim button is disabled so a second click cannot race the first. */
export const ClaimPending: Story = {
  args: { lobby: unclaimedLobby, pending: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Claim Chennai Super Kings" }),
    ).toBeDisabled();
    await userEvent.click(
      canvas.getByRole("button", { name: "Claim Chennai Super Kings" }),
    );
  },
};
