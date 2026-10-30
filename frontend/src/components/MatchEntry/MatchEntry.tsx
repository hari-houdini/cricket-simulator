"use client";

import * as stylex from "@stylexjs/stylex";
import { useId, useState } from "react";

import { focusRing } from "../../shared/const/focus-ring.styles";
import type { MatchScore } from "../../shared/types/league.types";
import type { Owner } from "../../shared/types/lobby.types";
import { franchiseName } from "../../shared/utils/franchise-label";
import { Scorecard } from "../Scorecard/Scorecard";
import { styles } from "./MatchEntry.styles";
import type { MatchEntryProps } from "./MatchEntry.types";

/**
 * The badge that names the owners in a match. Both names show for a match between two owners,
 * and the one name for a match with one owner. The text carries the highlight, so the colour
 * is never the only signal.
 *
 * @param owners - The owners in the match, home owner first.
 * @returns The badge text, or null when no owner plays in the match.
 */
function ownerBadge(owners: readonly Owner[]): string | null {
  if (owners.length === 0) {
    return null;
  }
  if (owners.length === 1) {
    return `${owners[0]?.displayName ?? ""} plays this match`;
  }
  return `${owners[0]?.displayName ?? ""} vs ${owners[1]?.displayName ?? ""}`;
}

/**
 * The winner in words: the franchise that won, or a tie.
 *
 * @param result - The played match's score.
 * @returns The winner's name and "won", or "Tied".
 */
function winnerLine(result: MatchScore): string {
  return result.winnerFranchiseId === null
    ? "Tied"
    : `${franchiseName(result.winnerFranchiseId)} won`;
}

/**
 * One match in the stack. A match in play shows its teams with no result and cannot be
 * opened. A played match is an accordion: opening it shows a two-column scorecard, one column
 * per team, with the Man of the Match. Owners in the match are named in a badge, and their
 * matches get a thick edge.
 *
 * @param props - The match, its status, its owners, and its Man of the Match.
 * @returns The match card.
 */
export function MatchEntry({
  fixture,
  status,
  owners,
  manOfTheMatch,
}: MatchEntryProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const home = franchiseName(fixture.homeFranchiseId);
  const away = franchiseName(fixture.awayFranchiseId);
  const badge = ownerBadge(owners);
  const result = status === "played" ? fixture.result : null;
  const headline = `${home} vs ${away}`;

  return (
    <article
      aria-label={headline}
      {...stylex.props(
        styles.card,
        owners.length === 2 && styles.twoOwners,
        owners.length === 1 && styles.oneOwner,
      )}
    >
      {result ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
          {...stylex.props(styles.summary, focusRing.ring)}
        >
          <p {...stylex.props(styles.headline)}>
            {headline} · {winnerLine(result)}
          </p>
        </button>
      ) : (
        <p {...stylex.props(styles.headline)}>{headline} · In play</p>
      )}

      {badge ? <span {...stylex.props(styles.badge)}>{badge}</span> : null}

      {result && open ? (
        <Scorecard
          id={panelId}
          label={`${headline} scorecard`}
          home={{
            name: home,
            runs: result.homeRuns,
            wickets: result.homeWickets,
          }}
          away={{
            name: away,
            runs: result.awayRuns,
            wickets: result.awayWickets,
          }}
          winnerLine={winnerLine(result)}
          manOfTheMatch={
            manOfTheMatch
              ? {
                  name: manOfTheMatch.name,
                  franchise: franchiseName(manOfTheMatch.franchiseId),
                }
              : null
          }
        />
      ) : null}
    </article>
  );
}
