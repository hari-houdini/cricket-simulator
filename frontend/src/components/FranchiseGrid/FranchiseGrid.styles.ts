import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link FranchiseGrid}. One column on a phone, two from the
 * 768px tablet breakpoint and three from 1024px (`ARCHITECTURE.md`), so each
 * franchise row stays readable at 320px.
 */
export const styles = stylex.create({
  list: {
    display: "grid",
    gap: tokens.spaceMd,
    gridTemplateColumns: "1fr",
    listStyle: "none",
    margin: 0,
    padding: 0,
    "@media (min-width: 768px)": {
      gridTemplateColumns: "1fr 1fr",
    },
    "@media (min-width: 1024px)": {
      gridTemplateColumns: "1fr 1fr 1fr",
    },
  },
  item: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spaceSm,
    backgroundColor: tokens.colorMid,
    borderRadius: tokens.radiusMd,
    boxShadow: tokens.shadowSubtle,
    padding: tokens.spaceMd,
  },
  identity: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spaceSm,
    flexWrap: "wrap",
  },
  name: {
    fontWeight: tokens.fontWeightSemibold,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spaceSm,
    flexWrap: "wrap",
  },
  status: {
    color: tokens.colorText,
  },
});
