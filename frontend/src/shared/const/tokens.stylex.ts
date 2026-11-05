import * as stylex from "@stylexjs/stylex";

/**
 * Design tokens for the Golden Twilight dark theme, as StyleX variables.
 *
 * Values come from `docs/ui/design-system.md`. Components reference these
 * variables and never hard-code a color, spacing, radius, shadow, or duration.
 * `defineVars` emits CSS custom properties on `:root`, so the same tokens are
 * also reachable from plain CSS.
 */
export const tokens = stylex.defineVars({
  /** Dark navy surface, the base for cards and buttons. */
  colorMid: "#001d3d",
  /** Medium navy for secondary surfaces and hover states. */
  colorBase: "#003566",
  /** Deepest navy, used for neumorphic shadows and depth. */
  colorShadow: "#000814",
  /** Primary gold accent for CTAs, highlights, and focus rings. */
  colorGoldPrimary: "#ffc300",
  /** Light gold for hover states and secondary highlights. */
  colorGoldSecondary: "#ffd60a",
  /**
   * Body text color. The design system does not name one, so white is used.
   * It gives about 17:1 contrast on `colorBase`.
   */
  colorText: "#ffffff",
  /** Available, success state. */
  colorStatusSuccess: "#10b981",
  /** Warning state, also used for the connection banner. */
  colorStatusWarning: "#f59e0b",
  /**
   * Unavailable or sold state. Lightened from #ef4444, which gave 4.49:1 on
   * `colorBase` and missed the 4.5:1 body-text minimum.
   */
  colorStatusError: "#f25f5c",

  /**
   * Base fill of the wave backdrop behind every view, and the body's fallback
   * fill. Taken from the supplied wave snippet, not from the design system, which
   * sets the base navy to `colorMid`.
   */
  colorBackdropBase: "#003566",
  /** The darker wave in the backdrop's left-hand curve. From the wave snippet. */
  colorBackdropWaveDeep: "#001d3d",
  /** The lighter wave in the backdrop's right-hand curve. From the wave snippet. */
  colorBackdropWaveLight: "#001d3d",

  /** 4px, micro-spacing. */
  spaceXs: "4px",
  /** 8px, tight gaps. */
  spaceSm: "8px",
  /** 16px, the base unit. */
  spaceMd: "16px",
  /** 24px, section spacing. */
  spaceLg: "24px",
  /** 32px, major spacing. */
  spaceXl: "32px",
  /** 48px, screen-level spacing. */
  space2xl: "48px",
  /**
   * 12px vertical padding for inputs (§Forms). Not on the spacing scale, but the
   * design system specifies it for input height and touch comfort.
   */
  spaceInput: "12px",

  /** 8px radius for buttons and inputs. */
  radiusSm: "8px",
  /** 12px radius for cards and modals. */
  radiusMd: "12px",
  /** Fully rounded ends for pill-shaped controls such as the tab bar. */
  radiusPill: "99px",
  /** 12px inset between the tab bar's edge and its tabs, the bar's padding. */
  spaceTabInset: "12px",
  /** 54px tab height. Above the 44px touch-target minimum on every width. */
  heightTab: "54px",

  /** Raised neumorphic shadow for buttons and cards. */
  shadowRaised:
    "0 8px 16px rgba(0,8,20,0.2), inset 0 2px 4px rgba(255,255,255,0.1)",
  /** Deeper raised shadow on hover, per §6 "shadow deepens slightly". */
  shadowRaisedHover:
    "0 12px 24px rgba(0,8,20,0.28), inset 0 2px 4px rgba(255,255,255,0.1)",
  /** Focused input: inset shadow plus a faint gold glow (§Forms). */
  shadowInputFocus:
    "0 4px 8px rgba(0,8,20,0.2), inset 0 2px 4px rgba(0,0,0,0.15), 0 0 4px rgba(255,195,0,0.3)",
  /** Navy-and-gold sphere, the app icon from §Branding, as a background gradient. */
  gradientSphere:
    "radial-gradient(circle at 32% 28%, #ffd60a 0%, #ffc300 36%, #003566 80%, #001d3d 100%)",
  /** Pressed neumorphic shadow for active buttons and focused inputs. */
  shadowPressed:
    "inset 0 4px 8px rgba(0,8,20,0.2), inset 0 -2px 4px rgba(255,255,255,0.1)",
  /** Lightweight shadow for secondary elements. */
  shadowSubtle: "0 4px 12px rgba(0,8,20,0.15)",

  /**
   * Default for hover, focus, and color changes on interactive elements. This is
   * a general rule added on top of §7, which keeps its own named durations.
   */
  durationDefault: "300ms",
  /** Micro interactions such as button press. */
  durationMicro: "150ms",
  /** Card expand, collapse, and swap. */
  durationCard: "300ms",
  /** Screen transitions. */
  durationPage: "400ms",
  /** Match reveal and score animation. */
  durationReveal: "1200ms",
  /** One left-to-right pass of the skeleton shimmer, looped. */
  durationShimmer: "1500ms",
  /** Light sheen that sweeps across skeleton placeholders. */
  colorShimmer: "rgba(255, 255, 255, 0.08)",
  /** Ease-out curve, used for entrances and presses. */
  easingOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  /** Ease-in-out curve, used for expansions and swaps. */
  easingInOut: "cubic-bezier(0.4, 0, 0.2, 1)",

  /** Heading font. Loaded by `next/font/google` in the root layout. */
  fontSerif: "var(--font-bodoni-moda), serif",
  /** Body font. Loaded by `next/font/google` in the root layout. */
  fontSans: "var(--font-dm-sans), sans-serif",
  /** Wordmark size in the app header. */
  fontSizeBrand: "1.25rem",
  /** Page heading size. */
  fontSizeHeading: "2rem",
  /** Small text, such as the footer disclaimer. */
  fontSizeSmall: "14px",
  /**
   * Tab label size below 768px. At 1.25rem, "Development" overflows a third of a
   * 320px tab bar, so phones use the smaller size.
   */
  fontSizeTab: "1rem",
  /** Tab label size from 768px up, the tablet breakpoint in `ARCHITECTURE.md`. */
  fontSizeTabWide: "1.25rem",
  /** 12px, the uppercase eyebrow label above a heading on the broadcast frame. */
  fontSizeEyebrow: "0.75rem",
  /** Display size for a step's title on the broadcast frame: a fluid 40px to 64px. */
  fontSizeDisplay: "clamp(2.5rem, 1.6rem + 3.6vw, 4rem)",
  /** Letter spacing for an uppercase eyebrow label. */
  trackingEyebrow: "0.16em",
  /** 8px, the live dot on the broadcast bar. */
  sizeDot: "8px",
  /** The narrowest a franchise card may be before it wraps to the next column. */
  widthCard: "14rem",
  /** 12px, the gap between cards in a grid. */
  spaceGrid: "12px",
  /** 4px, a team-colour stripe on a card's edge. */
  widthStripe: "4px",
  /** 24px card title, design system Heading 2. */
  fontSizeTitle: "1.5rem",
  /** 20px lead line. */
  fontSizeLead: "1.25rem",
  /** The large numeric readout, such as the live bid. */
  fontSizeReadout: "clamp(2.25rem, 1.8rem + 2.4vw, 3.25rem)",
  /** The WCAG 2.5.5 touch-target minimum. */
  sizeTouch: "44px",
  /** The large button for a screen's main action. */
  sizeLarge: "56px",
  /** A progress meter's track height. */
  heightMeter: "8px",
  /** Line height for headings. */
  lineHeightTight: "1.1",
  /** Line height for body copy. */
  lineHeightBody: "1.5",
  /** Medium weight for buttons and labels. */
  fontWeightMedium: "500",
  /** 96px, the auction's countdown ring. */
  sizeRing: "96px",
  /** 16px radius for hero panels, one step above a card. */
  radiusLg: "16px",
  /** A compact control, padded to the touch minimum where it sits in a row. */
  sizeCompact: "32px",
  /** A hairline divider between rows. Structure only, not text. */
  colorLine: "rgba(180, 197, 221, 0.16)",
  /** Section heading size: a fluid 24px to 32px. */
  fontSizeSection: "clamp(1.5rem, 1.25rem + 1vw, 2rem)",
  /** Maximum width of a narrow panel, such as the join form. */
  widthNarrow: "24rem",
  /** Bold weight for headings and the wordmark. */
  fontWeightBold: "700",
  /** Semibold weight for the skip link. */
  fontWeightSemibold: "600",
  /** Maximum width of the app shell's main column. */
  widthShell: "1024px",
  /** Hairline rule under the app header. */
  borderWidthHairline: "1px",
  /** Half-pixel line for the tertiary's horizontal corner lines (the snippet's btn-6 `span` lines). */
  borderWidthHairlineHalf: "0.5px",
  /** The thick edge that marks a match with an owner in it. */
  borderWidthAccent: "4px",
  /** Thickness of the edge lines that draw on a button's hover (the snippet's btn-6 and btn-7). */
  borderWidthLine: "2px",
  /** Width of the keyboard focus ring. */
  widthFocusRing: "2px",
  /** Gap between the focus ring and the element it marks. */
  offsetFocusRing: "2px",
});
