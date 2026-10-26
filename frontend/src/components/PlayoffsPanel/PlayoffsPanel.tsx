"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";

import {
  KEY_MOMENTS_TOTAL_MS,
  PLAYOFF_SLOT_LABELS,
} from "../../shared/const/playoffs.const";
import type { Playoffs } from "../../shared/types/playoffs.types";
import type { PlayoffSlot } from "../../shared/types/schedule.types";
import { describeApiError } from "../../shared/utils/describe-api-error";
import { franchiseName } from "../../shared/utils/franchise-label";
import { Button } from "../Button/Button";
import { ErrorBanner } from "../ErrorBanner/ErrorBanner";
import { useGuestSession } from "../GuestSessionProvider/GuestSessionProvider";
import { KeyMomentView } from "../KeyMomentView/KeyMomentView";
import { PlayoffBracket } from "../PlayoffBracket/PlayoffBracket";
import { styles } from "./PlayoffsPanel.styles";
import type { PlayoffsPanelProps } from "./PlayoffsPanel.types";

/**
 * Which playoff match is showing its key moments, and how many have shown.
 */
type MomentReveal = {
  readonly slot: PlayoffSlot;
  readonly shown: number;
};

/**
 * Whether the guest has asked for less motion. A guest who has sees the key
 * moments at once, with no pause between them.
 *
 * @returns True when the browser reports reduced motion.
 */
function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The playoffs: the bracket, and the control that plays the next match. A match
 * shows its key moments one at a time within five seconds, and a guest can skip
 * to the result at any point.
 *
 * @param props.code - The lobby whose playoffs are running.
 * @param props.canAdvance - Whether the viewer may play the next match.
 * @param props.onRoundAdvanced - Called once a match has been played.
 * @returns The bracket, with the key-moment view while a match is shown.
 */
export function PlayoffsPanel({
  code,
  canAdvance,
  onRoundAdvanced,
}: PlayoffsPanelProps) {
  const { api, guestId } = useGuestSession();
  const [bracket, setBracket] = useState<Playoffs | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reveal, setReveal] = useState<MomentReveal | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getPlayoffs(code)
      .then((loaded) => {
        if (!cancelled) {
          setBracket(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setLoadError(describeApiError(caught));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, code]);

  const revealedResult =
    reveal && bracket
      ? (bracket.matches.find((match) => match.slot === reveal.slot)?.result ??
        null)
      : null;
  const momentCount = revealedResult?.keyMoments.length ?? 0;
  const revealing = reveal !== null && reveal.shown < momentCount;

  // Shows the next key moment once the last one's time is up.
  useEffect(() => {
    if (reveal === null || !revealing) {
      return;
    }
    const delay = prefersReducedMotion()
      ? 0
      : KEY_MOMENTS_TOTAL_MS / momentCount;
    const timer = window.setTimeout(() => {
      setReveal({ slot: reveal.slot, shown: reveal.shown + 1 });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [reveal, revealing, momentCount]);

  /**
   * Plays the next playoff match, then reads the bracket and reveals the match.
   */
  async function playNext() {
    if (!guestId) {
      return;
    }
    setActionError(null);
    setPending(true);
    try {
      const league = await api.advanceRound({ code, guestId });
      const next = await api.getPlayoffs(code);
      setBracket(next);
      const played = next.matches.find((match) => match.round === league.round);
      if (played) {
        setReveal({ slot: played.slot, shown: 0 });
      }
      onRoundAdvanced?.();
    } catch (caught) {
      setActionError(describeApiError(caught));
    } finally {
      setPending(false);
    }
  }

  if (loadError) {
    return (
      <section aria-label="Playoffs" {...stylex.props(styles.panel)}>
        <p role="alert" {...stylex.props(styles.loading)}>
          {loadError}
        </p>
      </section>
    );
  }
  if (!bracket) {
    return (
      <section aria-label="Playoffs" {...stylex.props(styles.panel)}>
        <p aria-busy="true" {...stylex.props(styles.loading)}>
          Loading the playoffs…
        </p>
      </section>
    );
  }

  const next = bracket.matches.find((match) => match.result === null);

  return (
    <section aria-label="Playoffs" {...stylex.props(styles.panel)}>
      <header {...stylex.props(styles.stack)}>
        <h2 {...stylex.props(styles.heading)}>Playoffs</h2>
        <p {...stylex.props(styles.note)}>
          {bracket.champion
            ? `${franchiseName(bracket.champion)} are the champions.`
            : "The top four of the league qualify, in IPL format."}
        </p>
        {actionError ? <ErrorBanner message={actionError} /> : null}
        {canAdvance && next ? (
          <Button
            disabled={pending || revealing}
            onClick={() => void playNext()}
          >
            Play {PLAYOFF_SLOT_LABELS[next.slot]}
          </Button>
        ) : null}
      </header>

      {reveal && revealedResult ? (
        <KeyMomentView
          moments={revealedResult.keyMoments}
          shown={reveal.shown}
          onSkip={() => setReveal({ slot: reveal.slot, shown: momentCount })}
        />
      ) : null}

      <PlayoffBracket matches={bracket.matches} champion={bracket.champion} />
    </section>
  );
}
