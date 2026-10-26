import { ZodError } from "zod";

import {
  FranchiseClaimClosedError,
  FranchiseNotFoundError,
  FranchiseTakenError,
  LobbyFullError,
  LobbyNotFoundError,
  NotAnOwnerError,
} from "./game-api.errors";

/**
 * Turns an error from the game API into a sentence the guest can act on. The
 * raw error text is for developers, so it is never shown.
 *
 * @param error - Whatever the API call rejected with.
 * @returns A message that says what went wrong and what to do next.
 */
export function describeApiError(error: unknown): string {
  if (error instanceof LobbyNotFoundError) {
    return "No lobby has that code. Check the code and try again.";
  }
  if (error instanceof LobbyFullError) {
    return "This lobby is full. Every franchise already has an owner.";
  }
  if (error instanceof FranchiseTakenError) {
    return "Another owner already holds that franchise. Pick a free one.";
  }
  if (error instanceof FranchiseClaimClosedError) {
    return "Franchises can no longer be changed in this lobby.";
  }
  if (error instanceof NotAnOwnerError) {
    return "Join the lobby before you pick a franchise.";
  }
  if (error instanceof FranchiseNotFoundError) {
    return "That franchise is not part of this season.";
  }
  if (error instanceof ZodError) {
    return "Check what you entered and try again.";
  }
  return "Something went wrong. Try again.";
}
