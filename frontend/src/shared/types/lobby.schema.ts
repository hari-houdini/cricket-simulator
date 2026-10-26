import { array, number, object, string, enum as zodEnum } from "zod";

/**
 * The phases a lobby moves through, in order: the live auction, the league,
 * the playoffs, then complete. Matches `phase` in `docs/game-design.md` section 10.
 */
export const lobbyPhaseSchema = zodEnum([
  "auction",
  "league",
  "playoffs",
  "complete",
]);

/**
 * Shareable lobby code: six uppercase letters or digits, such as `"ABC123"`.
 * Input is normalised to uppercase before it is checked against this schema.
 */
export const lobbyCodeSchema = string().regex(/^[A-Z0-9]{6}$/);

/**
 * Identifies a guest across refreshes. The browser keeps it in `localStorage`,
 * so a refresh keeps the same franchise (`docs/game-design.md` section 2).
 */
export const guestIdSchema = string().min(1).max(64);

/**
 * The name an owner shows in the lobby. Trimmed, and capped at 24 characters so
 * it fits the owner list on a phone.
 */
export const displayNameSchema = string().trim().min(1).max(24);

/** A guest who owns a franchise in a lobby. */
export const ownerSchema = object({
  guestId: guestIdSchema,
  displayName: displayNameSchema,
});

/**
 * A lobby, as the frontend sees it. Owners are capped at 10, one per IPL
 * franchise. Round runs from 0 (before the first match) to 18.
 */
export const lobbySchema = object({
  id: string().min(1),
  code: lobbyCodeSchema,
  name: string().trim().min(1).max(40),
  phase: lobbyPhaseSchema,
  round: number().int().min(0).max(18),
  owners: array(ownerSchema).max(10),
});

/** Input for creating a lobby. The creator becomes its first owner. */
export const createLobbyInputSchema = object({
  name: string().trim().min(1).max(40),
  guestId: guestIdSchema,
  displayName: displayNameSchema,
});

/** Input for joining a lobby by its code. */
export const joinLobbyInputSchema = object({
  code: lobbyCodeSchema,
  guestId: guestIdSchema,
  displayName: displayNameSchema,
});
