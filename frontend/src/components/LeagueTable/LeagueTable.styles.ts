import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/** StyleX rules for {@link LeagueTable}. */
export const styles = stylex.create({
  scroll: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    color: tokens.colorText,
  },
  cell: {
    padding: tokens.spaceSm,
    textAlign: "right",
    borderBottomColor: tokens.colorShadow,
    borderBottomStyle: "solid",
    borderBottomWidth: tokens.borderWidthHairline,
  },
  teamCell: {
    textAlign: "left",
    fontWeight: tokens.fontWeightBold,
  },
  headerCell: {
    textAlign: "right",
    padding: tokens.spaceSm,
    borderBottomColor: tokens.colorShadow,
    borderBottomStyle: "solid",
    borderBottomWidth: tokens.borderWidthHairline,
  },
  headerTeam: {
    textAlign: "left",
  },
  sortButton: {
    font: "inherit",
    color: "inherit",
    backgroundColor: "transparent",
    borderWidth: 0,
    cursor: "pointer",
    padding: 0,
    textDecoration: {
      default: "none",
      ":hover": "underline",
    },
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
});
