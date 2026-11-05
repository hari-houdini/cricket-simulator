import type { Preview } from "@storybook/nextjs-vite";

// Same global styles as the app, so stories render with the StyleX output and
// the design tokens the components depend on.
import * as stylex from "@stylexjs/stylex";

import "../src/app/globals.css";
import { StadiumBackground } from "../src/app/_components/StadiumBackground";
import { styles as appStyles } from "../src/app/layout.styles";
import { GuestSessionProvider } from "../src/components/GuestSessionProvider/GuestSessionProvider";
import { Notifier } from "../src/components/Notifier/Notifier";
import { createMockGameApi } from "../src/services/game-api/mock-game-api";

const preview: Preview = {
  // Every story gets a guest session backed by the seeded mock API. This lives
  // here, not in the stories, because components must not import services.
  // The stadium background is the app's background, so stories render on it too. The
  // toast region is mounted once here, as the app mounts it once in its
  // providers, so a story never has two regions on screen.
  decorators: [
    (Story) => (
      <GuestSessionProvider api={createMockGameApi({ seed: "story" })}>
        <StadiumBackground />
        <Notifier />
        {/* The app's <body> sets the text colour and font. Stories sit in a
            plain wrapper instead, so they take the same base from the same rules. */}
        <div {...stylex.props(appStyles.body)}>
          <Story />
        </div>
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
