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
 * Hover reveals the gold underline. The play checks the compiled `:hover::after`
 * rule draws the underline to `scaleX(1)`. It reads the stylesheet rather than
 * a real hover, because `userEvent.hover` does not set `:hover` in this browser
 * run. StyleX wraps rules in `@layer`, so the match is on the rule text.
 */
export const TertiaryHover: Story = {
  args: { variant: "tertiary", children: "View details" },
  play: async () => {
    const rules = Array.from(document.styleSheets).flatMap((sheet) =>
      Array.from(sheet.cssRules).map((rule) => rule.cssText),
    );
    await expect(
      rules.some(
        (text) =>
          text.includes(":hover::after") &&
          text.includes("transform: scaleX(1)"),
      ),
    ).toBe(true);
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

/** Disabled buttons are opacity 50% and not interactive. The play checks the DOM reflects the prop. */
export const Disabled: Story = {
  args: { disabled: true, children: "Start auction" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Start auction" }),
    ).toBeDisabled();
  },
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
