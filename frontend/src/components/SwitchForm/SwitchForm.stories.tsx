import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { SwitchForm } from "./SwitchForm";
import type { SwitchPanel } from "./SwitchForm.types";

/** The sign-up panel from the design snippet, copy as written. */
const signUpPanel: SwitchPanel = {
  title: "Create Account",
  tabLabel: "Sign up",
  fields: [
    { name: "name", label: "Name", inputType: "text" },
    { name: "email", label: "Email", inputType: "email" },
    { name: "password", label: "Password", inputType: "password" },
  ],
  submitLabel: "SIGN UP",
  prompt: {
    title: "Welcome Back !",
    description:
      "To keep connected with us please login with your personal info",
    switchLabel: "SIGN IN",
  },
};

/** The sign-in panel from the design snippet, copy as written. */
const signInPanel: SwitchPanel = {
  title: "Sign in to Website",
  tabLabel: "Sign in",
  fields: [
    { name: "email", label: "Email", inputType: "email" },
    { name: "password", label: "Password", inputType: "password" },
  ],
  submitLabel: "SIGN IN",
  prompt: {
    title: "Hello Friend !",
    description: "Enter your personal details and start journey with us",
    switchLabel: "SIGN UP",
  },
};

const meta = {
  component: SwitchForm,
  args: {
    "aria-label": "Account",
    signUp: signUpPanel,
    signIn: signInPanel,
    onSubmit: fn(),
  },
} satisfies Meta<typeof SwitchForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens on sign-up, as the design does. The overlay invites the guest to sign in. */
export const SignUp: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Create Account" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("heading", { name: "Welcome Back !" }),
    ).toBeVisible();
  },
};

/** Opens on sign-in. The sign-up form is inert, so it is not reachable by keyboard. */
export const SignIn: Story = {
  args: { initialMode: "signIn" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Sign in to Website" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("form", { name: "Create Account" }),
    ).toHaveAttribute("inert");
  },
};

/**
 * Submitting empty fields shows a message under each one. Each field is marked
 * invalid, so the reason is in text and not only in colour.
 */
export const ValidationErrors: Story = {
  play: async ({ canvas }) => {
    const form = within(canvas.getByRole("form", { name: "Create Account" }));
    await userEvent.click(form.getByRole("button", { name: "SIGN UP" }));

    await expect(form.getByText("Name is required")).toBeVisible();
    await expect(form.getByText("Email is required")).toBeVisible();
    await expect(form.getByLabelText("Name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  },
};

/**
 * Clicking the overlay's switch shows the sign-in form and hides the sign-up form
 * from keyboard and assistive tech.
 */
export const SwitchesPanels: Story = {
  play: async ({ canvas }) => {
    // The inactive form's submit button has the same name, so the overlay's
    // switch is the one outside any form.
    const overlaySwitch = canvas
      .getAllByRole("button", { name: "SIGN IN" })
      .find((button) => button.closest("form") === null);
    if (!overlaySwitch) {
      throw new Error("The overlay switch button was not found.");
    }
    await userEvent.click(overlaySwitch);

    // The form fades in over the card's transition, so wait for it to finish.
    await waitFor(() =>
      expect(
        canvas.getByRole("heading", { name: "Sign in to Website" }),
      ).toBeVisible(),
    );
    await expect(
      canvas.getByRole("form", { name: "Create Account" }),
    ).toHaveAttribute("inert");
  },
};

/**
 * Valid values are passed to `onSubmit` with the mode and the values as typed.
 * The password is typed in full, and the values are not logged or sent anywhere.
 */
export const Submit: Story = {
  play: async ({ canvas, args }) => {
    const form = within(canvas.getByRole("form", { name: "Create Account" }));
    await userEvent.type(form.getByLabelText("Name"), "Asha");
    await userEvent.type(form.getByLabelText("Email"), "asha@example.com");
    await userEvent.type(form.getByLabelText("Password"), "correct-horse");
    await userEvent.click(form.getByRole("button", { name: "SIGN UP" }));

    await expect(args.onSubmit).toHaveBeenCalledWith("signUp", {
      name: "Asha",
      email: "asha@example.com",
      password: "correct-horse",
    });
  },
};

/**
 * At 320px the overlay is hidden and a tab bar switches the forms. Only one form
 * shows at a time.
 */
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("tablist")).toBeVisible();
    await userEvent.click(canvas.getByRole("tab", { name: "Sign in" }));

    await expect(
      canvas.getByRole("form", { name: "Sign in to Website" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("form", { name: "Create Account" }),
    ).toBeNull();
  },
};
