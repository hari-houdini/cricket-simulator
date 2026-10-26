import * as stylex from "@stylexjs/stylex";

import { tokens } from "../../shared/const/tokens.stylex";

/**
 * StyleX rules for {@link Card}. Elevation rules are top-level keys, because
 * `stylex.props` only type-checks top-level keys with StyleX 0.19.
 */
export const styles = stylex.create({
  base: {
    backgroundColor: tokens.colorMid,
    color: tokens.colorText,
    borderRadius: tokens.radiusMd,
    padding: tokens.spaceMd,
  },
  elevationRaised: {
    boxShadow: tokens.shadowRaised,
  },
  elevationSubtle: {
    boxShadow: tokens.shadowSubtle,
  },
});
