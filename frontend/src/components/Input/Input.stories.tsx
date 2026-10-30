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

/**
 * Password field. The play checks the value is masked, so the characters are not
 * shown on screen.
 */
export const Password: Story = {
  args: {
    kind: "text",
    id: "password",
    label: "Password",
    inputType: "password",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
  },
};

/**
 * Text field with an error. The play checks the field is marked invalid and that
 * its message is linked to it, so a screen reader reads the reason with the field.
 */
export const WithError: Story = {
  args: {
    kind: "text",
    id: "email",
    label: "Email",
    inputType: "email",
    error: "Enter an email address, like name@example.com.",
  },
  play: async ({ canvas }) => {
    const field = canvas.getByLabelText("Email");
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toHaveAccessibleDescription(
      "Enter an email address, like name@example.com.",
    );
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
