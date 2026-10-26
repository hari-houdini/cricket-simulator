import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link LobbyScreen}'s loading and recovery states. */
export const styles = stylex.create({
  loading: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceMd,
  },
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
  },
  link: {
    color: tokens.colorGoldPrimary,
  },
});
