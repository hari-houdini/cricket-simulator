import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent } from "storybook/test";
import { AuctionView } from "./AuctionView";
import {
  ashaLeads,
  finishedAuction,
  openLot,
  raviLeads,
  STORY_NOW,
} from "./AuctionView.mock";

const meta = {
  component: AuctionView,
  args: {
    auction: openLot,
    guestId: "asha",
    now: STORY_NOW,
    pending: false,
    error: null,
    announcement: "",
    onBid: fn(),
  },
} satisfies Meta<typeof AuctionView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nobody has bid yet, so the button offers the base price. Pressing it passes that amount to the handler. */
export const NoBidsYet: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Bid ₹2.00cr" }));
    await expect(args.onBid).toHaveBeenCalledWith(200);
  },
};

/** Asha holds the lead, so she cannot raise her own bid, and the reason is shown beside the button. */
export const HoldingTheLead: Story = {
  args: { auction: ashaLeads },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Bid ₹2.50cr" }),
    ).toBeDisabled();
    await expect(
      canvas.getByText("You already hold the highest bid on this player."),
    ).toBeInTheDocument();
  },
};

/** Ravi holds the lead, so Asha can outbid at the next step: ₹2.50cr plus ₹50L. */
export const CanOutbid: Story = {
  args: { auction: raviLeads },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Bid ₹3.00cr" }),
    ).toBeEnabled();
  },
};

/** A guest with no purse in this auction sees no bid button, only the reason to join. */
export const NotAnOwner: Story = {
  args: { guestId: "meera" },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button", { name: /^Bid/ })).toBeNull();
    await expect(
      canvas.getByText("Join the lobby to bid on players."),
    ).toBeInTheDocument();
  },
};

/** Once every lot is settled, the screen says the auction is complete. */
export const Complete: Story = {
  args: { auction: finishedAuction },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Auction complete" }),
    ).toBeInTheDocument();
  },
};

/** A refused bid shows its message above the screen, as an alert. */
export const BidRefused: Story = {
  args: {
    error: "That bid is more than your purse has left.",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "That bid is more than your purse has left.",
    );
  },
};
