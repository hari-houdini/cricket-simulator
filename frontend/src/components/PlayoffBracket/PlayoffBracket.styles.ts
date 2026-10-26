import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link PlayoffBracket} and {@link KeyMomentView}'s cards. */
export const styles = stylex.create({
  list: {
    display: "grid",
    gap: tokens.spaceMd,
    gridTemplateColumns: "1fr",
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceXs,
    backgroundColor: tokens.colorBase,
    borderRadius: tokens.radiusSm,
    padding: tokens.spaceMd,
  },
  finalCard: {
    borderColor: tokens.colorGoldPrimary,
    borderStyle: "solid",
    borderWidth: tokens.borderWidthHairline,
  },
  heading: {
    fontFamily: tokens.fontSerif,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
  },
  meta: {
    color: tokens.colorText,
    margin: 0,
  },
  champion: {
    color: tokens.colorGoldSecondary,
    fontWeight: tokens.fontWeightBold,
    margin: 0,
  },
});
