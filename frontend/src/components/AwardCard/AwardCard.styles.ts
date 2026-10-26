import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link AwardCard}: a raised card with a winner and a runner-up. */
export const styles = stylex.create({
  card: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    backgroundColor: tokens.colorBase,
    borderRadius: tokens.radiusSm,
    boxShadow: tokens.shadowSubtle,
    padding: tokens.spaceMd,
  },
  heading: {
    fontFamily: tokens.fontSerif,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
  },
  description: {
    margin: 0,
    color: tokens.colorText,
  },
  places: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  place: {
    display: "flex",
    flexDirection: "column",
  },
  placeLabel: {
    fontWeight: tokens.fontWeightBold,
  },
  placeDetail: {
    color: tokens.colorText,
  },
  placeTitle: {
    color: tokens.colorText,
    fontSize: tokens.fontSizeBrand,
  },
});
