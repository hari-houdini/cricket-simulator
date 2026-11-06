"use client";

import * as stylex from "@stylexjs/stylex";
import dynamic from "next/dynamic";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useMemo } from "react";

import { Button } from "../../components/Button/Button";
import { TEAMS } from "../../shared/const/teams.const";
import type { Lobby } from "../../shared/types/lobby.types";
import {
  franchiseClaimBlock,
  franchiseStatus,
} from "../../shared/utils/franchise-claim";
import { styles as stageStyles } from "./FranchiseStage.styles";
import type { StageSlot } from "./FranchiseStage.types";
import { styles } from "./ProtoFranchiseGrid.styles";

/**
 * The 3D stage, loaded only in the browser: WebGL has no server, and three.js is
 * the heaviest part of the page, so it arrives in its own chunk. The placeholder is
 * the stage's frame, so the layout holds its height while the chunk loads.
 */
const FranchiseStage = dynamic(
  () => import("./FranchiseStage").then((module) => module.FranchiseStage),
  {
    ssr: false,
    loading: () => (
      <div aria-hidden="true" {...stylex.props(stageStyles.frame)} />
    ),
  },
);

/** How far a card may tilt, in degrees, at its edges. */
const TILT_MAX_X = 10;
const TILT_MAX_Y = 12;

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
 * Whether the pointer can tilt the cards: a fine pointer, such as a mouse, and no
 * request for reduced motion. Touch screens and reduced-motion viewers keep the
 * flat card.
 *
 * @returns `true` when the tilt should follow the pointer.
 */
function canTilt(): boolean {
  return (
    window.matchMedia("(hover: hover)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Turns a card toward the pointer. The angles are written to the card's `--rx` and
 * `--ry` custom properties, so the card's own transition does the smoothing and
 * React does not re-render on every move.
 *
 * @param event - The pointer move over the card.
 */
function tiltCard(event: ReactPointerEvent<HTMLLIElement>) {
  if (!canTilt()) {
    return;
  }
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const across = (event.clientX - rect.left) / rect.width - 0.5;
  const down = (event.clientY - rect.top) / rect.height - 0.5;
  card.style.setProperty("--rx", `${(-down * TILT_MAX_X * 2).toFixed(2)}deg`);
  card.style.setProperty("--ry", `${(across * TILT_MAX_Y * 2).toFixed(2)}deg`);
}

/**
 * Lays a card flat again when the pointer leaves it.
 *
 * @param event - The pointer leaving the card.
 */
function resetCard(event: ReactPointerEvent<HTMLLIElement>) {
  event.currentTarget.style.setProperty("--rx", "0deg");
  event.currentTarget.style.setProperty("--ry", "0deg");
}

/**
 * The franchise pick: a 3D stage of the ten franchises turning on a ring, a
 * scrolling ticker of their states, and a responsive grid of franchise cards. The
 * cards are the controls; the stage and ticker only show the same state.
 *
 * Each card shows the team's code and name, its status in words, and a claim
 * action where the franchise is free. The status is text, not colour alone: the
 * words say "Free", "Taken by" or "Yours", and the colour only reinforces them.
 * The viewer's own card carries a glow and one burst when it is claimed.
 *
 * It applies the same claim rules as the production grid, through the shared
 * utilities, so a refused claim is shown the same way.
 *
 * @param props - The lobby, the viewer, the pending flag, and the claim handler.
 * @returns The stage, ticker and grid of franchise cards.
 */
export function ProtoFranchiseGrid({
  lobby,
  guestId,
  pending,
  onClaim,
}: ProtoFranchiseGridProps) {
  const rows = useMemo(
    () =>
      TEAMS.map((team) => {
        const status = franchiseStatus(lobby, guestId, team.id);
        const state: StageSlot["state"] =
          status.kind === "owned" && status.isMine
            ? "mine"
            : status.kind === "owned"
              ? "taken"
              : "free";
        return { team, status, state };
      }),
    [lobby, guestId],
  );

  const slots = useMemo<readonly StageSlot[]>(
    () =>
      rows.map((row) => ({
        id: row.team.id,
        color: row.team.color,
        state: row.state,
      })),
    [rows],
  );

  const tickerItems = rows.map((row) => {
    let word: string;
    if (row.status.kind === "owned" && row.status.isMine) {
      word = "Yours";
    } else if (row.status.kind === "owned") {
      word = row.status.owner.displayName;
    } else {
      word = "Free";
    }
    return { id: row.team.id, abbreviation: row.team.abbreviation, word };
  });

  return (
    <div {...stylex.props(styles.stack)}>
      <FranchiseStage slots={slots} />

      <div aria-hidden="true" {...stylex.props(styles.ticker)}>
        <div {...stylex.props(styles.tickerTrack)}>
          {[0, 1].map((copy) => (
            <div key={copy} {...stylex.props(styles.tickerCopy)}>
              {tickerItems.map((item) => (
                <span
                  key={`${copy}-${item.id}`}
                  {...stylex.props(styles.tickerItem)}
                >
                  {item.abbreviation}
                  <span {...stylex.props(styles.tickerStatus)}>
                    {item.word}
                  </span>
                  <span
                    aria-hidden="true"
                    {...stylex.props(styles.tickerDivider)}
                  >
                    ·
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <ul aria-label="Franchises" {...stylex.props(styles.grid)}>
        {rows.map(({ team, status, state }, index) => {
          const blocked = franchiseClaimBlock(lobby, guestId, team.id) !== null;
          const mine = state === "mine";
          const taken = state === "taken";

          let statusText: string;
          if (mine) {
            statusText = "Yours";
          } else if (status.kind === "owned") {
            statusText = `Taken by ${status.owner.displayName}`;
          } else {
            statusText = "Free";
          }

          return (
            <li
              key={team.id}
              onPointerMove={tiltCard}
              onPointerLeave={resetCard}
              style={
                {
                  "--team": team.color,
                  "--i": index,
                  animationDelay: `calc(var(--i) * 70ms)`,
                } as CSSProperties
              }
              {...stylex.props(
                styles.card,
                mine && styles.mine,
                taken && styles.taken,
              )}
            >
              <span aria-hidden="true" {...stylex.props(styles.crown)} />
              <span aria-hidden="true" {...stylex.props(styles.sheen)} />
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
    </div>
  );
}
