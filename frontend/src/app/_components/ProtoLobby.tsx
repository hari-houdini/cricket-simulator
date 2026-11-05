"use client";

import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ZodError } from "zod";
import { AwardsPanel } from "../../components/AwardsPanel/AwardsPanel";
import { Button } from "../../components/Button/Button";
import { useGuestSession } from "../../components/GuestSessionProvider/GuestSessionProvider";
import { Input } from "../../components/Input/Input";
import { notify } from "../../components/Notifier/Notifier";
import { PlayoffsPanel } from "../../components/PlayoffsPanel/PlayoffsPanel";
import { SeasonNav } from "../../components/SeasonNav/SeasonNav";
import { SimView } from "../../components/SimView/SimView";
import { LOBBY_PHASE_LABELS, MAX_OWNERS } from "../../shared/const/lobby.const";
import type { Lobby } from "../../shared/types/lobby.types";
import { describeApiError } from "../../shared/utils/describe-api-error";
import { franchiseName } from "../../shared/utils/franchise-label";
import { LobbyNotFoundError } from "../../shared/utils/game-api.errors";
import { ProtoAuctionPanel } from "./ProtoAuctionPanel";
import { ProtoFranchiseGrid } from "./ProtoFranchiseGrid";
import { styles } from "./ProtoLobby.styles";
import { ProtoSquadPanel } from "./ProtoSquadPanel";

/** How often the lobby is re-read while the auction and the season run. Matches the production lobby. */
const LOBBY_POLL_MS = 1000;

/**
 * What the lobby screen is showing: loading, a lobby, no lobby at this code, or a
 * failure the guest can read.
 */
type ScreenState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly lobby: Lobby }
  | { readonly status: "missing" }
  | { readonly status: "failed"; readonly message: string };

/** The props for {@link ProtoLobby}. */
type ProtoLobbyProps = {
  /** The lobby code from the URL. */
  readonly code: string;
};

/**
 * The lobby. It runs the same loading, polling and actions as the
 * production lobby screen, and lays out the journey on the broadcast theme:
 *
 * - a scorebug with the phase, the code and the share link;
 * - the owners as a roster;
 * - the franchise pick as a responsive grid, then the start checklist;
 * - the auction, the starting XI, the season, the playoffs and the awards in
 *   journey order. The auction is laid out here; the later stages use the
 *   production components, which take the theme but not the new layout yet.
 *
 * @param props.code - The lobby code from the URL.
 * @returns The lobby, or a loading, missing or failed state.
 */
