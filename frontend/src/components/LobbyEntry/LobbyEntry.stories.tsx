import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { createMockGameApi } from "../../services/game-api/mock-game-api";
import { GuestSessionProvider } from "../GuestSessionProvider/GuestSessionProvider";
import { LobbyEntry } from "./LobbyEntry";

const meta = {
  component: LobbyEntry,
  parameters: {
    // The form calls useRouter, which needs the App Router context in Storybook.
    nextjs: { appDirectory: true },
  },
  decorators: [
    (Story) => (
      <GuestSessionProvider api={createMockGameApi({ seed: "story" })}>
        <Story />
      </GuestSessionProvider>
    ),
  ],
} satisfies Meta<typeof LobbyEntry>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Both forms render side by side from 768px. Entering a name and creating a lobby leaves the forms in place until navigation. */
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

/** A wrong code is reported above the forms, and the typed values stay. */
export const UnknownCode: Story = {
  play: async ({ canvas }) => {
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
