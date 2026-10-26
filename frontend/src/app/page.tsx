import * as stylex from "@stylexjs/stylex";

import { LobbyEntry } from "../components/LobbyEntry/LobbyEntry";
import { styles } from "./page.styles";

/**
 * Home page. A new guest creates a lobby or joins one by its code, and both
 * paths open the lobby screen.
 *
 * @returns The home page content, rendered inside the layout's `<main>`.
 */
export default function Home() {
  return (
    <>
      <h1 {...stylex.props(styles.heading)}>Your season starts here</h1>
      <LobbyEntry />
    </>
  );
}
