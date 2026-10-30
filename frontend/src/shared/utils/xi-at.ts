import type { Substitution } from "../types/lobby.types";
import type { StartingXi } from "../types/squad.types";

/**
 * The XI an owner had after a given number of league matches. The saved XI is the
 * starting point, and each of the owner's substitutions made after that point is
 * undone, newest first, so the XI returns to its state at `matchesPlayed`.
 *
 * The captain and vice-captain never change: neither can be substituted out, so
 * only the playing players are rebuilt.
 *
 * @param startingXi - The owner's saved XI, or null when none was saved.
 * @param substitutions - Every substitution in the lobby, in the order they were made.
 * @param guestId - The owner whose XI to rebuild.
 * @param matchesPlayed - The number of league matches played at the point to rebuild.
 * @returns The XI at that point, or null when the owner saved none.
 */
export function xiAt(
  startingXi: StartingXi | null,
  substitutions: readonly Substitution[],
  guestId: string,
  matchesPlayed: number,
): StartingXi | null {
  if (startingXi === null) {
    return null;
  }
  const later = substitutions.filter(
    (substitution) =>
      substitution.guestId === guestId &&
      substitution.matchesPlayed > matchesPlayed,
  );
  let playerIds = [...startingXi.playerIds];
  for (const substitution of [...later].reverse()) {
    playerIds = playerIds.map((id) =>
      id === substitution.inPlayerId ? substitution.outPlayerId : id,
    );
  }
  return { ...startingXi, playerIds };
}
