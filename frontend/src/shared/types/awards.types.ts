import type { z } from "zod";

import type {
  awardsSchema,
  fairPlayFranchiseSchema,
  fairPlayLineSchema,
  manOfTheMatchSchema,
  ownerAwardLineSchema,
  playerAwardLineSchema,
} from "./awards.schema";

/** A player's line on an individual award, derived from {@link playerAwardLineSchema}. */
export type PlayerAwardLine = z.infer<typeof playerAwardLineSchema>;

/** An owner's line on the Most Valuable Player award, derived from {@link ownerAwardLineSchema}. */
export type OwnerAwardLine = z.infer<typeof ownerAwardLineSchema>;

/** One player's average effect on a Fair Play screen, derived from {@link fairPlayLineSchema}. */
export type FairPlayLine = z.infer<typeof fairPlayLineSchema>;

/** A franchise's Fair Play screen, derived from {@link fairPlayFranchiseSchema}. */
export type FairPlayFranchise = z.infer<typeof fairPlayFranchiseSchema>;

/** The Man of the Match in one match, derived from {@link manOfTheMatchSchema}. */
export type ManOfTheMatch = z.infer<typeof manOfTheMatchSchema>;

/** Every award for the season so far, derived from {@link awardsSchema}. */
export type Awards = z.infer<typeof awardsSchema>;
