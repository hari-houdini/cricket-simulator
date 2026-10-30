import type { z } from "zod";

import type { gameEventSchema } from "./game-event.schema";

/** A live event in a lobby, derived from {@link gameEventSchema}. */
export type GameEvent = z.infer<typeof gameEventSchema>;

/** Receives each live event as it happens. */
export type GameEventListener = (event: GameEvent) => void;

/** Stops a subscription. Calling it again does nothing. */
export type Unsubscribe = () => void;
