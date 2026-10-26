import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link KeyMomentView}. */
export const styles = stylex.create({
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    backgroundColor: tokens.colorBase,
    borderRadius: tokens.radiusSm,
    padding: tokens.spaceMd,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceXs,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  item: {
    color: tokens.colorText,
  },
  latest: {
    color: tokens.colorGoldSecondary,
    fontWeight: tokens.fontWeightBold,
  },
});
