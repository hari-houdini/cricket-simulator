/**
 * One speck of floodlit dust in the background. The positions are fixed, so the
 * background is the same on every visit and renders the same on the server.
 */
export type DustSpeck = {
  /** Horizontal start position, as a percentage of the viewport. */
  readonly left: string;
  /** Vertical start position, as a percentage of the viewport. */
  readonly top: string;
  /** Diameter in pixels. */
  readonly size: number;
  /** Seconds the speck takes to rise and fade once. */
  readonly duration: number;
  /** A negative delay, so the specks start at different points in their cycle. */
  readonly delay: number;
};

/**
 * The dust in the stadium background. Fourteen specks, spread across the width,
 * with different sizes, speeds and phases so they never move in step.
 */
export const DUST: readonly DustSpeck[] = [
  { left: "6%", top: "78%", size: 3, duration: 19, delay: -2 },
  { left: "14%", top: "64%", size: 2, duration: 23, delay: -9 },
  { left: "22%", top: "88%", size: 4, duration: 17, delay: -5 },
  { left: "31%", top: "52%", size: 2, duration: 27, delay: -14 },
  { left: "38%", top: "71%", size: 3, duration: 21, delay: -7 },
  { left: "46%", top: "92%", size: 2, duration: 24, delay: -12 },
  { left: "53%", top: "58%", size: 3, duration: 18, delay: -3 },
  { left: "61%", top: "82%", size: 2, duration: 26, delay: -16 },
  { left: "68%", top: "46%", size: 4, duration: 20, delay: -8 },
  { left: "75%", top: "74%", size: 2, duration: 22, delay: -11 },
  { left: "82%", top: "90%", size: 3, duration: 25, delay: -1 },
  { left: "88%", top: "60%", size: 2, duration: 16, delay: -6 },
  { left: "93%", top: "38%", size: 3, duration: 28, delay: -13 },
  { left: "3%", top: "44%", size: 2, duration: 21, delay: -4 },
];
