import { TEAMS } from "../const/teams.const";

/**
 * The full name of a franchise for display. An id that is not in the seed is
 * shown as the id, so a stray value still reads as something.
 *
 * @param franchiseId - The franchise id, such as `"csk"`.
 * @returns The franchise's name, such as `"Chennai Super Kings"`.
 */
export function franchiseName(franchiseId: string): string {
  return TEAMS.find((team) => team.id === franchiseId)?.name ?? franchiseId;
}

/**
 * The short name of a franchise for tight spaces. An id that is not in the seed
 * is shown in upper case.
 *
 * @param franchiseId - The franchise id, such as `"csk"`.
 * @returns The abbreviation, such as `"CSK"`.
 */
export function franchiseAbbreviation(franchiseId: string): string {
  return (
    TEAMS.find((team) => team.id === franchiseId)?.abbreviation ??
    franchiseId.toUpperCase()
  );
}