export function ProtoLobby({ code }: ProtoLobbyProps) {
  const { api, guestId } = useGuestSession();
  const [state, setState] = useState<ScreenState>({ status: "loading" });
  const [pending, setPending] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [squadSaved, setSquadSaved] = useState(false);
  // The awards wait until the viewer has watched the Final to its end, as in the production lobby.
  const [finalShown, setFinalShown] = useState(false);

  useEffect(() => {
    if (!guestId) {
      return;
    }
    let cancelled = false;
    api
      .getLobby(code)
      .then((lobby) => {
        if (!cancelled) {
          setState({ status: "ready", lobby });
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }
        if (
          caught instanceof LobbyNotFoundError ||
          caught instanceof ZodError
        ) {
          setState({ status: "missing" });
        } else {
          setState({ status: "failed", message: describeApiError(caught) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, code, guestId]);

  const live =
    state.status === "ready" &&
    (state.lobby.auctionStatus === "running" ||
      state.lobby.phase === "league" ||
      state.lobby.phase === "playoffs");

  // Re-read the lobby while the auction and the season run, so every guest sees the change.
  useEffect(() => {
    if (!live) {
      return;
    }
    let cancelled = false;
    const id = window.setInterval(() => {
      api
        .getLobby(code)
        .then((lobby) => {
          if (!cancelled) {
            setState({ status: "ready", lobby });
          }
        })
        .catch(() => undefined);
    }, LOBBY_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [api, code, live]);

  /**
   * Runs an action that returns the lobby. The result replaces the lobby on
   * screen; a refusal raises a notice and leaves the lobby where it is.
   *
   * @param action - The API call to run.
   */
  const run = useCallback(async (action: () => Promise<Lobby>) => {
    setPending(true);
    try {
      const lobby = await action();
      setState({ status: "ready", lobby });
    } catch (caught) {
      notify({ tone: "error", message: describeApiError(caught) });
    } finally {
      setPending(false);
    }
  }, []);

  if (state.status === "missing") {
    return (
      <section
        aria-labelledby="missing-heading"
        {...stylex.props(styles.section)}
      >
        <h2 id="missing-heading" {...stylex.props(styles.sectionTitle)}>
          No lobby has this code
        </h2>
        <p {...stylex.props(styles.note)}>
          Check the code and try again, or ask the owner for a new link.
        </p>
        <Link href="/" {...stylex.props(styles.link)}>
          Back to the start
        </Link>
      </section>
    );
  }

  if (state.status === "failed") {
    return (
      <section
        aria-labelledby="failed-heading"
        {...stylex.props(styles.section)}
      >
        <h2 id="failed-heading" {...stylex.props(styles.sectionTitle)}>
          Lobby unavailable
        </h2>
        <p {...stylex.props(styles.note)}>{state.message}</p>
      </section>
    );
  }

  if (state.status === "loading" || !guestId) {
    return (
      <p aria-busy="true" {...stylex.props(styles.loading)}>
        Loading the lobby…
      </p>
    );
  }

  const { lobby } = state;
  const isOwner = lobby.owners.some((owner) => owner.guestId === guestId);
  const isFull = lobby.owners.length >= MAX_OWNERS;
  const everyOwnerHasFranchise = lobby.owners.every(
    (owner) => owner.franchiseId !== null,
  );
  const auctionStarted = lobby.auctionStatus !== "waiting";
  const seasonOpen =
    lobby.auctionStatus === "complete" && lobby.phase !== "complete";
  const pickingXi = seasonOpen && isOwner && lobby.round === 0 && !squadSaved;
  const shareUrl = `${window.location.origin}/lobby/${lobby.code}`;
  const ownersWithFranchise = lobby.owners.filter(
    (owner) => owner.franchiseId !== null,
  ).length;

  return (
    <div {...stylex.props(styles.stack)}>
      <header {...stylex.props(styles.section)}>
        <h1 {...stylex.props(styles.sectionTitle)}>{lobby.name}</h1>
        <dl {...stylex.props(styles.scorebug)}>
          <div {...stylex.props(styles.scoreItem)}>
            <dt {...stylex.props(styles.scoreLabel)}>Phase</dt>
            <dd {...stylex.props(styles.scoreValue)}>
              {LOBBY_PHASE_LABELS[lobby.phase]}
            </dd>
          </div>
          <div {...stylex.props(styles.scoreItem)}>
            <dt {...stylex.props(styles.scoreLabel)}>Code</dt>
            <dd {...stylex.props(styles.scoreValue)}>{lobby.code}</dd>
          </div>
          <div {...stylex.props(styles.scoreItem)}>
            <dt {...stylex.props(styles.scoreLabel)}>Owners</dt>
            <dd {...stylex.props(styles.scoreValue)}>
              {lobby.owners.length} of {MAX_OWNERS}
            </dd>
          </div>
          <div {...stylex.props(styles.scoreItem)}>
            <dt {...stylex.props(styles.scoreLabel)}>Share</dt>
            <dd>
              <a href={shareUrl} {...stylex.props(styles.shareLink)}>
                Lobby link
              </a>
            </dd>
          </div>
        </dl>
      </header>

      <section
        aria-labelledby="owners-heading"
        {...stylex.props(styles.section)}
      >
        <h2 id="owners-heading" {...stylex.props(styles.sectionTitle)}>
          Owners
        </h2>
        <ul aria-live="polite" {...stylex.props(styles.roster)}>
          {lobby.owners.map((owner) => (
            <li key={owner.guestId} {...stylex.props(styles.rosterItem)}>
              <span>
                {owner.displayName}
                {owner.guestId === guestId ? " (you)" : ""}
              </span>
              <span {...stylex.props(styles.rosterCode)}>
                {owner.franchiseId
                  ? franchiseName(owner.franchiseId)
                  : "No franchise yet"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {auctionStarted ? (
        <section
          aria-labelledby="auction-heading"
          {...stylex.props(styles.section)}
        >
          <h2 id="auction-heading" {...stylex.props(styles.sectionTitle)}>
            The auction
          </h2>
          <ProtoAuctionPanel code={lobby.code} />
        </section>
      ) : isOwner ? (
        <>
          <section
            aria-labelledby="franchises-heading"
            {...stylex.props(styles.section)}
          >
            <h2 id="franchises-heading" {...stylex.props(styles.sectionTitle)}>
              Pick your franchise
            </h2>
            <p {...stylex.props(styles.note)}>
              Franchises no owner claims are run by a system squad, so every
              season has all ten teams.
            </p>
            <ProtoFranchiseGrid
              lobby={lobby}
              guestId={guestId}
              pending={pending}
              onClaim={(franchiseId) =>
                void run(() =>
                  api.claimFranchise({
                    code: lobby.code,
                    guestId,
                    franchiseId,
                  }),
                )
              }
            />
          </section>

          <section
            aria-labelledby="start-heading"
            {...stylex.props(styles.start)}
          >
            <h2 id="start-heading" {...stylex.props(styles.sectionTitle)}>
              Start the auction
            </h2>
            <p {...stylex.props(styles.note)}>
              {ownersWithFranchise} of {lobby.owners.length} owners have a
              franchise.{" "}
              {everyOwnerHasFranchise
                ? "Once it starts, no one can join or change franchise."
                : "Every owner must pick a franchise before the auction can start."}
            </p>
            <Button
              size="lg"
              disabled={pending || !everyOwnerHasFranchise}
              onClick={() =>
                void run(() => api.startAuction({ code: lobby.code, guestId }))
              }
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
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void run(() =>
              api.joinLobby({ code: lobby.code, guestId, displayName }),
            );
          }}
          aria-labelledby="join-heading"
          {...stylex.props(styles.joinPanel)}
        >
          <h2 id="join-heading" {...stylex.props(styles.sectionTitle)}>
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

      {pickingXi ? (
        <section
          aria-labelledby="xi-section-heading"
          {...stylex.props(styles.section)}
        >
          <h2 id="xi-section-heading" {...stylex.props(styles.sectionTitle)}>
            Pick your starting XI
          </h2>
          <ProtoSquadPanel
            code={lobby.code}
            onSaved={() => {
              setSquadSaved(true);
              notify({
                tone: "success",
                message: "Squad saved. The season is starting.",
              });
            }}
          />
        </section>
      ) : null}

      {seasonOpen && !pickingXi ? (
        <SimView
          code={lobby.code}
          lobby={lobby}
          guestId={guestId}
          onLobbyUpdated={(next) => setState({ status: "ready", lobby: next })}
        />
      ) : null}

      {lobby.auctionStatus === "complete" &&
      (lobby.phase === "playoffs" || lobby.phase === "complete") ? (
        <PlayoffsPanel
          code={lobby.code}
          round={lobby.round}
          onFinished={() => setFinalShown(true)}
        />
      ) : null}

      {lobby.phase === "complete" && finalShown ? (
        <>
          <SeasonNav
            code={lobby.code}
            lobby={lobby}
            point={Number.POSITIVE_INFINITY}
          />
          <AwardsPanel key={`awards-${lobby.round}`} code={lobby.code} />
        </>
      ) : null}
    </div>
  );
}
