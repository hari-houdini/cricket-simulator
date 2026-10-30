import { array, object } from "zod";

import { SQUAD_SIZE } from "../const/auction.const";
import { guestIdSchema } from "./lobby.schema";
import { playerSchema } from "./player.schema";
import { startingXiSchema } from "./squad.schema";

/**
 * One owner's lineup as the whole lobby reads it: the 15 players in the squad and the saved
 * starting XI. The XI is null until the owner saves one. Unlike a squad, a lineup is public from
 * the end of the auction, so every guest can read the teams the league is played with.
 */
export const lineupSchema = object({
  guestId: guestIdSchema,
  players: array(playerSchema).length(SQUAD_SIZE),
  startingXi: startingXiSchema.nullable(),
});

/** Every owner's lineup, in squad order. */
export const lineupsSchema = array(lineupSchema);
