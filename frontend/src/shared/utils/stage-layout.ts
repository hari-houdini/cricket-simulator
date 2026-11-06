/**
 * Pure layout maths for the 3D franchise stage. It holds no three.js code, so the
 * ring can be tested in plain Vitest and reused if the stage is drawn another way.
 */

/**
 * Where one franchise sits on the stage's ring: its angle around the ring and its
 * position on the flat ground plane (the X and Z axes).
 */
export type RingPoint = {
  /** The angle in radians, measured from the front of the stage. */
  readonly angle: number;
  /** The position on the X axis, left to right. */
  readonly x: number;
  /** The position on the Z axis, toward the viewer when positive. */
  readonly z: number;
};

/**
 * Places the `index`-th of `count` franchises evenly around a circle. The first
 * franchise sits at the front of the stage (positive Z), nearest the viewer, so the
 * ring reads from the first card to the last as it turns.
 *
 * @param index - The franchise's position in the ring, from 0 up to `count - 1`.
 * @param count - How many franchises share the ring.
 * @param radius - The ring's radius in scene units.
 * @returns The franchise's angle and its position on the ground plane.
 * @throws {RangeError} When `count` is below 1, or `index` is outside `[0, count)`.
 */
export function ringPoint(
  index: number,
  count: number,
  radius: number,
): RingPoint {
  if (count < 1) {
    throw new RangeError(`count must be at least 1, got ${count}`);
  }
  if (index < 0 || index >= count) {
    throw new RangeError(`index ${index} is outside 0 to ${count - 1}`);
  }
  const angle = (index / count) * Math.PI * 2;
  return {
    angle,
    x: Math.sin(angle) * radius,
    z: Math.cos(angle) * radius,
  };
}

/**
 * The ring's radius for a stage of the given width. Phones get a tighter ring so
 * all ten franchises stay in frame; wider stages open the ring up.
 *
 * @param widthPx - The stage's width in CSS pixels.
 * @returns The ring radius in scene units.
 */
export function stageRadiusFor(widthPx: number): number {
  if (widthPx < 480) {
    return 2.1;
  }
  if (widthPx < 768) {
    return 2.6;
  }
  return 3;
}

/**
 * How far the camera stands from the ring for a stage of the given width. The
 * camera pulls back on narrow stages so the ring is not clipped at the edges.
 *
 * @param widthPx - The stage's width in CSS pixels.
 * @returns The camera's distance from the centre of the ring, in scene units.
 */
export function stageCameraDistanceFor(widthPx: number): number {
  if (widthPx < 480) {
    return 10.5;
  }
  if (widthPx < 768) {
    return 9.4;
  }
  return 8.6;
}
