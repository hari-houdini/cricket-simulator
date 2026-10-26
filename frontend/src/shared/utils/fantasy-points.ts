import {
  CAPTAIN_MULTIPLIER,
  POINTS_PER_CATCH,
  POINTS_PER_RUN,
  POINTS_PER_WICKET,
  VICE_CAPTAIN_MULTIPLIER,
} from "../const/awards.const";

/** The part of a performance that fantasy points and Man of the Match are worked from. */
export type ScoringLine = {
  readonly playerId: string;
  readonly runs: number;
  readonly wickets: number;
  readonly catches: number;
  readonly battingPosition: number;
};

/** A player's standing in one owner's squad. */
export type SquadRole = "captain" | "vice-captain" | "none";

/**
 * The fantasy points a performance earns, before any captain or vice-captain
 * multiplier.
 *
 * @param line - The runs, wickets and catches.
 * @returns The points.
 */
export function fantasyPointsFor(
  line: Pick<ScoringLine, "runs" | "wickets" | "catches">,
): number {
  return (
    line.runs * POINTS_PER_RUN +
    line.wickets * POINTS_PER_WICKET +
    line.catches * POINTS_PER_CATCH
  );
}

/**
 * The multiplier a squad role gives to a player's fantasy points.
 *
 * @param role - The player's role in the owner's squad.
 * @returns 2 for the captain, 1.5 for the vice-captain, and 1 for anyone else.
 */
export function multiplierFor(role: SquadRole): number {
  if (role === "captain") {
    return CAPTAIN_MULTIPLIER;
  }
  if (role === "vice-captain") {
    return VICE_CAPTAIN_MULTIPLIER;
  }
  return 1;
}

/**
 * Picks the Man of the Match: the most fantasy points, then the higher
 * `runs + 20 × wickets`, then the earlier batting position. The player id breaks
 * a final tie, so the same match always names the same player.
 *
 * @param lines - Everyone who played, with their fantasy points (before multipliers).
 * @returns The Man of the Match's id, or null when no one played.
 */
export function pickManOfTheMatch(
  lines: readonly (ScoringLine & { readonly fantasyPoints: number })[],
): string | null {
  const ranked = [...lines].sort(
    (left, right) =>
      right.fantasyPoints - left.fantasyPoints ||
      right.runs +
        POINTS_PER_WICKET * right.wickets -
        (left.runs + POINTS_PER_WICKET * left.wickets) ||
      left.battingPosition - right.battingPosition ||
      left.playerId.localeCompare(right.playerId),
  );
  return ranked[0]?.playerId ?? null;
}
