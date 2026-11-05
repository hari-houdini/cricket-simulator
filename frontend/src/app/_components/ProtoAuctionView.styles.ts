import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link ProtoAuctionView}. The lot is the hero: it takes the
 * larger column from 1024px up, and the rail of progress, purses and the bid log
 * stacks beneath it on a phone.
 */
export const styles = stylex.create({
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: tokens.spaceLg,
    "@media (min-width: 1024px)": {
      gridTemplateColumns: "minmax(0, 7fr) minmax(0, 5fr)",
      alignItems: "start",
    },
  },
  hero: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceLg,
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
    color: tokens.colorChalkMuted,
  },
  player: {
    margin: 0,
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeHeading,
    fontWeight: tokens.fontWeightBold,
    lineHeight: tokens.lineHeightTight,
  },
  meta: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spaceSm,
    margin: 0,
    padding: 0,
    listStyle: "none",
    fontSize: tokens.fontSizeSmall,
    color: tokens.colorChalkMuted,
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: tokens.sizeCompact,
    paddingInline: tokens.spaceSm,
    borderRadius: tokens.radiusPill,
    borderWidth: tokens.borderWidthHairline,
    borderStyle: "solid",
    borderColor: tokens.colorGoldPrimary,
    color: tokens.colorGoldPrimary,
    fontWeight: tokens.fontWeightSemibold,
  },
  /** The timer and the current bid sit side by side from tablet width. */
  readouts: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: tokens.spaceLg,
    "@media (min-width: 768px)": {
      gridTemplateColumns: "auto minmax(0, 1fr)",
      alignItems: "center",
    },
  },
  timer: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spaceMd,
  },
  ringWrap: {
    position: "relative",
    width: tokens.sizeRing,
    height: tokens.sizeRing,
    flexShrink: 0,
  },
  ringSvg: {
    width: "100%",
    height: "100%",
    transform: "rotate(-90deg)",
  },
  ringTrack: {
    fill: "none",
    stroke: tokens.colorBase,
    strokeWidth: tokens.heightMeter,
  },
  ringArc: {
    fill: "none",
    stroke: tokens.colorGoldPrimary,
    strokeWidth: tokens.heightMeter,
    strokeLinecap: "round",
  },
  ringArcUrgent: {
    stroke: tokens.colorStatusError,
  },
  ringLabel: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    fontVariantNumeric: "tabular-nums",
    fontSize: tokens.fontSizeTitle,
    fontWeight: tokens.fontWeightBold,
  },
  timerText: {
    margin: 0,
    fontSize: tokens.fontSizeSmall,
    color: tokens.colorChalkMuted,
  },
  timerUrgent: {
    color: tokens.colorStatusError,
    fontWeight: tokens.fontWeightSemibold,
  },
  bidBlock: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
  },
  label: {
    margin: 0,
    fontSize: tokens.fontSizeEyebrow,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: tokens.trackingEyebrow,
    textTransform: "uppercase",
    color: tokens.colorChalkMuted,
  },
  readout: {
    margin: 0,
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeReadout,
    fontWeight: tokens.fontWeightBold,
    fontVariantNumeric: "tabular-nums",
    lineHeight: tokens.lineHeightTight,
    color: tokens.colorGoldPrimary,
  },
  note: {
    margin: 0,
    fontSize: tokens.fontSizeSmall,
    color: tokens.colorChalkMuted,
  },
  announcement: {
    margin: 0,
    fontSize: tokens.fontSizeSmall,
    color: tokens.colorText,
    minHeight: tokens.sizeTouch,
    display: "flex",
    alignItems: "center",
  },
  rail: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceMd,
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    padding: tokens.spaceMd,
    backgroundColor: tokens.colorBase,
    borderRadius: tokens.radiusMd,
  },
  panelTitle: {
    margin: 0,
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeLead,
    fontWeight: tokens.fontWeightBold,
  },
  statRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: tokens.spaceSm,
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceXs,
  },
  statValue: {
    margin: 0,
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeTitle,
    fontWeight: tokens.fontWeightBold,
    fontVariantNumeric: "tabular-nums",
  },
  meter: {
    position: "relative",
    width: "100%",
    height: tokens.heightMeter,
    overflow: "hidden",
    backgroundColor: tokens.colorMid,
    borderRadius: tokens.radiusPill,
  },
  /**
   * A meter's fill. It is drawn at its full width and scaled by `--fill` with
   * `transform`, so changing the value never triggers layout.
   */
  meterFill: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: tokens.colorGoldPrimary,
    transform: "scaleX(var(--fill))",
    transformOrigin: "left",
    borderRadius: tokens.radiusPill,
  },
  owner: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceXs,
    margin: 0,
    padding: 0,
    listStyle: "none",
    fontSize: tokens.fontSizeSmall,
  },
  ownerRow: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceXs,
    paddingBlock: tokens.spaceXs,
    borderBottomColor: tokens.colorLine,
    borderBottomStyle: "solid",
    borderBottomWidth: tokens.borderWidthHairline,
  },
  log: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceXs,
    margin: 0,
    padding: 0,
    listStyle: "none",
    fontSize: tokens.fontSizeSmall,
  },
  logItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: tokens.spaceSm,
    paddingBlock: tokens.spaceXs,
    borderBottomColor: tokens.colorLine,
    borderBottomStyle: "solid",
    borderBottomWidth: tokens.borderWidthHairline,
  },
  logAmount: {
    fontVariantNumeric: "tabular-nums",
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorGoldPrimary,
  },
});
