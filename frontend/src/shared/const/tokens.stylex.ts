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
  colorBase: "#001d3d",
  /** Medium navy for secondary surfaces and hover states. */
  colorMid: "#003566",
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
  /** Bold weight for headings and the wordmark. */
  fontWeightBold: "700",
  /** Semibold weight for the skip link. */
  fontWeightSemibold: "600",
  /** Maximum width of the app shell's main column. */
  widthShell: "1024px",
  /** Hairline rule under the app header. */
  borderWidthHairline: "1px",
  /** Width of the keyboard focus ring. */
  widthFocusRing: "2px",
  /** Gap between the focus ring and the element it marks. */
  offsetFocusRing: "2px",
});
