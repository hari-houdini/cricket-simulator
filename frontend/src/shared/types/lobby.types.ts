import type { z } from "zod";

import type {
  createLobbyInputSchema,
  joinLobbyInputSchema,
  lobbyPhaseSchema,
  lobbySchema,
  ownerSchema,
} from "./lobby.schema";

/** A lobby phase, derived from {@link lobbyPhaseSchema}. */
export type LobbyPhase = z.infer<typeof lobbyPhaseSchema>;

/** A guest who owns a franchise in a lobby, derived from {@link ownerSchema}. */
export type Owner = z.infer<typeof ownerSchema>;

/**
 * A lobby, derived from {@link lobbySchema} so the type and the validator
 * cannot drift apart.
 */
export type Lobby = z.infer<typeof lobbySchema>;

/** Input for creating a lobby, derived from {@link createLobbyInputSchema}. */
export type CreateLobbyInput = z.infer<typeof createLobbyInputSchema>;

/** Input for joining a lobby, derived from {@link joinLobbyInputSchema}. */
export type JoinLobbyInput = z.infer<typeof joinLobbyInputSchema>;
