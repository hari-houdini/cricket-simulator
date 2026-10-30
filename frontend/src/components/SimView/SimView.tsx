"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useMemo, useState } from "react";

import { LEAGUE_MATCHES } from "../../shared/const/league.const";
import type { Awards } from "../../shared/types/awards.types";
import type { Fixture, League } from "../../shared/types/league.types";
import type { Lineup } from "../../shared/types/lineup.types";
import type { Lobby } from "../../shared/types/lobby.types";
import type { Squad } from "../../shared/types/squad.types";
import { describeApiError } from "../../shared/utils/describe-api-error";
import { stackEntries } from "../../shared/utils/sim-stack";
import { Button } from "../Button/Button";
import { ErrorBanner } from "../ErrorBanner/ErrorBanner";
import { useGuestSession } from "../GuestSessionProvider/GuestSessionProvider";
import { Modal } from "../Modal/Modal";
import { SeasonNav } from "../SeasonNav/SeasonNav";
import { SimStack } from "../SimStack/SimStack";
import { SquadPanel } from "../SquadPanel/SquadPanel";
import { styles } from "./SimView.styles";
import type { SimViewProps } from "./SimView.types";

/**
 * How long each match shows as in play before its result, in milliseconds. A league match
 * finishes in 1 to 2 seconds (`docs/specs/mock-api-mvp.md`).
 */
const MATCH_REVEAL_MS = 1500;

/**
 * How often the league is read while the sim is on screen. Each read is also what moves the
 * server's season clock, so the sim keeps moving while any guest has it open. The reads are a
 * second apart, shorter than the clock's interval, so a due match is played on time.
 */
const LEAGUE_POLL_MS = 1000;

/**
 * Whether the guest has asked for less motion. A guest who has sees each result at once.
 * Read only inside effects, since the browser is not there during server rendering.
 *
 * @returns True when the browser reports reduced motion.
 */
function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Counts the league fixtures that have a result.
 *
 * @param fixtures - The league's fixtures.
 * @returns How many have been played.
 */
function playedCount(fixtures: readonly Fixture[]): number {
  return fixtures.filter((fixture) => fixture.result !== null).length;
}

/**
 * The newer of two league reads. Reads race each other: a poll sent before an advance can land
 * after it, so a read with fewer matches played never replaces one with more.
 *
 * @param current - The league on screen, or null before the first read.
 * @param next - The league just read.
 * @returns The league with more matches played.
 */
function newerLeague(current: League | null, next: League): League {
  if (
    current !== null &&
    playedCount(next.fixtures) < playedCount(current.fixtures)
  ) {
    return current;
  }
  return next;
}

/**
 * The sim: the match stack, the owners' controls, and the season's nav. Every guest sees the
 * stack, and each match appears in it once its turn has come, one at a time, so no one sees a
 * result before the sim has finished it. The server keeps the season clock: a read of the league
 * plays the match that has come due, so no client has to drive the sim. The server holds the
 * pause: while a substitution is open it plays nothing, and the stack shows the pause to every
 * guest.
 *
 * @param props - The lobby code, the lobby, the viewing guest, and the lobby update callback.
 * @returns The sim, or a loading or error message while the league is read.
 */
