import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link AuctionPanel}'s loading state. */
export const styles = stylex.create({
  loading: {
    display: "block",
    color: tokens.colorText,
  },
});
