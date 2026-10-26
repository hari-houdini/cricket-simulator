import * as stylex from "@stylexjs/stylex";

import { tokens } from "../shared/const/tokens.stylex";

/**
 * Styles for the home page content inside the layout's `<main>`.
 */
export const styles = stylex.create({
  heading: {
    fontFamily: tokens.fontSerif,
    fontSize: "2rem",
    fontWeight: 700,
    marginBlock: `0 ${tokens.spaceLg}`,
  },
});
