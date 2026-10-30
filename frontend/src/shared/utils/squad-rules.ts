import {
  FIRST_MATCH_ROUND,
  MIN_BOWLING_OPTIONS,
  REQUIRED_WICKET_KEEPERS,
  XI_SIZE,
} from "../const/squad.const";
import type { Player } from "../types/player.types";
import type { SubstitutionBlock, XiBlock } from "../types/refusal.types";
import type { StartingXi } from "../types/squad.types";

/**
 * A starting XI being checked. The captain and vice-captain are nullable so a
 * half-chosen XI can be checked while the owner is still picking.
 */
export type XiSelection = {
  readonly playerIds: readonly string[];
  readonly captainId: string | null;
  readonly viceCaptainId: string | null;
};

/**
 * Whether a player counts as a bowling option for the XI minimum: a bowler or
 * an all-rounder. The design gives no bowling threshold for all-rounders, so
 * none is applied here.
 *
 * @param player - The player to check.
 * @returns True when the player counts towards {@link MIN_BOWLING_OPTIONS}.
 */
export function isBowlingOption(player: Player): boolean {
  return player.role === "bowler" || player.role === "all-rounder";
}

/**
 * Checks a starting XI against the squad. Returns the first rule it breaks, so
 * the UI can name one problem at a time.
 *
 * @param squad - The owner's squad.
 * @param selection - The XI to check, with its captain and vice-captain.
 * @returns The reason the XI is illegal, or null when it is legal.
 */
export function startingXiBlock(
  squad: readonly Player[],
  selection: XiSelection,
): XiBlock | null {
  const { playerIds, captainId, viceCaptainId } = selection;
  if (playerIds.length !== XI_SIZE) {
    return "wrong-size";
  }
  if (new Set(playerIds).size !== playerIds.length) {
    return "duplicate";
  }

  const inSquad = new Map(squad.map((player) => [player.id, player]));
  const xi: Player[] = [];
  for (const id of playerIds) {
    const player = inSquad.get(id);
    if (!player) {
      return "not-in-squad";
    }
    xi.push(player);
  }

  if (captainId === null || !playerIds.includes(captainId)) {
    return "captain-not-in-xi";
  }
  if (viceCaptainId === null || !playerIds.includes(viceCaptainId)) {
    return "vice-captain-not-in-xi";
  }
  if (captainId === viceCaptainId) {
    return "same-captain-and-vice-captain";
  }

  const wicketKeepers = xi.filter(
    (player) => player.role === "wicket-keeper",
  ).length;
  if (wicketKeepers < REQUIRED_WICKET_KEEPERS) {
    return "no-wicket-keeper";
  }
  if (wicketKeepers > REQUIRED_WICKET_KEEPERS) {
    return "too-many-wicket-keepers";
  }

  const bowlingOptions = xi.filter(isBowlingOption).length;
  if (bowlingOptions < MIN_BOWLING_OPTIONS) {
    return "too-few-bowling-options";
  }
  return null;
}

/**
 * Whether the starting XI is locked. It locks from the first match on, when
 * the lobby reaches {@link FIRST_MATCH_ROUND}.
 *
 * @param round - The lobby's round. 0 means no match has been played.
 * @returns True once the first match has been played.
 */
export function isXiLocked(round: number): boolean {
  return round >= FIRST_MATCH_ROUND;
}

/**
 * The inputs to a substitution check.
 */
export type SubstitutionCheck = {
  readonly squad: readonly Player[];
  readonly startingXi: StartingXi | null;
  readonly substitutionUsed: boolean;
  readonly round: number;
  readonly outPlayerId: string;
  readonly inPlayerId: string;
};

/**
 * Checks the one free substitution: a starting-XI player leaves for a squad
 * player who is not in the XI. It opens from the first match, can be used once
 * per season, and must leave a legal XI behind.
 *
 * @param check - The squad, the saved XI, the lobby round and the two players.
 * @returns The reason the swap is refused, or null when it is allowed.
 */
export function substitutionBlock(
  check: SubstitutionCheck,
): SubstitutionBlock | null {
  const {
    squad,
    startingXi,
    substitutionUsed,
    round,
    outPlayerId,
    inPlayerId,
  } = check;
  if (!isXiLocked(round)) {
    return "not-yet-played";
  }
  if (substitutionUsed) {
    return "already-used";
  }
  if (startingXi === null) {
    return "no-starting-xi";
  }
  if (!startingXi.playerIds.includes(outPlayerId)) {
    return "out-not-in-xi";
  }
  if (
    outPlayerId === startingXi.captainId ||
    outPlayerId === startingXi.viceCaptainId
  ) {
    return "captain-or-vice-captain";
  }
  if (!squad.some((player) => player.id === inPlayerId)) {
    return "in-not-in-squad";
  }
  if (startingXi.playerIds.includes(inPlayerId)) {
    return "in-already-in-xi";
  }

  const playerIds = startingXi.playerIds.map((id) =>
    id === outPlayerId ? inPlayerId : id,
  );
  return startingXiBlock(squad, {
    playerIds,
    captainId: startingXi.captainId,
    viceCaptainId: startingXi.viceCaptainId,
  });
}
