import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link SquadPicker}. */
export const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceMd,
  },
  heading: {
    fontFamily: tokens.fontSerif,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
  },
  note: {
    margin: 0,
    color: tokens.colorText,
  },
  message: {
    margin: 0,
    color: tokens.colorStatusWarning,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spaceSm,
    backgroundColor: tokens.colorBase,
    borderRadius: tokens.radiusSm,
    padding: tokens.spaceSm,
  },
  identity: {
    display: "flex",
    flexDirection: "column",
  },
  name: {
    fontWeight: tokens.fontWeightBold,
  },
  role: {
    color: tokens.colorText,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spaceSm,
  },
  form: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: tokens.spaceMd,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceXs,
  },
  select: {
    backgroundColor: tokens.colorBase,
    color: tokens.colorText,
    borderRadius: tokens.radiusSm,
    borderWidth: tokens.borderWidthHairline,
    borderStyle: "solid",
    borderColor: tokens.colorGoldSecondary,
    padding: tokens.spaceSm,
  },
  focusRing: {
    outlineWidth: tokens.widthFocusRing,
    outlineStyle: "solid",
    outlineColor: tokens.colorGoldPrimary,
    outlineOffset: tokens.offsetFocusRing,
  },
});
