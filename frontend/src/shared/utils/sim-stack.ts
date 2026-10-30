import type { Fixture } from "../types/league.types";
import type { Substitution } from "../types/lobby.types";

/**
 * One entry in the match stack, newest first. A match is a card, a substitution
 * and a skip are log lines, and a pause is a log line shown while the sim waits.
 */
export type StackEntry =
  | { readonly kind: "pause"; readonly guestIds: readonly string[] }
  | {
      readonly kind: "in-play";
      readonly index: number;
      readonly fixture: Fixture;
    }
  | {
      readonly kind: "match";
      readonly index: number;
      readonly fixture: Fixture;
    }
  | { readonly kind: "substitution"; readonly substitution: Substitution }
  | { readonly kind: "skip"; readonly matchesPlayed: number };

/** What the stack is built from. */
export type StackInput = {
  /** Every league fixture in schedule order. A fixture is played when its result is set. */
  readonly fixtures: readonly Fixture[];
  /**
   * How many matches the viewer has been shown. A played match past this count is in play
   * and shows no result yet, and no later match appears at all.
   */
  readonly revealed: number;
  /** Every substitution made so far, in order. */
  readonly substitutions: readonly Substitution[];
  /** How many matches had been played when the league was skipped, or null if it was not. */
  readonly skippedAfterMatches: number | null;
  /** The guests whose substitution is open. The sim waits while any is. */
  readonly substituting: readonly string[];
};

/**
 * The log lines that happened after exactly `matchesPlayed` matches, newest first. A
 * substitution made then sits between the match before it and the match after it, so
 * a viewer reads it in the order it happened.
 *
 * @param input - The stack's input.
 * @param matchesPlayed - The number of matches played at the point.
 * @returns The substitution and skip entries at that point.
 */
function logsAt(input: StackInput, matchesPlayed: number): StackEntry[] {
  const entries: StackEntry[] = [];
  for (const substitution of [...input.substitutions].reverse()) {
    if (substitution.matchesPlayed === matchesPlayed) {
      entries.push({ kind: "substitution", substitution });
    }
  }
  if (input.skippedAfterMatches === matchesPlayed) {
    entries.push({ kind: "skip", matchesPlayed });
  }
  return entries;
}

/**
 * Builds the sim's match stack, newest first. The match in play, if any, sits at the top,
 * then the completed matches the viewer has been shown, each followed by the log lines that
 * happened after it. Fixtures past the viewer's position are left out, so the stack never
 * shows an upcoming match or a result the viewer has not reached.
 *
 * @param input - The fixtures, the viewer's position, and the season's log events.
 * @returns The entries, newest first.
 */
export function stackEntries(input: StackInput): StackEntry[] {
  const played = input.fixtures.filter(
    (fixture) => fixture.result !== null,
  ).length;
  const leagueLength = input.fixtures.length;
  const entries: StackEntry[] = [];

  if (input.substituting.length > 0) {
    entries.push({ kind: "pause", guestIds: input.substituting });
  }

  // A substitution made in the playoffs counts the playoff matches too, so it lies past the
  // league. The stack does not list playoff matches, so such a line waits until every league
  // match is shown, then sits at the top.
  if (input.revealed === leagueLength) {
    for (const substitution of [...input.substitutions].reverse()) {
      if (substitution.matchesPlayed > leagueLength) {
        entries.push({ kind: "substitution", substitution });
      }
    }
  }

  const inPlay = input.fixtures
    .slice(input.revealed, played)
    .map((fixture, offset) => ({
      fixture,
      index: input.revealed + offset,
    }))
    .slice(0, 1);
  for (const { fixture, index } of inPlay) {
    entries.push({ kind: "in-play", index, fixture });
  }

  entries.push(...logsAt(input, input.revealed));

  const shown = input.fixtures
    .slice(0, input.revealed)
    .map((fixture, index) => ({ fixture, index }));
  for (const { fixture, index } of [...shown].reverse()) {
    entries.push({ kind: "match", index, fixture });
    entries.push(...logsAt(input, index));
  }

  return entries;
}
