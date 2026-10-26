import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { Toast } from "./Toast";

const meta = {
  component: Toast,
  args: { message: "Passed on Virat Kohli" },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Neutral information, the default tone. */
export const Info: Story = {
  args: { tone: "info" },
};

/** Success confirmation. */
export const Success: Story = {
  args: { tone: "success", message: "Squad locked in" },
};

/** Warning, such as a bid that is about to close. */
export const Warning: Story = {
  args: { tone: "warning", message: "Five seconds left" },
};

/** Error is announced as an alert. The play checks the role, which is what assistive technology uses. */
export const ErrorTone: Story = {
  args: { tone: "error", message: "Bid rejected: purse too low" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Bid rejected: purse too low",
    );
  },
};
