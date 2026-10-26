import * as stylex from "@stylexjs/stylex";

import { skeletonSchema } from "./Skeleton.schema";
import { styles } from "./Skeleton.styles";
import type { SkeletonProps } from "./Skeleton.types";

/**
 * A loading placeholder shaped like the content it stands in for.
 *
 * Skeletons are faster to read than spinners, and they keep the layout still
 * while data loads. The placeholder is hidden from assistive technology, since
 * it carries no content. The surrounding view should announce the loading state.
 *
 * @param props - Width and height as CSS lengths.
 * @returns An empty, decorative `<div>`.
 * @throws {ZodError} When width or height is empty.
 */
export function Skeleton(props: SkeletonProps) {
  const parsed = skeletonSchema.parse(props);

  return (
    <div
      aria-hidden="true"
      style={{ width: parsed.width, height: parsed.height }}
      {...stylex.props(styles.base)}
    />
  );
}
