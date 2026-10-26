import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { TEAMS } from "../../shared/const/teams.const";
import {
  franchiseClaimBlock,
  franchiseStatus,
} from "../../shared/utils/franchise-claim";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { styles } from "./FranchiseGrid.styles";
import type { FranchiseGridProps } from "./FranchiseGrid.types";

/**
 * The ten IPL franchises, each with its owner or its claim button. A franchise
 * someone else holds is shown as taken and has no button. A franchise no one
 * holds can be claimed, and a system squad runs it if it is still unclaimed when
 * the season starts (`docs/game-design.md` section 2).
 *
 * Status is text, not colour alone, so a guest who cannot see the franchise
 * colour still knows whether it is free.
 *
 * @param props - The lobby, the viewing guest, the pending flag, and the claim handler.
 * @returns A list of the ten franchises.
 */
export function FranchiseGrid({
  lobby,
  guestId,
  pending,
  onClaim,
}: FranchiseGridProps) {
  return (
    <ul aria-label="Franchises" {...stylex.props(styles.list)}>
      {TEAMS.map((team) => {
        const status = franchiseStatus(lobby, guestId, team.id);
        const blocked = franchiseClaimBlock(lobby, guestId, team.id) !== null;

        let statusText: string;
        let action: ReactNode = null;
        if (status.kind === "owned" && status.isMine) {
          statusText = "Your franchise";
        } else if (status.kind === "owned") {
          statusText = `Taken by ${status.owner.displayName}`;
        } else {
          statusText = "Free to claim";
          action = (
            <Button
              size="sm"
              variant="secondary"
              disabled={pending || blocked}
              aria-label={`Claim ${team.name}`}
              onClick={() => onClaim(team.id)}
            >
              Claim
            </Button>
          );
        }

        return (
          <li key={team.id} {...stylex.props(styles.item)}>
            <div {...stylex.props(styles.identity)}>
              <Badge kind="team" label={team.abbreviation} color={team.color} />
              <span {...stylex.props(styles.name)}>{team.name}</span>
            </div>
            <div {...stylex.props(styles.footer)}>
              <span {...stylex.props(styles.status)}>{statusText}</span>
              {action}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
