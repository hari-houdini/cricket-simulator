import type { z } from "zod";

import type {
  fixtureSchema,
  leagueSchema,
  matchSchema,
  matchScoreSchema,
  setSkipVoteInputSchema,
  standingSchema,
} from "./league.schema";

/** The score of a played league match, derived from {@link matchScoreSchema}. */
export type MatchScore = z.infer<typeof matchScoreSchema>;

/** One league fixture, derived from {@link fixtureSchema}. */
export type Fixture = z.infer<typeof fixtureSchema>;

/** One row of the league table, derived from {@link standingSchema}. */
export type Standing = z.infer<typeof standingSchema>;

/** The league view, derived from {@link leagueSchema}. */
export type League = z.infer<typeof leagueSchema>;

/** One played league match, derived from {@link matchSchema}. */
export type Match = z.infer<typeof matchSchema>;

/** Input for voting to skip the league, derived from {@link setSkipVoteInputSchema}. */
export type SetSkipVoteInput = z.infer<typeof setSkipVoteInputSchema>;
