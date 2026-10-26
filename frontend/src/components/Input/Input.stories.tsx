import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { Input } from "./Input";

const meta = {
  component: Input,
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Text field. The play checks the label is linked to the control, so the field has a name. */
export const Text: Story = {
  args: {
    kind: "text",
    id: "lobby-id",
    label: "Lobby ID",
    placeholder: "e.g. ABC123",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Lobby ID")).toBeVisible();
  },
};

/** Dropdown for choosing a franchise. */
export const Select: Story = {
  args: {
    kind: "select",
    id: "franchise",
    label: "Franchise",
    options: [
      { value: "csk", label: "Chennai Super Kings" },
      { value: "mi", label: "Mumbai Indians" },
      { value: "rcb", label: "Royal Challengers Bengaluru" },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Franchise")).toBeVisible();
  },
};

/** Toggle. The play checks it is exposed as a checkbox with its label as the name. */
export const Toggle: Story = {
  args: {
    kind: "toggle",
    id: "captain-only",
    label: "Show captain only",
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("checkbox", { name: "Show captain only" }),
    ).toBeVisible();
  },
};

/** Disabled text field. */
export const Disabled: Story = {
  args: {
    kind: "text",
    id: "lobby-id-disabled",
    label: "Lobby ID",
    disabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Lobby ID")).toBeDisabled();
  },
};
