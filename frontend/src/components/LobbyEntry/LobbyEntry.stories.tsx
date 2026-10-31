import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { LobbyEntry } from "./LobbyEntry";

const meta = {
  component: LobbyEntry,
  parameters: {
    // The form calls useRouter, which needs the App Router context in Storybook.
    nextjs: { appDirectory: true },
  },
} satisfies Meta<typeof LobbyEntry>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens on create. The overlay invites the guest to join, and both panels are in the DOM. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Create a lobby" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("heading", { name: "Join a lobby" }),
    ).toBeInTheDocument();
  },
};

/** A wrong code is reported above the form, and the typed values stay. */
export const UnknownCode: Story = {
  play: async ({ canvas }) => {
    // The join panel is inert until the overlay switches to it. The overlay's
    // button is the only button with this name, since the panel's submit is
    // "Join lobby".
    await userEvent.click(canvas.getByRole("button", { name: "Join a lobby" }));
    const joinForm = within(canvas.getByRole("form", { name: "Join a lobby" }));
    await userEvent.type(joinForm.getByLabelText("Lobby code"), "ZZZZZZ");
    await userEvent.type(joinForm.getByLabelText("Your name"), "Ravi");
    await userEvent.click(joinForm.getByRole("button", { name: "Join lobby" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "No lobby has that code.",
    );
    await expect(joinForm.getByLabelText("Lobby code")).toHaveValue("ZZZZZZ");
  },
};
