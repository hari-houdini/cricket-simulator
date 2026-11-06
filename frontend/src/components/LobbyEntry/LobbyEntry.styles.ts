import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link LobbyEntry}. The root is the motion scope: the panel
 * grid and the dissolve wash sit inside it, behind or above the form card. All
 * colours and spacing come from the design tokens.
 */
export const styles = stylex.create({
  root: {
    position: "relative",
  },
  /**
   * The panel grid covers the whole viewport, behind the page content. It is an 8×6
   * grid of cells that light up by distance from the pointer. It is fixed, so it
   * stays put while the page scrolls, and at `zIndex: -1` it sits behind the opaque
   * form card and the header. It never takes pointer events.
   */
  grid: {
    position: "fixed",
    inset: 0,
    zIndex: -1,
    display: "grid",
    gridTemplateColumns: "repeat(8, 1fr)",
    gridTemplateRows: "repeat(6, 1fr)",
    pointerEvents: "none",
  },
  /** One grid cell. It rests invisible, so the grid appears only when the pointer moves. */
  cell: {
    backgroundColor: tokens.colorFloodlight,
    outline: `${tokens.borderWidthHairline} solid ${tokens.colorLine}`,
    opacity: 0,
  },
  /** The form card wrapper. Raised above the grid so the grid stays behind it. */
  card: {
    position: "relative",
    zIndex: 1,
  },
  /**
   * The floodlight wash for the submit dissolve. It rests at `opacity: 0`, so
   * nothing shows until a submit starts. It sits above the card and never takes
   * pointer events.
   */
  wash: {
    position: "absolute",
    inset: 0,
    zIndex: 2,
    backgroundColor: tokens.colorFloodlight,
    opacity: 0,
    pointerEvents: "none",
  },
});
