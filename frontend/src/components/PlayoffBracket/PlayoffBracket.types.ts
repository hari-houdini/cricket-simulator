import type { PlayoffSlotView } from "../../shared/types/playoffs.types";

/** Props for {@link PlayoffBracket}. */
export type PlayoffBracketProps = {
  /** The four slots in IPL order. */
  readonly matches: readonly PlayoffSlotView[];
  /** The franchise that won the Final, or null before it is played. */
  readonly champion: string | null;
};
