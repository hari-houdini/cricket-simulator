/**
 * The palette the 3D franchise stage paints with. Three.js cannot read StyleX
 * variables, so these hex values mirror the matching tokens in
 * `tokens.stylex.ts`. The test in `stage-palette.test.ts` fails if they drift apart,
 * so change a colour in both places, or the test will say which one moved.
 */
export const STAGE_PALETTE = {
  /** Chalk, the stage's light and crown trim. Mirrors `colorText`. */
  chalk: "#f4f1e8",
  /** Floodlight ochre, the key light and the owned crown. Mirrors `colorGoldPrimary`. */
  ochre: "#e8a33d",
  /** Ochre bright, the warm light's highlight. Mirrors `colorGoldSecondary`. */
  ochreBright: "#f0b55a",
  /** Turf night, the page surface the pitch sits on. Mirrors `colorMid`. */
  turfNight: "#0b2116",
  /** Turf deep, the raised surface the pitch is lifted to. Mirrors `colorBase`. */
  turfDeep: "#0f2d1e",
} as const satisfies Record<string, `#${string}`>;
