"use client";

import * as stylex from "@stylexjs/stylex";
import { focusRing } from "../../shared/const/focus-ring.styles";
import { PLAYOFF_SLOT_LABELS } from "../../shared/const/playoffs.const";
import type { PlayoffSlotView } from "../../shared/types/playoffs.types";
import {
  franchiseAbbreviation,
  franchiseName,
} from "../../shared/utils/franchise-label";
import { summarizeMatch } from "../../shared/utils/match-summary";
import { styles } from "./PlayoffBracket.styles";
import type { PlayoffBracketProps } from "./PlayoffBracket.types";

/**
 * The playoff bracket: each slot with its teams, and its result once played. A
 * place that is not known yet reads "To be decided", so the bracket shows who
 * plays whom before every match is over.
 *
 * @param props.matches - The four slots, in IPL order.
 * @param props.champion - The Final's winner, or null.
 * @returns A list of slot cards, with the champion named once the Final is played.
 */
export function PlayoffBracket({ matches, champion }: PlayoffBracketProps) {
  return (
    <section
      aria-label="Playoff bracket"
      // A scroll container must be focusable so keyboard users can reach content
      // that sits off-screen on a phone (axe: scrollable-region-focusable).
      // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region, see the comment above
      tabIndex={0}
      {...stylex.props(styles.scroll, focusRing.ring)}
    >
      <ol {...stylex.props(styles.list)}>
        {matches.map((match) => (
          <li
            key={match.slot}
            {...stylex.props(
              styles.card,
              match.slot === "final" && styles.finalCard,
            )}
          >
            <h3 {...stylex.props(styles.heading)}>
              {PLAYOFF_SLOT_LABELS[match.slot]}
            </h3>
            <p {...stylex.props(styles.meta)}>Round {match.round}</p>
            <p {...stylex.props(styles.meta)}>
              {teamText(match.homeFranchiseId)} v{" "}
              {teamText(match.awayFranchiseId)}
            </p>
            <p {...stylex.props(styles.meta)}>{resultText(match)}</p>
          </li>
        ))}
      </ol>
      {champion ? (
        <p {...stylex.props(styles.champion)}>
          Champion: {franchiseName(champion)}
        </p>
      ) : null}
    </section>
  );
}

/**
 * The name of a side in the bracket, or "To be decided" while it is unknown.
 *
 * @param franchiseId - The franchise in that place, or null.
 * @returns The franchise name, or the placeholder.
 */
function teamText(franchiseId: string | null): string {
  return franchiseId === null ? "To be decided" : franchiseName(franchiseId);
}

/**
 * What the slot's result says, or that it is not played yet.
 *
 * @param match - The slot.
 * @returns A sentence about the result.
 */
function resultText(match: PlayoffSlotView): string {
  if (!match.result || !match.homeFranchiseId || !match.awayFranchiseId) {
    return "Not played yet";
  }
  const summary = summarizeMatch(
    franchiseAbbreviation(match.homeFranchiseId),
    franchiseAbbreviation(match.awayFranchiseId),
    match.result.score,
  );
  return match.result.superOver ? `${summary} after a super over` : summary;
}
