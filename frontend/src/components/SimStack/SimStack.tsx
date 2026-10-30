"use client";

import * as stylex from "@stylexjs/stylex";

import type { ManOfTheMatch } from "../../shared/types/awards.types";
import type { Owner } from "../../shared/types/lobby.types";
import { ownersInFixture } from "../../shared/utils/owner-match";
import { MatchEntry } from "../MatchEntry/MatchEntry";
import { styles } from "./SimStack.styles";
import type { SimStackProps } from "./SimStack.types";

/**
 * The sim's match stack. The match in play sits on top, then the completed matches with the
 * log lines that happened between them: a pause while substitutions are open, and each
 * substitution and skip, in the order they happened. Only what the viewer has reached is
 * passed in, so the stack never shows an upcoming fixture.
 *
 * @param props - The entries, the owners, the Man of the Match, and the player names.
 * @returns The stack as an ordered list, newest first.
 */
export function SimStack({
  entries,
  owners,
  manOfTheMatch,
  playerNames,
}: SimStackProps) {
  /**
   * @param guestId - The owner's guest ID.
   * @returns The owner's name, or a neutral word if the owner is not in the lobby.
   */
  function ownerName(guestId: string): string {
    return (
      owners.find((owner: Owner) => owner.guestId === guestId)?.displayName ??
      "An owner"
    );
  }

  /**
   * @param playerId - The player's ID.
   * @returns The player's name, or a neutral word if the name is not known.
   */
  function playerName(playerId: string): string {
    return playerNames.get(playerId) ?? "a player";
  }

  return (
    <ol aria-label="Match stack" {...stylex.props(styles.list)}>
      {entries.map((entry) => {
        switch (entry.kind) {
          case "pause": {
            const names = entry.guestIds.map(ownerName).join(" and ");
            return (
              <li key="pause">
                <output {...stylex.props(styles.pauseLog)}>
                  Sim paused. {names} making substitutions
                </output>
              </li>
            );
          }
          case "in-play":
          case "match": {
            const status = entry.kind === "match" ? "played" : "in-play";
            return (
              <li key={`${entry.kind}-${entry.index}`}>
                <MatchEntry
                  fixture={entry.fixture}
                  status={status}
                  owners={ownersInFixture(entry.fixture, owners)}
                  manOfTheMatch={
                    manOfTheMatch.find(
                      (award: ManOfTheMatch) =>
                        award.round === entry.fixture.round &&
                        award.homeFranchiseId ===
                          entry.fixture.homeFranchiseId &&
                        award.awayFranchiseId === entry.fixture.awayFranchiseId,
                    ) ?? null
                  }
                />
              </li>
            );
          }
          case "substitution": {
            const { substitution } = entry;
            return (
              <li
                key={`sub-${substitution.matchesPlayed}-${substitution.guestId}-${substitution.inPlayerId}`}
              >
                <p {...stylex.props(styles.log)}>
                  {ownerName(substitution.guestId)} made a substitution:{" "}
                  {playerName(substitution.outPlayerId)} off,{" "}
                  {playerName(substitution.inPlayerId)} on.
                </p>
              </li>
            );
          }
          case "skip":
            return (
              <li key={`skip-${entry.matchesPlayed}`}>
                <p {...stylex.props(styles.log)}>
                  The league was skipped after {entry.matchesPlayed} matches.
                  The remaining matches were simulated.
                </p>
              </li>
            );
          default:
            return null;
        }
      })}
    </ol>
  );
}
