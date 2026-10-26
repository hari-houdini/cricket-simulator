import * as stylex from "@stylexjs/stylex";

import { EmptyState } from "../components/EmptyState/EmptyState";
import { styles } from "./page.styles";

/**
 * Home page. Until lobbies are built (phase 1), it shows the empty state that
 * a new guest sees: no lobby yet, and how to get one.
 *
 * @returns The home page content, rendered inside the layout's `<main>`.
 */
export default function Home() {
  return (
    <>
      <h1 {...stylex.props(styles.heading)}>Your season starts here</h1>
      <EmptyState
        title="No lobby yet"
        description="Create a lobby, or join one with its code, to start a season with friends."
      />
    </>
  );
}
