import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { ErrorBanner } from "./ErrorBanner";

const meta = {
  component: ErrorBanner,
} satisfies Meta<typeof ErrorBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default connection message. The play checks it is announced as an alert. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "Connection unstable. Retrying...",
    );
  },
};

/** A custom message for another kind of failure. */
export const Custom: Story = {
  args: { message: "Could not save your squad. Try again." },
};
