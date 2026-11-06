/**
 * What the 3D franchise stage needs to draw one franchise: its colour from the
 * team data, and its state in the lobby from the viewer's side.
 */
export type StageSlot = {
  /** The franchise id, used only to keep the slots stable between renders. */
  readonly id: string;
  /** The franchise's team colour, as a CSS hex string. */
  readonly color: string;
  /** `free` is unclaimed, `taken` is held by another owner, `mine` is the viewer's. */
  readonly state: "free" | "taken" | "mine";
};
