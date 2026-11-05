import * as stylex from "@stylexjs/stylex";

import { prototypeVars } from "../../../shared/const/prototype-theme.stylex";
import { tokens } from "../../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link ProtoXiPicker}. Players sit in a grid: one column on a
 * phone, two from tablet width. The starting XI meter is a row of eleven slots, so
 * the count reads at a glance and in words.
 */
export const styles = stylex.create({
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceLg,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    padding: tokens.spaceLg,
    backgroundColor: tokens.colorMid,
    borderRadius: tokens.radiusLg,
    borderTopColor: tokens.colorGoldPrimary,
    borderTopStyle: "solid",
    borderTopWidth: tokens.borderWidthAccent,
  },
  eyebrow: {
    margin: 0,
    fontSize: tokens.fontSizeEyebrow,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: tokens.trackingEyebrow,
    textTransform: "uppercase",
    color: prototypeVars.colorChalkMuted,
  },
  count: {
    margin: 0,
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeReadout,
    fontWeight: tokens.fontWeightBold,
    fontVariantNumeric: "tabular-nums",
    lineHeight: tokens.lineHeightTight,
  },
  slots: {
    display: "grid",
    gridTemplateColumns: "repeat(11, minmax(0, 1fr))",
    gap: tokens.spaceXs,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  slot: {
    height: tokens.heightMeter,
    borderRadius: tokens.radiusPill,
    backgroundColor: tokens.colorBase,
  },
  slotFilled: {
    backgroundColor: tokens.colorGoldPrimary,
  },
  status: {
    margin: 0,
    fontSize: tokens.fontSizeSmall,
    color: tokens.colorText,
  },
  error: {
    margin: 0,
    fontSize: tokens.fontSizeSmall,
    color: tokens.colorStatusError,
    fontWeight: tokens.fontWeightSemibold,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: tokens.spaceGrid,
    margin: 0,
    padding: 0,
    listStyle: "none",
    "@media (min-width: 768px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
  },
  player: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    padding: tokens.spaceMd,
    backgroundColor: tokens.colorBase,
    borderRadius: tokens.radiusSm,
    borderInlineStartColor: tokens.colorLine,
    borderInlineStartStyle: "solid",
    borderInlineStartWidth: tokens.widthStripe,
  },
  playerIn: {
    borderInlineStartColor: tokens.colorGoldPrimary,
  },
  playerRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spaceSm,
  },
  name: {
    margin: 0,
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeLead,
    fontWeight: tokens.fontWeightBold,
  },
  role: {
    margin: 0,
    fontSize: tokens.fontSizeSmall,
    color: prototypeVars.colorChalkMuted,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spaceSm,
  },
  saveBar: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    padding: tokens.spaceLg,
    backgroundColor: tokens.colorMid,
    borderRadius: tokens.radiusLg,
  },
});
