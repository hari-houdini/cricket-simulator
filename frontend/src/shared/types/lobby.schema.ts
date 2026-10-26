import { array, number, object, string, enum as zodEnum } from "zod";

import {
  LAST_ROUND,
  LOBBY_CODE_LENGTH,
  MAX_OWNERS,
} from "../const/lobby.const";
import { seedVersionSchema } from "./seed.schema";

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
 * Shareable lobby code: letters or digits, such as `"ABC123"`. Input is
 * normalised to uppercase before it is checked against this schema.
 */
export const lobbyCodeSchema = string().regex(
  new RegExp(`^[A-Z0-9]{${LOBBY_CODE_LENGTH}}$`),
);

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
 * A lobby, as the frontend sees it. Owners are capped at {@link MAX_OWNERS}, one
 * per IPL franchise. Round runs from 0 (before the first match) to
 * {@link LAST_ROUND}.
 */
export const lobbySchema = object({
  id: string().min(1),
  code: lobbyCodeSchema,
  name: string().trim().min(1).max(40),
  phase: lobbyPhaseSchema,
  round: number().int().min(0).max(LAST_ROUND),
  owners: array(ownerSchema).max(MAX_OWNERS),
  /**
   * The seed data set the lobby was created with. A season replays against this
   * version, so the lobby never silently picks up later player data.
   */
  seedVersion: seedVersionSchema,
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
