import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link ProtoLobby}. The lobby's own sections stack in journey
 * order with one gap at every width. The scorebug and the owner roster are the
 * only places the layout changes shape.
 */
export const styles = stylex.create({
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceXl,
  },
  /** The scorebug: phase, code and share link on one strip, the way a broadcast shows the match state. */
  scorebug: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: tokens.spaceMd,
    padding: tokens.spaceMd,
    backgroundColor: tokens.colorMid,
    borderRadius: tokens.radiusMd,
    borderTopColor: tokens.colorGoldPrimary,
    borderTopStyle: "solid",
    borderTopWidth: tokens.borderWidthAccent,
    "@media (min-width: 768px)": {
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    },
  },
  scoreItem: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceXs,
    minWidth: 0,
  },
  scoreLabel: {
    margin: 0,
    fontSize: tokens.fontSizeEyebrow,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: tokens.trackingEyebrow,
    textTransform: "uppercase",
    color: tokens.colorChalkMuted,
  },
  scoreValue: {
    margin: 0,
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeLead,
    fontWeight: tokens.fontWeightBold,
    fontVariantNumeric: "tabular-nums",
    overflowWrap: "anywhere",
  },
  shareLink: {
    fontSize: tokens.fontSizeSmall,
    color: tokens.colorGoldPrimary,
    overflowWrap: "anywhere",
    minHeight: tokens.sizeTouch,
    display: "inline-flex",
    alignItems: "center",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceMd,
  },
  sectionTitle: {
    margin: 0,
    fontFamily: tokens.fontSerif,
    fontSize: tokens.fontSizeSection,
    fontWeight: tokens.fontWeightBold,
    lineHeight: tokens.lineHeightTight,
  },
  note: {
    margin: 0,
    fontSize: tokens.fontSizeSmall,
    color: tokens.colorChalkMuted,
  },
  roster: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spaceSm,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  rosterItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spaceSm,
    minHeight: tokens.sizeTouch,
    paddingInline: tokens.spaceMd,
    borderRadius: tokens.radiusPill,
    backgroundColor: tokens.colorBase,
    fontSize: tokens.fontSizeSmall,
  },
  rosterCode: {
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorGoldPrimary,
  },
  /** The start panel is a checklist: each owner with a franchise is a tick, and the action waits for all of them. */
  start: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceMd,
    padding: tokens.spaceLg,
    backgroundColor: tokens.colorMid,
    borderRadius: tokens.radiusLg,
  },
  joinPanel: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceMd,
    padding: tokens.spaceLg,
    backgroundColor: tokens.colorMid,
    borderRadius: tokens.radiusLg,
    maxWidth: tokens.widthNarrow,
  },
  loading: {
    margin: 0,
  },
  link: {
    color: tokens.colorGoldPrimary,
    minHeight: tokens.sizeTouch,
    display: "inline-flex",
    alignItems: "center",
  },
});
