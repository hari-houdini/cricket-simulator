import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * A light sheen crosses the button once on press, and loops while `aria-pressed`
 * is true (the snippet's btn-11). It moves with `transform` and fades with
 * `opacity` only, so it never triggers layout.
 */
const sheenSweep = stylex.keyframes({
  "0%": { transform: "translateX(0) skewX(-20deg)", opacity: 0 },
  "10%": { transform: "translateX(0) skewX(-20deg)", opacity: 0.6 },
  "100%": { transform: "translateX(1000%) skewX(-20deg)", opacity: 0 },
});

/**
 * StyleX rules for {@link Button}.
 *
 * Variant and size rules are top-level keys, not nested namespaces. With
 * StyleX 0.19, `stylex.props` only type-checks top-level keys, so a nested
 * lookup such as `styles.size[size]` fails the type check. The component picks
 * one variant and one size with guarded spreads instead.
 *
 * Hover effects are gated to `@media (hover: hover)`, so a touch tap does not
 * leave the effect stuck on. Disabled buttons set `pointer-events: none`, which
 * stops hover and press from reaching them, and the component paints their fill.
 *
 * Transitions name their properties explicitly (`transform`, `color`,
 * `background-color`, `border-color`, `box-shadow`), as the animation allow-list
 * test requires. Reduced-motion users get no transitions and no sheen, and the
 * final visual state applies at once.
 */
export const styles = stylex.create({
  base: {
    position: "relative",
    isolation: "isolate",
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spaceSm,
    fontFamily: tokens.fontSans,
    fontWeight: 500,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    cursor: "pointer",
    transitionProperty:
      "transform, background-color, border-color, box-shadow, color",
    transitionDuration: tokens.durationDefault,
    transitionTimingFunction: tokens.easingInOut,
    outlineColor: tokens.colorGoldPrimary,
    outlineWidth: tokens.widthFocusRing,
    outlineOffset: tokens.offsetFocusRing,
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
      pointerEvents: "none",
      transform: "none",
    },
    "@media (prefers-reduced-motion: reduce)": {
      transitionProperty: "none",
      ":active": {
        transform: "none",
      },
    },
  },

  /** The label sits above the decorative layers, so the text stays on top. */
  label: {
    position: "relative",
    zIndex: 2,
  },

  /**
   * A full-cover layer under the label. It is scaled to nothing until hover, so
   * it adds nothing at rest. Its colour comes from `fillGold` or `fillMid`.
   */
  fill: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
    transform: "scaleX(0)",
    transformOrigin: "right",
    transitionProperty: "transform",
    transitionDuration: tokens.durationDefault,
    transitionTimingFunction: tokens.easingInOut,
    "@media (prefers-reduced-motion: reduce)": {
      transitionProperty: "none",
    },
  },
  /** The sweep's hover state, kept apart from `fill` so the reduced-motion rule is not conditioned on hover. */
  fillHover: {
    "@media (hover: hover)": {
      [stylex.when.ancestor(":hover")]: {
        transform: "scaleX(1)",
      },
    },
  },
  /** Primary's sweep colour: the gold accent one step lighter, with dark text kept for contrast. */
  fillGold: {
    backgroundColor: tokens.colorGoldSecondary,
  },
  /** Secondary and tertiary's disabled colour: the navy surface, with gold text kept. */
  fillMid: {
    backgroundColor: tokens.colorMid,
  },
  /** The disabled look: the fill covers the whole button, as btn-13's hover does. */
  fillFull: {
    transform: "scaleX(1)",
  },

  /**
   * The sheen bar. It is hidden at rest. On press it crosses once, and while
   * `aria-pressed` is true it loops (see `sheenPressed`).
   */
  sheen: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
    width: "30px",
    pointerEvents: "none",
    backgroundColor: tokens.colorText,
    opacity: 0,
    [stylex.when.ancestor(":active")]: {
      animationName: sheenSweep,
      animationDuration: tokens.durationShimmer,
      animationTimingFunction: tokens.easingInOut,
      animationIterationCount: 1,
      "@media (prefers-reduced-motion: reduce)": {
        animationName: "none",
      },
    },
    "@media (prefers-reduced-motion: reduce)": {
      animationName: "none",
    },
  },
  /** Loops the sheen for a selected (`aria-pressed`) button. Off for disabled buttons. */
  sheenPressed: {
    animationName: sheenSweep,
    animationDuration: tokens.durationShimmer,
    animationTimingFunction: tokens.easingInOut,
    animationIterationCount: "infinite",
    "@media (prefers-reduced-motion: reduce)": {
      animationName: "none",
    },
  },

  /**
   * A full-cover layer that carries the second pair of lines: the snippet's
   * `span:before` and `span:after`. It sits under the label and ignores the
   * pointer, so hover still lands on the button.
   */
  frame: {
    position: "absolute",
    inset: 0,
    zIndex: 1,
    pointerEvents: "none",
  },
  /**
   * Secondary's left and top edges, drawn in gold on hover. The lines read the
   * button's hover through `when.ancestor`, as the fill does.
   */
  frameSecondary: {
    "@media (hover: hover)": {
      "::before": {
        [stylex.when.ancestor(":hover")]: {
          transform: "scaleY(1)",
        },
      },
      "::after": {
        [stylex.when.ancestor(":hover")]: {
          transform: "scaleX(1)",
        },
      },
    },
    "::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      bottom: 0,
      width: tokens.borderWidthLine,
      backgroundColor: tokens.colorGoldPrimary,
      transform: "scaleY(0)",
      transformOrigin: "top",
      transitionProperty: "transform",
      transitionDuration: tokens.durationDefault,
      transitionTimingFunction: tokens.easingInOut,
      "@media (prefers-reduced-motion: reduce)": {
        transitionProperty: "none",
      },
    },
    "::after": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: tokens.borderWidthLine,
      backgroundColor: tokens.colorGoldPrimary,
      transform: "scaleX(0)",
      transformOrigin: "left",
      transitionProperty: "transform",
      transitionDuration: tokens.durationDefault,
      transitionTimingFunction: tokens.easingInOut,
      "@media (prefers-reduced-motion: reduce)": {
        transitionProperty: "none",
      },
    },
  },
  /**
   * Tertiary's horizontal corner lines: the snippet's btn-6 `span:before` (top
   * left, grows right) and `span:after` (bottom right, grows left). Half a pixel
   * thick, as in the snippet. The bottom line is placed one pixel up from the
   * bottom edge, because Chrome paints a 0.5px box at a fractional offset as
   * nothing, so `bottom: 0` drew no line.
   */
  frameTertiary: {
    "@media (hover: hover)": {
      "::before": {
        [stylex.when.ancestor(":hover")]: {
          transform: "scaleX(1)",
        },
      },
      "::after": {
        [stylex.when.ancestor(":hover")]: {
          transform: "scaleX(1)",
        },
      },
    },
    "::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: tokens.borderWidthHairlineHalf,
      backgroundColor: tokens.colorGoldPrimary,
      transform: "scaleX(0)",
      transformOrigin: "left",
      transitionProperty: "transform",
      transitionDuration: tokens.durationDefault,
      transitionTimingFunction: tokens.easingInOut,
      "@media (prefers-reduced-motion: reduce)": {
        transitionProperty: "none",
      },
    },
    "::after": {
      content: '""',
      position: "absolute",
      top: `calc(100% - ${tokens.borderWidthHairline})`,
      right: 0,
      width: "100%",
      height: tokens.borderWidthHairlineHalf,
      backgroundColor: tokens.colorGoldPrimary,
      transform: "scaleX(0)",
      transformOrigin: "right",
      transitionProperty: "transform",
      transitionDuration: tokens.durationDefault,
      transitionTimingFunction: tokens.easingInOut,
      "@media (prefers-reduced-motion: reduce)": {
        transitionProperty: "none",
      },
    },
  },

  variantPrimary: {
    backgroundColor: tokens.colorGoldPrimary,
    color: tokens.colorBase,
    boxShadow: tokens.shadowRaised,
    "@media (hover: hover)": {
      ":hover": {
        boxShadow: tokens.shadowRaisedHover,
      },
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
    /**
     * The snippet's btn-7 edge lines. A right edge line grows up from the bottom,
     * and a bottom edge line grows left from the right. The left and top edges
     * come from `frameSecondary`, so all four edges draw in on hover.
     */
    "::before": {
      content: '""',
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      width: tokens.borderWidthLine,
      backgroundColor: tokens.colorGoldPrimary,
      transform: "scaleY(0)",
      transformOrigin: "bottom",
      transitionProperty: "transform",
      transitionDuration: tokens.durationDefault,
      transitionTimingFunction: tokens.easingInOut,
      zIndex: 1,
      "@media (prefers-reduced-motion: reduce)": {
        transitionProperty: "none",
      },
    },
    "::after": {
      content: '""',
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: tokens.borderWidthLine,
      backgroundColor: tokens.colorGoldPrimary,
      transform: "scaleX(0)",
      transformOrigin: "right",
      transitionProperty: "transform",
      transitionDuration: tokens.durationDefault,
      transitionTimingFunction: tokens.easingInOut,
      zIndex: 1,
      "@media (prefers-reduced-motion: reduce)": {
        transitionProperty: "none",
      },
    },
    "@media (hover: hover)": {
      ":hover": {
        boxShadow: tokens.shadowRaisedHover,
        "::before": {
          transform: "scaleY(1)",
        },
        "::after": {
          transform: "scaleX(1)",
        },
      },
    },
    ":active": {
      color: tokens.colorGoldSecondary,
      borderColor: tokens.colorGoldSecondary,
      boxShadow: tokens.shadowPressed,
    },
  },
  /**
   * Text action with no surface. The snippet's btn-6 corner lines draw in on
   * hover: a line down the top right edge, and one up the bottom left edge. The
   * horizontal pair comes from `frameTertiary`. The surface stays transparent,
   * as the design spec has it, so hover shows only the lines.
   */
  variantTertiary: {
    backgroundColor: "transparent",
    color: tokens.colorGoldPrimary,
    "::before": {
      content: '""',
      position: "absolute",
      top: 0,
      right: 0,
      width: tokens.borderWidthHairline,
      height: "100%",
      backgroundColor: tokens.colorGoldPrimary,
      transform: "scaleY(0)",
      transformOrigin: "top",
      transitionProperty: "transform",
      transitionDuration: tokens.durationDefault,
      transitionTimingFunction: tokens.easingInOut,
      zIndex: 1,
      "@media (prefers-reduced-motion: reduce)": {
        transitionProperty: "none",
      },
    },
    "::after": {
      content: '""',
      position: "absolute",
      left: 0,
      bottom: 0,
      width: tokens.borderWidthHairline,
      height: "100%",
      backgroundColor: tokens.colorGoldPrimary,
      transform: "scaleY(0)",
      transformOrigin: "bottom",
      transitionProperty: "transform",
      transitionDuration: tokens.durationDefault,
      transitionTimingFunction: tokens.easingInOut,
      zIndex: 1,
      "@media (prefers-reduced-motion: reduce)": {
        transitionProperty: "none",
      },
    },
    "@media (hover: hover)": {
      ":hover": {
        "::before": {
          transform: "scaleY(1)",
        },
        "::after": {
          transform: "scaleY(1)",
        },
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
