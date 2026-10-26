import { array, boolean, object } from "zod";

import { SQUAD_SIZE } from "../const/auction.const";
import { XI_SIZE } from "../const/squad.const";
import { guestIdSchema, lobbyCodeSchema } from "./lobby.schema";
import { playerIdSchema, playerSchema } from "./player.schema";

/**
 * A saved starting XI: eleven players, one of them captain and one vice-captain.
 * The shape is checked here. Whether the XI is a legal one (wicket-keeper,
 * bowling options, distinct captains) is checked by `startingXiBlock`, so the
 * UI can say which rule failed.
 */
export const startingXiSchema = object({
  playerIds: array(playerIdSchema).length(XI_SIZE),
  captainId: playerIdSchema,
  viceCaptainId: playerIdSchema,
});

/**
 * One owner's squad as the UI sees it. `startingXi` is null until the owner
 * saves an XI. `locked` is true from the first match, and `substitutionUsed`
 * records whether the one free swap has been spent.
 */
export const squadSchema = object({
  guestId: guestIdSchema,
  players: array(playerSchema).max(SQUAD_SIZE),
  startingXi: startingXiSchema.nullable(),
  locked: boolean(),
  substitutionUsed: boolean(),
});

/** Input for reading one owner's squad. */
export const getSquadInputSchema = object({
  code: lobbyCodeSchema,
  guestId: guestIdSchema,
});

/**
 * Input for saving a starting XI. The ids are not length-checked here, so an
 * XI of the wrong size gets a specific reason from the rules, not a schema error.
 */
export const setStartingXiInputSchema = object({
  code: lobbyCodeSchema,
  guestId: guestIdSchema,
  playerIds: array(playerIdSchema),
  captainId: playerIdSchema,
  viceCaptainId: playerIdSchema,
});

/** Input for the one free substitution: `outPlayerId` leaves the XI for `inPlayerId`. */
export const substituteInputSchema = object({
  code: lobbyCodeSchema,
  guestId: guestIdSchema,
  outPlayerId: playerIdSchema,
  inPlayerId: playerIdSchema,
});
