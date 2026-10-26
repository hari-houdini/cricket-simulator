import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { LobbyView } from "./LobbyView";
import { fullLobby, twoOwnerLobby, unclaimedLobby } from "./LobbyView.mock";

const meta = {
  component: LobbyView,
  args: {
    lobby: twoOwnerLobby,
    guestId: "asha",
    shareUrl: "https://example.test/lobby/ABC123",
    pending: false,
    error: null,
    onClaim: fn(),
    onJoin: fn(),
    onStart: fn(),
    onRoundAdvanced: fn(),
  },
} satisfies Meta<typeof LobbyView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The guest already owns a franchise, so the grid is shown in place of the join form. */
export const Owner: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Pick your franchise" }),
    ).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Join lobby" }),
    ).toBeNull();
  },
};

/** A guest who has not joined sees the join form. Submitting it passes their name to the handler. */
export const JoinByLink: Story = {
  args: { guestId: "meera" },
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByLabelText("Your name"), "Meera");
    await userEvent.click(canvas.getByRole("button", { name: "Join lobby" }));
    await expect(args.onJoin).toHaveBeenCalledWith("Meera");
  },
};

/** An owner who has not picked a franchise yet, with the grid ready to claim from. */
export const ChooseFranchise: Story = {
  args: { lobby: unclaimedLobby },
  play: async ({ canvas, args }) => {
    await userEvent.click(
      canvas.getByRole("button", { name: "Claim Chennai Super Kings" }),
    );
    await expect(args.onClaim).toHaveBeenCalledWith("csk");
  },
};

/** A lobby with all ten owners. A guest who has not joined is told it is full. */
export const FullLobby: Story = {
  args: { lobby: fullLobby, guestId: "meera" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(
        "This lobby is full. Every franchise already has an owner.",
      ),
    ).toBeInTheDocument();
  },
};

/** A failed action leaves the lobby on screen and shows the message above it. */
export const ActionFailed: Story = {
  args: {
    error: "Another owner already holds that franchise. Pick a free one.",
  },
  play: async ({ canvas }) => {
    await expect(
      within(canvas.getByRole("alert")).getByText(
        "Another owner already holds that franchise. Pick a free one.",
      ),
    ).toBeInTheDocument();
  },
};
