import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link FranchiseStage}. The frame is the same size whether the
 * stage is still loading or drawn, so the page does not jump when the 3D layer
 * arrives. It ignores the pointer, so the franchise cards underneath stay the only
 * controls.
 */
export const styles = stylex.create({
  frame: {
    position: "relative",
    width: "100%",
    height: "clamp(240px, 42vw, 380px)",
    borderRadius: tokens.radiusLg,
    overflow: "hidden",
    pointerEvents: "none",
  },
  canvas: {
    position: "absolute",
    inset: 0,
  },
});