export function SimView({
  code,
  lobby,
  guestId,
  onLobbyUpdated,
}: SimViewProps) {
  const { api } = useGuestSession();
  const isOwner = lobby.owners.some((owner) => owner.guestId === guestId);
  const [league, setLeague] = useState<League | null>(null);
  const [revealed, setRevealed] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [awards, setAwards] = useState<Awards | null>(null);
  const [lineups, setLineups] = useState<Lineup[] | null>(null);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [subOpen, setSubOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const leagueLoaded = league !== null;
  const played = league ? playedCount(league.fixtures) : 0;
  const leagueLength = league ? league.fixtures.length : LEAGUE_MATCHES;
  const shown = revealed ?? 0;
  const substitutionOpen = lobby.substituting.includes(guestId);
  const substitutionCount = lobby.substitutions.length;

  // Reads the league on a timer while the sim is on screen. The first read starts the stack at
  // the point already played, so a late guest does not watch the whole season replay. A failed
  // read is skipped; the next tick tries again.
  useEffect(() => {
    let cancelled = false;
    /** Reads the league, and keeps whichever copy has more matches played. */
    function read() {
      api
        .getLeague(code)
        .then((loaded) => {
          if (cancelled) {
            return;
          }
          setLeague((current) => newerLeague(current, loaded));
          setRevealed((current) => current ?? playedCount(loaded.fixtures));
          setLoadError(null);
        })
        .catch((caught: unknown) => {
          if (!cancelled) {
            setLoadError(describeApiError(caught));
          }
        });
    }
    read();
    const id = window.setInterval(read, LEAGUE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [api, code]);

  // The Man of the Match is settled as each match is played, so the awards are read again each
  // time the count moves on. Nothing is read before the first match.
  useEffect(() => {
    if (played === 0) {
      return;
    }
    let cancelled = false;
    api
      .getAwards(code)
      .then((loaded) => {
        if (!cancelled) {
          setAwards(loaded);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [api, code, played]);

  // Lineups name the players in each substitution line. They are read once: the lobby records
  // every substitution, so the XI at any point can be rebuilt from these.
  useEffect(() => {
    let cancelled = false;
    api
      .getLineups(code)
      .then((loaded) => {
        if (!cancelled) {
          setLineups(loaded);
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

  // The owner's own squad says whether the one free substitution has been used.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the substitution count is a trigger; the squad is read again after each substitution
  useEffect(() => {
    if (!isOwner) {
      return;
    }
    let cancelled = false;
    api
      .getSquad({ code, guestId })
      .then((loaded) => {
        if (!cancelled) {
          setSquad(loaded);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [api, code, guestId, isOwner, substitutionCount]);

  // Reveals the next match once the last one's time is up. A skipped league reveals the rest at
  // once, since the server has already played it.
  useEffect(() => {
    if (!leagueLoaded || revealed === null || revealed >= played) {
      return;
    }
    if (lobby.skippedAfterMatches !== null) {
      setRevealed(played);
      return;
    }
    const delay = prefersReducedMotion() ? 0 : MATCH_REVEAL_MS;
    const timer = window.setTimeout(() => {
      setRevealed((current) => (current ?? 0) + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [leagueLoaded, revealed, played, lobby.skippedAfterMatches]);

  const playerNames = useMemo(
    () =>
      new Map(
        (lineups ?? []).flatMap((lineup) =>
          lineup.players.map((player) => [player.id, player.name] as const),
        ),
      ),
    [lineups],
  );

  /**
   * Runs an action that returns the lobby, and passes the lobby on or shows the error.
   *
   * @param action - The API call that returns the lobby.
   * @returns True when the action succeeded.
   */
  async function runLobbyAction(
    action: () => Promise<Lobby>,
  ): Promise<boolean> {
    setError(null);
    setPending(true);
    try {
      onLobbyUpdated(await action());
      return true;
    } catch (caught) {
      setError(describeApiError(caught));
      return false;
    } finally {
      setPending(false);
    }
  }

  /**
   * Opens the owner's substitution. The server pauses the sim for every guest once it opens, so
   * a reopened one (a substitution already under way) only shows the modal again.
   */
  async function openSubstitution() {
    if (!substitutionOpen) {
      const begun = await runLobbyAction(() =>
        api.beginSubstitution({ code, guestId }),
      );
      if (!begun) {
        return;
      }
    }
    setSubOpen(true);
  }

  /**
   * Closes the substitution without making it. The server resumes the sim and the swap is still
   * available, so closing does not use it up.
   */
  async function dismissSubstitution() {
    setSubOpen(false);
    if (substitutionOpen) {
      await runLobbyAction(() => api.cancelSubstitution({ code, guestId }));
    }
  }

  /** Called once the substitution is made. The server has resumed the sim, so the lobby is read again. */
  function substitutionMade() {
    setSubOpen(false);
    api
      .getLobby(code)
      .then(onLobbyUpdated)
      .catch(() => undefined);
  }

  /** Votes to skip the league, or withdraws the vote. */
  async function toggleSkipVote() {
    const voted = lobby.skipVoters.includes(guestId);
    await runLobbyAction(() =>
      api.setSkipVote({ code, guestId, vote: !voted }),
    );
  }

  if (loadError && league === null) {
    return (
      <section aria-label="Season" {...stylex.props(styles.panel)}>
        <p role="alert" {...stylex.props(styles.loading)}>
          {loadError}
        </p>
      </section>
    );
  }
  if (league === null || revealed === null) {
    return (
      <section aria-label="Season" {...stylex.props(styles.panel)}>
        <p aria-busy="true" {...stylex.props(styles.loading)}>
          Loading the season…
        </p>
      </section>
    );
  }

  const entries = stackEntries({
    fixtures: league.fixtures,
    revealed: shown,
    substitutions: lobby.substitutions,
    skippedAfterMatches: lobby.skippedAfterMatches,
    substituting: lobby.substituting,
  });
  // A squad view shows the XI as it stood at the matches the viewer has seen. Once the league is
  // shown in full, it shows the XI as it stands, including any playoff-era substitution.
  const point = shown >= leagueLength ? Number.POSITIVE_INFINITY : shown;
  const substitutionBlock =
    lobby.round === 0
      ? "Available after the first match."
      : squad?.substitutionUsed
        ? "Substitution used."
        : null;
  const voted = lobby.skipVoters.includes(guestId);

  return (
    <section aria-label="Season" {...stylex.props(styles.panel)}>
      <header {...stylex.props(styles.stack)}>
        <h2 {...stylex.props(styles.heading)}>Match simulation</h2>
        <p {...stylex.props(styles.note)}>
          {league.leagueComplete
            ? "The league is over."
            : `${played} of ${leagueLength} league matches played.`}
          {lobby.simPaused ? " The sim is paused for a substitution." : ""}
        </p>
        {error ? <ErrorBanner message={error} /> : null}

        {isOwner ? (
          <div {...stylex.props(styles.actions)}>
            <Button
              variant="secondary"
              disabled={
                pending || (substitutionBlock !== null && !substitutionOpen)
              }
              onClick={() => void openSubstitution()}
            >
              {substitutionOpen ? "Continue substitution" : "Make sub"}
            </Button>
            {substitutionBlock !== null && !substitutionOpen ? (
              <p {...stylex.props(styles.note)}>{substitutionBlock}</p>
            ) : null}
          </div>
        ) : null}

        <SeasonNav code={code} lobby={lobby} point={point} />

        {isOwner &&
        lobby.phase === "league" &&
        lobby.skippedAfterMatches === null ? (
          <section
            aria-labelledby="skip-heading"
            {...stylex.props(styles.skip)}
          >
            <h3 id="skip-heading" {...stylex.props(styles.subheading)}>
              Skip the league
            </h3>
            <p {...stylex.props(styles.note)}>
              {lobby.skipVoters.length} of {lobby.skipThreshold} votes needed. A
              skip needs more than half of the owners.
            </p>
            <div {...stylex.props(styles.actions)}>
              <Button
                variant="secondary"
                aria-pressed={voted}
                disabled={pending}
                onClick={() => void toggleSkipVote()}
              >
                {voted ? "Withdraw skip vote" : "Vote to skip the league"}
              </Button>
            </div>
          </section>
        ) : null}
      </header>

      <SimStack
        entries={entries}
        owners={lobby.owners}
        manOfTheMatch={awards?.manOfTheMatch ?? []}
        playerNames={playerNames}
      />

      <Modal
        title="Make a substitution"
        open={subOpen}
        onClose={() => void dismissSubstitution()}
      >
        <SquadPanel code={code} onSubstituted={substitutionMade} />
      </Modal>
    </section>
  );
}
