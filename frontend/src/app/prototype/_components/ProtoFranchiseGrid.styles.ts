import * as stylex from "@stylexjs/stylex";

import { prototypeVars } from "../../../shared/const/prototype-theme.stylex";
import { tokens } from "../../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link ProtoFranchiseGrid}. The grid fits as many cards as the
 * width allows, so the same markup is one column on a phone and five on a
 * wide screen.
 */
export const styles = stylex.create({
  grid: {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${tokens.widthCard}), 1fr))`,
    gap: tokens.spaceGrid,
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  /**
   * The card's left edge carries the franchise colour, read from `--team`. The
   * colour is data from {@link TEAMS}, so it is set per card, not in a rule.
   */
  card: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    padding: tokens.spaceMd,
    paddingInlineStart: `calc(${tokens.spaceMd} + ${tokens.widthStripe})`,
    backgroundColor: tokens.colorBase,
    borderRadius: tokens.radiusSm,
    borderInlineStartColor: "var(--team)",
    borderInlineStartStyle: "solid",
    borderInlineStartWidth: tokens.widthStripe,
    position: "relative",
  },
  code: {
    margin: 0,
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeTitle,
    fontWeight: tokens.fontWeightBold,
    lineHeight: 1,
    letterSpacing: tokens.trackingEyebrow,
  },
  name: {
    margin: 0,
    fontSize: tokens.fontSizeSmall,
    color: prototypeVars.colorChalkMuted,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spaceSm,
    marginBlockStart: tokens.spaceXs,
    minHeight: tokens.sizeTouch,
  },
  status: {
    fontSize: tokens.fontSizeSmall,
    fontWeight: tokens.fontWeightSemibold,
  },
  statusMine: {
    color: tokens.colorGoldPrimary,
  },
  statusFree: {
    color: tokens.colorStatusSuccess,
  },
  statusTaken: {
    color: prototypeVars.colorChalkMuted,
  },
});
