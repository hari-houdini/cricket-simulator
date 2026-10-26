import * as stylex from "@stylexjs/stylex";

import { tokens } from "../shared/const/tokens.stylex";

/**
 * Document-level styles for the root layout.
 *
 * The app is dark-only, so `color-scheme` is fixed to `dark` and the browser's
 * own form controls and scrollbars match the palette.
 */
export const styles = stylex.create({
  root: {
    colorScheme: "dark",
    height: "100%",
  },
  body: {
    backgroundColor: tokens.colorBase,
    color: tokens.colorText,
    fontFamily: tokens.fontSans,
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    WebkitFontSmoothing: "antialiased",
  },
});
