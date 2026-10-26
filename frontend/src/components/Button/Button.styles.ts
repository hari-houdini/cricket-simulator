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
 * Transitions: state changes (hover, focus, color, shadow) use the 0.3s default
 * from `durationDefault`. The press uses the §7 Micro timing, 150ms ease-out, so
 * it stays crisp. Reduced-motion users get no transitions and no press transform.
 */
export const styles = stylex.create({
  base: {
    position: "relative",
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
    transitionProperty:
      "transform, background-color, border-color, box-shadow, color, outline-color",
    transitionDuration: tokens.durationDefault,
    transitionTimingFunction: tokens.easingInOut,
    outlineColor: tokens.colorGoldPrimary,
    outlineWidth: "2px",
    outlineOffset: "2px",
    outlineStyle: {
      default: "none",
      ":focus-visible": "solid",
    },
    ":active": {
      transform: "scale(0.98)",
      transitionDuration: tokens.durationMicro,
      transitionTimingFunction: tokens.easingOut,
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
      boxShadow: tokens.shadowRaisedHover,
    },
    ":active": {
      backgroundColor: tokens.colorGoldSecondary,
      boxShadow: tokens.shadowPressed,
    },
  },
  variantSecondary: {
    backgroundColor: tokens.colorBase,
    color: tokens.colorGoldPrimary,
    borderColor: tokens.colorGoldPrimary,
    boxShadow: tokens.shadowRaised,
    ":hover": {
      boxShadow: tokens.shadowRaisedHover,
    },
    ":active": {
      color: tokens.colorGoldSecondary,
      borderColor: tokens.colorGoldSecondary,
      boxShadow: tokens.shadowPressed,
    },
  },
  /**
   * Text action with no surface. A gold underline draws in from the left on
   * hover, and a faint navy wash shows the target without adding weight.
   */
  variantTertiary: {
    backgroundColor: "transparent",
    color: tokens.colorGoldPrimary,
    "::after": {
      content: '""',
      position: "absolute",
      insetInline: tokens.spaceSm,
      bottom: tokens.spaceXs,
      height: "1px",
      backgroundColor: tokens.colorGoldPrimary,
      transform: "scaleX(0)",
      transformOrigin: "left",
      transitionProperty: "transform",
      transitionDuration: tokens.durationDefault,
      transitionTimingFunction: tokens.easingInOut,
    },
    ":hover": {
      backgroundColor: tokens.colorMid,
      "::after": {
        transform: "scaleX(1)",
      },
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
