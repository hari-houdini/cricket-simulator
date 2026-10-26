import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent } from "storybook/test";

import { SquadPicker } from "./SquadPicker";
import {
  draftSquad,
  legalXi,
  lockedSquad,
  nameOf,
  usedSubstitutionSquad,
} from "./SquadPicker.mock";

const meta = {
  component: SquadPicker,
  args: {
    squad: draftSquad,
    pending: false,
    error: null,
    onSave: fn(),
    onSubstitute: fn(),
  },
} satisfies Meta<typeof SquadPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Before the XI is chosen, Save is disabled and the picker names the first unmet rule. */
export const ChoosingTheXi: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Save starting XI" }),
    ).toBeDisabled();
    await expect(canvas.getByText(/Pick exactly 11 players/)).toBeVisible();
  },
};

/** Choosing a legal XI, with a captain and a vice-captain, enables Save and saves the selection. */
export const BuildingALegalXi: Story = {
  play: async ({ canvas, args }) => {
    for (const id of legalXi.playerIds) {
      await userEvent.click(
        canvas.getByRole("button", { name: `Add ${nameOf(id)} to XI` }),
      );
    }
    await userEvent.click(
      canvas.getByRole("button", { name: `Captain: ${nameOf("bat1")}` }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: `Vice-captain: ${nameOf("b1")}` }),
    );

    const save = canvas.getByRole("button", { name: "Save starting XI" });
    await expect(save).toBeEnabled();
    await userEvent.click(save);
    await expect(args.onSave).toHaveBeenCalledWith({
      playerIds: legalXi.playerIds,
      captainId: "bat1",
      viceCaptainId: "b1",
    });
  },
};

/** After the first match the XI is read-only, and the free substitution takes one XI player for one bench player. */
export const LockedWithSubstitution: Story = {
  args: { squad: lockedSquad },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText("Starting XI is locked")).toBeVisible();
    await userEvent.selectOptions(canvas.getByLabelText("Player out"), "bat5");
    await userEvent.selectOptions(canvas.getByLabelText("Player in"), "bat6");
    await userEvent.click(
      canvas.getByRole("button", { name: "Make substitution" }),
    );
    await expect(args.onSubstitute).toHaveBeenCalledWith("bat5", "bat6");
  },
};

/** Once the free substitution is used, the form is replaced with a note. */
export const SubstitutionUsed: Story = {
  args: { squad: usedSubstitutionSquad },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText("You have used your free substitution this season."),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("button", { name: "Make substitution" }),
    ).toBeNull();
  },
};
