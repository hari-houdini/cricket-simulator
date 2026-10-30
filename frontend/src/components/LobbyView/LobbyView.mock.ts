import type { Lobby } from "../../shared/types/lobby.types";

/**
 * Lobby fixtures for stories. Guests are named so each story can say who is
 * looking: `asha` owns Chennai, `ravi` owns Mumbai, and `meera` has not joined.
 */

/** Two owners, one franchise each, with franchises still free. */
export const twoOwnerLobby: Lobby = {
  id: "lobby-story-1",
  code: "ABC123",
  name: "Sunday League",
  phase: "auction",
  auctionStatus: "waiting",
  round: 0,
  seedVersion: "1.1.0",
  simPaused: false,
  substituting: [],
  skipVoters: [],
  skipThreshold: 2,
  substitutions: [],
  skippedAfterMatches: null,
  owners: [
    { guestId: "asha", displayName: "Asha", franchiseId: "csk" },
    { guestId: "ravi", displayName: "Ravi", franchiseId: "mi" },
  ],
};

/** One owner who has joined but not yet picked a franchise. */
export const unclaimedLobby: Lobby = {
  ...twoOwnerLobby,
  owners: [{ guestId: "asha", displayName: "Asha", franchiseId: null }],
};

/** Ten owners, each holding a different franchise, so the lobby is full. */
export const fullLobby: Lobby = {
  ...twoOwnerLobby,
  owners: [
    "csk",
    "mi",
    "rcb",
    "kkr",
    "dc",
    "pbks",
    "rr",
    "srh",
    "lsg",
    "gt",
  ].map((franchiseId, index) => ({
    guestId: `owner-${index}`,
    displayName: `Owner ${index + 1}`,
    franchiseId,
  })),
};
