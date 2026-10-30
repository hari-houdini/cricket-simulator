import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { Button } from "./Button";

const meta = {
  component: Button,
  args: { children: "Bid ₹1cr" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Primary CTA. The play checks the default `type`, which is set in code, not by the caller. */
export const Primary: Story = {
  args: { variant: "primary" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Bid ₹1cr" }),
    ).toHaveAttribute("type", "button");
  },
};

/** Secondary action such as Cancel. Gold text and border on navy. */
export const Secondary: Story = {
  args: { variant: "secondary", children: "Pass" },
};

/** Tertiary action with no surface, such as View Details. */
export const Tertiary: Story = {
  args: { variant: "tertiary", children: "View details" },
};

/**
 * Secondary's four gold edge lines, which the snippet's btn-7 draws on hover. The
 * second pair sits in a frame span, so the play checks all four decorative spans
 * are present. Hover itself needs a real pointer, which a story cannot send, so
 * the drawn result is checked in Chromium.
 */
export const SecondaryHover: Story = {
  args: { variant: "secondary", children: "Pass" },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Pass" });
    await expect(button.querySelectorAll(":scope > span")).toHaveLength(4);
  },
};

/**
 * Tertiary's four corner lines, which the snippet's btn-6 draws on hover, with a
 * transparent surface. The play checks the frame span and that the surface is
 * transparent at rest. As with {@link SecondaryHover}, the hover is checked in
 * Chromium, not here.
 */
export const TertiaryHover: Story = {
  args: { variant: "tertiary", children: "View details" },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "View details" });
    await expect(button.querySelectorAll(":scope > span")).toHaveLength(4);
    await expect(getComputedStyle(button).backgroundColor).toBe(
      "rgba(0, 0, 0, 0)",
    );
  },
};

/** Small, 32px, for compact actions. Below the 44px touch target, so use only where space is tight. */
export const Small: Story = {
  args: { size: "sm", children: "Pass" },
};

/** Large, 56px, for major CTAs such as Confirm Squad. */
export const Large: Story = {
  args: { size: "lg", children: "Confirm squad" },
};

/**
 * Disabled primary takes the filled look of btn-13's hover, and ignores hover and
 * press. The play checks the DOM reflects the prop.
 */
export const Disabled: Story = {
  args: { disabled: true, children: "Start auction" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Start auction" }),
    ).toBeDisabled();
  },
};

/** Disabled secondary: the filled look over the navy surface, with gold text kept for contrast. */
export const DisabledSecondary: Story = {
  args: { variant: "secondary", disabled: true, children: "Pass" },
};

/** Disabled tertiary: the same filled look, so it reads as unavailable and not as a plain link. */
export const DisabledTertiary: Story = {
  args: { variant: "tertiary", disabled: true, children: "View details" },
};

/**
 * A selected button (`aria-pressed="true"`) keeps the btn-11 sheen looping. The
 * play checks the state reaches the DOM, which is what the sheen keys on.
 */
export const Selected: Story = {
  args: { "aria-pressed": true, children: "Captains only" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Captains only" }),
    ).toHaveAttribute("aria-pressed", "true");
  },
};

/**
 * Every variant side by side, in the default, selected, and disabled states. For
 * a visual review, since the hover and press effects need a pointer to show.
 */
export const AllVariants: Story = {
  render: () => (
    <>
      <Button variant="primary">Bid ₹1cr</Button>
      <Button variant="primary" aria-pressed>
        Bid ₹1cr
      </Button>
      <Button variant="primary" disabled>
        Bid ₹1cr
      </Button>
      <Button variant="secondary">Pass</Button>
      <Button variant="secondary" aria-pressed>
        Pass
      </Button>
      <Button variant="secondary" disabled>
        Pass
      </Button>
      <Button variant="tertiary">View details</Button>
      <Button variant="tertiary" aria-pressed>
        View details
      </Button>
      <Button variant="tertiary" disabled>
        View details
      </Button>
    </>
  ),
};

/** Icon-only button. The accessible name must come from `aria-label`. */
export const IconOnly: Story = {
  args: { iconOnly: true, "aria-label": "Add to watchlist", children: "★" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Add to watchlist" }),
    ).toBeVisible();
  },
};

/**
 * Proves the shared StyleX tokens loaded. `toBeVisible` passes on unstyled
 * markup, so this asserts the resolved gold background and navy text.
 */
export const CssCheck: Story = {
  args: { variant: "primary", children: "Submit" },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Submit" });
    const computed = getComputedStyle(button);
    await expect(computed.backgroundColor).toBe("rgb(255, 195, 0)");
    await expect(computed.color).toBe("rgb(0, 29, 61)");
  },
};
