import type { z } from "zod";

import type {
  beginSubstitutionInputSchema,
  cancelSubstitutionInputSchema,
  getSquadInputSchema,
  setStartingXiInputSchema,
  squadSchema,
  startingXiSchema,
  substituteInputSchema,
} from "./squad.schema";

/** A saved starting XI, derived from {@link startingXiSchema}. */
export type StartingXi = z.infer<typeof startingXiSchema>;

/** One owner's squad, derived from {@link squadSchema} so the type and the validator cannot drift. */
export type Squad = z.infer<typeof squadSchema>;

/** Input for reading a squad, derived from {@link getSquadInputSchema}. */
export type GetSquadInput = z.infer<typeof getSquadInputSchema>;

/** Input for saving a starting XI, derived from {@link setStartingXiInputSchema}. */
export type SetStartingXiInput = z.infer<typeof setStartingXiInputSchema>;

/** Input for the free substitution, derived from {@link substituteInputSchema}. */
export type SubstituteInput = z.infer<typeof substituteInputSchema>;

/** Input for opening a substitution, derived from {@link beginSubstitutionInputSchema}. */
export type BeginSubstitutionInput = z.infer<
  typeof beginSubstitutionInputSchema
>;

/** Input for cancelling a substitution, derived from {@link cancelSubstitutionInputSchema}. */
export type CancelSubstitutionInput = z.infer<
  typeof cancelSubstitutionInputSchema
>;
