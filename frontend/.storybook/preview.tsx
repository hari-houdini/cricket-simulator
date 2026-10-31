import type { Preview } from "@storybook/nextjs-vite";

// Same global styles as the app, so stories render with the StyleX output and
// the design tokens the components depend on.
import "../src/app/globals.css";
import { CricketBackdrop } from "../src/components/CricketBackdrop/CricketBackdrop";
import { GuestSessionProvider } from "../src/components/GuestSessionProvider/GuestSessionProvider";
import { createMockGameApi } from "../src/services/game-api/mock-game-api";

const preview: Preview = {
  // Every story gets a guest session backed by the seeded mock API. This lives
  // here, not in the stories, because components must not import services.
  // The backdrop is the app's background, so stories render on it too.
  decorators: [
    (Story) => (
      <GuestSessionProvider api={createMockGameApi({ seed: "story" })}>
        <CricketBackdrop />
        <Story />
      </GuestSessionProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;
