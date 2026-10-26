import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link EmptyState}. A centered stack: the navy-and-gold
 * sphere from the app icon, a Bodoni title, a gold rule, and a warm subtitle.
 */
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
  sphere: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    backgroundImage: tokens.gradientSphere,
    boxShadow: tokens.shadowRaised,
    marginBlockEnd: tokens.spaceSm,
  },
  title: {
    fontFamily: tokens.fontSerif,
    fontSize: "24px",
    fontWeight: 400,
  },
  rule: {
    width: "48px",
    height: "2px",
    backgroundColor: tokens.colorGoldPrimary,
    marginBlock: tokens.spaceXs,
  },
  description: {
    fontSize: "16px",
    color: tokens.colorGoldSecondary,
  },
  action: {
    marginBlockStart: tokens.spaceMd,
  },
});
