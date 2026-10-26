import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link Button}.
 *
 * Variant and size rules are top-level keys, not nested namespaces. With
 * StyleX 0.19, `stylex.props` only type-checks top-level keys, so a nested
 * lookup such as `styles.size[size]` fails the type check. The component picks
 * one variant and one size with guarded spreads instead.
 *
 * Only transform and opacity are animated, as `AGENTS.md` requires. Hover and
 * focus change color or outline without a transition. Reduced-motion users get
 * no press transform.
 */
export const styles = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spaceSm,
    fontFamily: tokens.fontSans,
    fontWeight: 500,
    borderRadius: tokens.radiusSm,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    cursor: "pointer",
    transitionProperty: "transform",
    transitionDuration: tokens.durationMicro,
    transitionTimingFunction: tokens.easingOut,
    outlineColor: tokens.colorGoldPrimary,
    outlineWidth: "2px",
    outlineOffset: "2px",
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    ":active": {
      transform: "scale(0.98)",
    },
    ":disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
      transform: "none",
    },
    "@media (prefers-reduced-motion: reduce)": {
      transitionProperty: "none",
      ":active": {
        transform: "none",
      },
    },
  },

  variantPrimary: {
    backgroundColor: tokens.colorGoldPrimary,
    color: tokens.colorBase,
    boxShadow: tokens.shadowRaised,
    ":hover": {
      backgroundColor: tokens.colorGoldSecondary,
    },
  },
  variantSecondary: {
    backgroundColor: tokens.colorBase,
    color: tokens.colorGoldPrimary,
    borderColor: tokens.colorGoldPrimary,
    boxShadow: tokens.shadowRaised,
    ":hover": {
      backgroundColor: tokens.colorMid,
    },
  },
  variantTertiary: {
    backgroundColor: "transparent",
    color: tokens.colorGoldPrimary,
    ":hover": {
      backgroundColor: tokens.colorMid,
    },
  },

  sizeSm: {
    minHeight: "32px",
    paddingInline: tokens.spaceSm,
    fontSize: "12px",
  },
  sizeMd: {
    minHeight: "44px",
    paddingInline: tokens.spaceMd,
    fontSize: "16px",
  },
  sizeLg: {
    minHeight: "56px",
    paddingInline: tokens.spaceLg,
    fontSize: "16px",
  },
});
