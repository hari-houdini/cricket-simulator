import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link EmptyState}: a centered stack with generous spacing. */
export const styles = stylex.create({
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: tokens.spaceSm,
    paddingBlock: tokens.space2xl,
    paddingInline: tokens.spaceMd,
    color: tokens.colorText,
    fontFamily: tokens.fontSans,
  },
  title: {
    fontFamily: tokens.fontSerif,
    fontSize: "24px",
    fontWeight: 400,
  },
  description: {
    fontSize: "16px",
    color: tokens.colorGoldSecondary,
  },
  action: {
    marginBlockStart: tokens.spaceMd,
  },
});
