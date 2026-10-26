"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";

import { LEAGUE_ROUNDS } from "../../shared/const/league.const";
import type { FixtureRow, Reveal } from "../../shared/types/fixture-row.types";
import type { League } from "../../shared/types/league.types";
import { describeApiError } from "../../shared/utils/describe-api-error";
import { fixtureRows } from "../../shared/utils/fixture-rows";
import { Button } from "../Button/Button";
import { ErrorBanner } from "../ErrorBanner/ErrorBanner";
import { FixtureList } from "../FixtureList/FixtureList";
import { useGuestSession } from "../GuestSessionProvider/GuestSessionProvider";
import { LeagueTable } from "../LeagueTable/LeagueTable";
import { styles } from "./LeaguePanel.styles";
import type { LeaguePanelProps } from "./LeaguePanel.types";

/**
 * How long each match takes to show its result, in milliseconds. A league
 * match finishes in 1 to 2 seconds (`docs/specs/mock-api-mvp.md`).
 */
const MATCH_REVEAL_MS = 1500;

/**
 * Whether the guest has asked for less motion. A guest who has, sees each
 * round's results at once, with no pause between matches.
 *
 * @returns True when the browser reports reduced motion.
 */
function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The season: the schedule, the table, and the control that plays the next
 * round. Each round's matches are revealed one at a time, so the guest follows
 * the round as it happens rather than reading every result at once.
 *
 * @param props.code - The lobby whose season is running.
 * @param props.canAdvance - Whether the viewer may play the next round.
 * @param props.onRoundAdvanced - Called once a round has been played.
 * @returns The league's schedule and table, or a message while it loads.
 */
export function LeaguePanel({
  code,
  canAdvance,
  onRoundAdvanced,
}: LeaguePanelProps) {
  const { api, guestId } = useGuestSession();
  const [league, setLeague] = useState<League | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getLeague(code)
      .then((loaded) => {
        if (!cancelled) {
          setLeague(loaded);
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

  const revealingRoundSize =
    reveal && league
      ? league.fixtures.filter((fixture) => fixture.round === reveal.round)
          .length
      : 0;
  const revealing = reveal !== null && reveal.shown < revealingRoundSize;

  // Shows the next match of the round being revealed once the last one's time is up.
  useEffect(() => {
    if (reveal === null || !revealing) {
      return;
    }
    const delay = prefersReducedMotion() ? 0 : MATCH_REVEAL_MS;
    const timer = window.setTimeout(() => {
      setReveal({ round: reveal.round, shown: reveal.shown + 1 });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [reveal, revealing]);

  /**
   * Plays the next round, then starts revealing its matches.
   */
  async function playRound() {
    if (!guestId) {
      return;
    }
    setActionError(null);
    setPending(true);
    try {
      const next = await api.advanceRound({ code, guestId });
      setLeague(next);
      setReveal({ round: next.round, shown: 0 });
      onRoundAdvanced?.();
    } catch (caught) {
      setActionError(describeApiError(caught));
    } finally {
      setPending(false);
    }
  }

  if (loadError) {
    return (
      <section aria-label="League" {...stylex.props(styles.panel)}>
        <p role="alert" {...stylex.props(styles.loading)}>
          {loadError}
        </p>
      </section>
    );
  }
  if (!league) {
    return (
      <section aria-label="League" {...stylex.props(styles.panel)}>
        <p aria-busy="true" {...stylex.props(styles.loading)}>
          Loading the league…
        </p>
      </section>
    );
  }

  const rows: FixtureRow[] = fixtureRows(league.fixtures, reveal);
  const nextRound = league.round + 1;

  return (
    <section aria-label="League" {...stylex.props(styles.panel)}>
      <header {...stylex.props(styles.section)}>
        <h2 {...stylex.props(styles.heading)}>League</h2>
        <p {...stylex.props(styles.note)}>
          {league.seasonComplete
            ? `The league is over: all ${LEAGUE_ROUNDS} rounds have been played.`
            : `${league.round} of ${LEAGUE_ROUNDS} rounds played.`}
        </p>
        {actionError ? <ErrorBanner message={actionError} /> : null}
        {canAdvance && !league.seasonComplete ? (
          <Button
            disabled={pending || revealing}
            onClick={() => void playRound()}
          >
            Play round {nextRound}
          </Button>
        ) : null}
      </header>

      <section
        aria-labelledby="schedule-heading"
        {...stylex.props(styles.section)}
      >
        <h3 id="schedule-heading" {...stylex.props(styles.heading)}>
          Schedule
        </h3>
        <FixtureList rows={rows} />
      </section>

      <section
        aria-labelledby="table-heading"
        {...stylex.props(styles.section)}
      >
        <h3 id="table-heading" {...stylex.props(styles.heading)}>
          Standings
        </h3>
        <p {...stylex.props(styles.note)}>
          Win is 2 points, a tie is 1 each, and a loss is 0. Points are ranked
          first, then net run rate.
        </p>
        <LeagueTable standings={league.standings} />
      </section>
    </section>
  );
}
