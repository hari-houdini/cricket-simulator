import { BASE_PRICE_LAKHS_BY_CATEGORY } from "../../shared/const/player.const";
import type { Player } from "../../shared/types/player.types";
import type { Squad, StartingXi } from "../../shared/types/squad.types";

/**
 * Fixtures for the squad stories. Every player is a capped player, so the base
 * price matches the category, as the schema requires. The bench includes a
 * bowling all-rounder below the threshold, so the rules stories see a real
 * difference.
 */

/** Player ids and names for the squad, in squad order. */
const ROSTER: readonly (readonly [
  id: string,
  name: string,
  role: Player["role"],
  bowling: number,
])[] = [
  ["wk1", "Rohan Kale", "wicket-keeper", 0],
  ["wk2", "Sameer Nair", "wicket-keeper", 0],
  ["b1", "Ankit Verma", "bowler", 72],
  ["b2", "Dev Iyer", "bowler", 68],
  ["b3", "Tanmay Rao", "bowler", 65],
  ["b4", "Yash Pillai", "bowler", 61],
  ["ar-bowls", "Karan Joshi", "all-rounder", 60],
  ["ar-bats", "Nikhil Das", "all-rounder", 35],
  ["bat1", "Aman Sethi", "batter", 0],
  ["bat2", "Varun Menon", "batter", 0],
  ["bat3", "Siddharth Bose", "batter", 0],
  ["bat4", "Ishaan Gupta", "batter", 0],
  ["bat5", "Pranav Shah", "batter", 0],
  ["bat6", "Kunal Rao", "batter", 0],
  ["bat7", "Harsh Mehra", "batter", 0],
];

/** The players in the squad, built from {@link ROSTER}. */
export const squadPlayers: readonly Player[] = ROSTER.map(
  ([id, name, role, bowling]) => ({
    id,
    name,
    franchiseId: "csk",
    role,
    category: "capped",
    retired: false,
    batting: 60,
    bowling,
    fielding: 60,
    basePrice: BASE_PRICE_LAKHS_BY_CATEGORY.capped,
  }),
);

/** A legal XI from the roster: a keeper, four bowlers, the bowling all-rounder and five batters. */
export const legalXi: StartingXi = {
  playerIds: [
    "wk1",
    "b1",
    "b2",
    "b3",
    "b4",
    "ar-bowls",
    "bat1",
    "bat2",
    "bat3",
    "bat4",
    "bat5",
  ],
  captainId: "bat1",
  viceCaptainId: "b1",
};

/** A squad before the XI is chosen: the owner is still picking. */
export const draftSquad: Squad = {
  guestId: "asha",
  players: [...squadPlayers],
  startingXi: null,
  locked: false,
  substitutionUsed: false,
};

/** A squad after the first match: the XI is saved and locked, and the free substitution is still open. */
export const lockedSquad: Squad = {
  ...draftSquad,
  startingXi: legalXi,
  locked: true,
};

/** A locked squad whose free substitution has already been used. */
export const usedSubstitutionSquad: Squad = {
  ...lockedSquad,
  substitutionUsed: true,
};

/** The display name of a roster player, for the stories' accessible names. */
export const nameOf = (id: string): string =>
  ROSTER.find(([rosterId]) => rosterId === id)?.[1] ?? id;
