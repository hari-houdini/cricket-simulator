"use client";

import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";

import { Button } from "../../components/Button/Button";
import { TEAMS } from "../../shared/const/teams.const";
import type { Lobby } from "../../shared/types/lobby.types";
import {
  franchiseClaimBlock,
  franchiseStatus,
} from "../../shared/utils/franchise-claim";
import { styles } from "./ProtoFranchiseGrid.styles";

/** The props for {@link ProtoFranchiseGrid}. */
type ProtoFranchiseGridProps = {
  /** The lobby whose franchises are shown. */
  readonly lobby: Lobby;
  /** The guest viewing the grid. */
  readonly guestId: string;
  /** True while a claim is in flight, so a second click is not sent. */
  readonly pending: boolean;
  /** Claims a franchise for the viewer. */
  readonly onClaim: (franchiseId: string) => void;
};

/**
 * The franchise pick, as a responsive grid of the ten IPL franchises. Each card
 * shows the team's code and name, its status in words, and a claim action where
 * the franchise is free. The status is text, not colour alone: the words say
 * "Free", "Taken by" or "Yours", and the colour only reinforces them.
 *
 * It applies the same claim rules as the production grid, through the shared
 * utilities, so a refused claim is shown the same way.
 *
 * @param props - The lobby, the viewer, the pending flag, and the claim handler.
 * @returns The grid of franchise cards.
 */
export function ProtoFranchiseGrid({
  lobby,
  guestId,
  pending,
  onClaim,
}: ProtoFranchiseGridProps) {
  return (
    <ul aria-label="Franchises" {...stylex.props(styles.grid)}>
      {TEAMS.map((team) => {
        const status = franchiseStatus(lobby, guestId, team.id);
        const blocked = franchiseClaimBlock(lobby, guestId, team.id) !== null;
        const mine = status.kind === "owned" && status.isMine;
        const taken = status.kind === "owned" && !status.isMine;

        let statusText: string;
        if (mine) {
          statusText = "Yours";
        } else if (taken) {
          statusText = `Taken by ${status.kind === "owned" ? status.owner.displayName : ""}`;
        } else {
          statusText = "Free";
        }

        return (
          <li
            key={team.id}
            style={{ "--team": team.color } as CSSProperties}
            {...stylex.props(styles.card)}
          >
            <p {...stylex.props(styles.code)}>{team.abbreviation}</p>
            <p {...stylex.props(styles.name)}>{team.name}</p>
            <div {...stylex.props(styles.footer)}>
              <span
                {...stylex.props(
                  styles.status,
                  mine && styles.statusMine,
                  !mine && !taken && styles.statusFree,
                  taken && styles.statusTaken,
                )}
              >
                {statusText}
              </span>
              {!mine && !taken ? (
                <Button
                  disabled={pending || blocked}
                  aria-label={`Claim ${team.name}`}
                  onClick={() => onClaim(team.id)}
                >
                  Claim
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
