import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link SeasonNav}: the nav row, the modal bodies, and the squads table. */
export const styles = stylex.create({
  nav: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spaceSm,
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceMd,
  },
  note: {
    margin: 0,
    color: tokens.colorText,
  },
  scroll: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    color: tokens.colorText,
  },
  headerCell: {
    textAlign: "left",
    padding: tokens.spaceSm,
    borderBottomColor: tokens.colorShadow,
    borderBottomStyle: "solid",
    borderBottomWidth: tokens.borderWidthHairline,
  },
  cell: {
    textAlign: "left",
    verticalAlign: "top",
    padding: tokens.spaceSm,
    borderBottomColor: tokens.colorShadow,
    borderBottomStyle: "solid",
    borderBottomWidth: tokens.borderWidthHairline,
  },
  /** The owner's name, drawn as the accordion's button. */
  rowButton: {
    font: "inherit",
    color: "inherit",
    backgroundColor: "transparent",
    borderWidth: 0,
    cursor: "pointer",
    padding: 0,
    fontWeight: tokens.fontWeightBold,
    textAlign: "left",
    outlineWidth: {
      default: null,
      ":focus-visible": tokens.widthFocusRing,
    },
    outlineStyle: {
      default: null,
      ":focus-visible": "solid",
    },
    outlineColor: {
      default: null,
      ":focus-visible": tokens.colorGoldPrimary,
    },
  },
  list: {
    margin: 0,
    paddingLeft: tokens.spaceMd,
  },
});
