"use client";

import * as stylex from "@stylexjs/stylex";
import { type FormEvent, useState } from "react";
import { focusRing } from "../../shared/const/focus-ring.styles";
import { LOBBY_PHASE_LABELS, MAX_OWNERS } from "../../shared/const/lobby.const";
import { TEAMS } from "../../shared/const/teams.const";
import { AuctionPanel } from "../AuctionPanel/AuctionPanel";
import { AwardsPanel } from "../AwardsPanel/AwardsPanel";
import { Button } from "../Button/Button";
import { ErrorBanner } from "../ErrorBanner/ErrorBanner";
import { FranchiseGrid } from "../FranchiseGrid/FranchiseGrid";
import { Input } from "../Input/Input";
import { LeaguePanel } from "../LeaguePanel/LeaguePanel";
import { PlayoffsPanel } from "../PlayoffsPanel/PlayoffsPanel";
import { SquadPanel } from "../SquadPanel/SquadPanel";
import { styles } from "./LobbyView.styles";
import type { LobbyViewProps } from "./LobbyView.types";

/**
 * Shows one lobby. Before the auction starts it shows the name, phase, code,
 * share link, owners, and the franchise grid, with a start control for owners.
 * A guest who has not joined sees the join form instead of the grid, and a full
 * lobby says so rather than offering a form that would fail. Once the auction
 * has started, the auction panel takes the place of the grid and the form. Once
 * the auction has finished, an owner also sees the squad panel, to pick the XI,
 * and every guest sees the league, the playoffs once they begin, and the awards
 * so far. The squad and awards panels remount when the round changes, so they
 * show the latest state once a match has been played.
 *
 * @param props - The lobby, the viewing guest, the share link, and the actions.
 * @returns The lobby's sections inside the page's `<main>`.
 */
export function LobbyView({
  lobby,
  guestId,
  shareUrl,
  pending,
  error,
  onClaim,
  onJoin,
  onStart,
  onRoundAdvanced,
}: LobbyViewProps) {
  const [displayName, setDisplayName] = useState("");
  const isOwner = lobby.owners.some((owner) => owner.guestId === guestId);
  const isFull = lobby.owners.length >= MAX_OWNERS;
  const everyOwnerHasFranchise = lobby.owners.every(
    (owner) => owner.franchiseId !== null,
  );
  const auctionStarted = lobby.auctionStatus !== "waiting";

  /**
   * @param event - The join form's submit event.
   */
  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onJoin(displayName);
  }

  return (
    <div {...stylex.props(styles.stack)}>
      {error ? <ErrorBanner message={error} /> : null}

      <header>
        <h1 {...stylex.props(styles.heading)}>{lobby.name}</h1>
        <p {...stylex.props(styles.meta)}>
          <span>
            Phase: <strong>{LOBBY_PHASE_LABELS[lobby.phase]}</strong>
          </span>
          <span>
            Code: <strong>{lobby.code}</strong>
          </span>
        </p>
        <p {...stylex.props(styles.note)}>
          Share this link:{" "}
          <a
            href={shareUrl}
            {...stylex.props(styles.shareLink, focusRing.ring)}
          >
            {shareUrl}
          </a>
        </p>
      </header>

      <section aria-labelledby="owners-heading">
        <h2 id="owners-heading" {...stylex.props(styles.subheading)}>
          Owners ({lobby.owners.length} of {MAX_OWNERS})
        </h2>
        <ul aria-live="polite" {...stylex.props(styles.ownerList)}>
          {lobby.owners.map((owner) => {
            const team = TEAMS.find((item) => item.id === owner.franchiseId);
            return (
              <li key={owner.guestId}>
                {owner.displayName}
                {owner.guestId === guestId ? " (you)" : ""}:{" "}
                {team ? team.name : "no franchise yet"}
              </li>
            );
          })}
        </ul>
      </section>

      {auctionStarted ? (
        <AuctionPanel code={lobby.code} />
      ) : isOwner ? (
        <>
          <section aria-labelledby="franchises-heading">
            <h2 id="franchises-heading" {...stylex.props(styles.subheading)}>
              Pick your franchise
            </h2>
            <p {...stylex.props(styles.note)}>
              Franchises no owner claims are run by a system squad, so every
              season has all ten teams.
            </p>
            <FranchiseGrid
              lobby={lobby}
              guestId={guestId}
              pending={pending}
              onClaim={onClaim}
            />
          </section>

          <section
            aria-labelledby="start-heading"
            {...stylex.props(styles.joinForm)}
          >
            <h2 id="start-heading" {...stylex.props(styles.subheading)}>
              Start the auction
            </h2>
            <p {...stylex.props(styles.note)}>
              {everyOwnerHasFranchise
                ? "Once it starts, no one can join or change franchise. Bidding opens on the first player."
                : "Every owner must pick a franchise before the auction can start."}
            </p>
            <Button
              disabled={pending || !everyOwnerHasFranchise}
              onClick={onStart}
            >
              Start auction
            </Button>
          </section>
        </>
      ) : isFull ? (
        <p {...stylex.props(styles.note)}>
          This lobby is full. Every franchise already has an owner.
        </p>
      ) : (
        <form
          onSubmit={handleJoin}
          aria-labelledby="join-heading"
          {...stylex.props(styles.joinForm)}
        >
          <h2 id="join-heading" {...stylex.props(styles.subheading)}>
            Join this lobby
          </h2>
          <Input
            kind="text"
            id="join-name"
            label="Your name"
            placeholder="Ravi"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <Button type="submit" disabled={pending}>
            Join lobby
          </Button>
        </form>
      )}

      {lobby.auctionStatus === "complete" && isOwner ? (
        <SquadPanel key={`squad-${lobby.round}`} code={lobby.code} />
      ) : null}

      {lobby.auctionStatus === "complete" ? (
        <LeaguePanel
          code={lobby.code}
          canAdvance={isOwner}
          onRoundAdvanced={onRoundAdvanced}
        />
      ) : null}

      {lobby.phase === "playoffs" || lobby.phase === "complete" ? (
        <PlayoffsPanel
          code={lobby.code}
          canAdvance={isOwner && lobby.phase === "playoffs"}
          onRoundAdvanced={onRoundAdvanced}
        />
      ) : null}

      {lobby.auctionStatus === "complete" ? (
        <AwardsPanel key={`awards-${lobby.round}`} code={lobby.code} />
      ) : null}
    </div>
  );
}
