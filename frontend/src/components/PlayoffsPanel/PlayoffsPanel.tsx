"use client";

import * as stylex from "@stylexjs/stylex";
import { useCallback, useEffect, useState } from "react";
import { PLAYOFF_MATCHES } from "../../shared/const/league.const";
import { PLAYOFF_SLOT_LABELS } from "../../shared/const/playoffs.const";
import type { Playoffs } from "../../shared/types/playoffs.types";
import { describeApiError } from "../../shared/utils/describe-api-error";
import {
  franchiseAbbreviation,
  franchiseName,
} from "../../shared/utils/franchise-label";
import { useGuestSession } from "../GuestSessionProvider/GuestSessionProvider";
import { MatchLogView } from "../MatchLogView/MatchLogView";
import { PlayoffBracket } from "../PlayoffBracket/PlayoffBracket";
import { styles } from "./PlayoffsPanel.styles";
import type { PlayoffsPanelProps } from "./PlayoffsPanel.types";

/**
 * The playoffs, revealed one match at a time. The sim plays each match on the server, but a guest
 * sees a match only after the one before it has finished on their screen. The bracket shows only
 * the teams and results the guest has already watched, so nothing is given away early.
 *
 * @param props.code - The lobby whose playoffs are running.
 * @param props.round - The lobby's current round, which moves as each match is played.
 * @param props.onFinished - Called once the Final's log has finished and the champion is decided.
 * @returns The bracket and the match logs, or a loading or error line while the bracket is read.
 */
export function PlayoffsPanel({ code, round, onFinished }: PlayoffsPanelProps) {
  const { api } = useGuestSession();
  const [bracket, setBracket] = useState<Playoffs | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // How many playoff matches have finished on this guest's screen.
  const [watched, setWatched] = useState(0);

  // The bracket changes only when the round moves, so it is read again on each round.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the round is the refresh trigger
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
  }, [api, code, round]);

  const handleDone = useCallback(
    (index: number) => {
      setWatched(index + 1);
      if (index === PLAYOFF_MATCHES - 1) {
        onFinished();
      }
    },
    [onFinished],
  );

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

  // A team is known once the matches before it have been watched, so a slot shows its teams only
  // up to the one being watched, and its result only once that match has finished.
  const masked = bracket.matches.map((match, index) => ({
    ...match,
    homeFranchiseId: index <= watched ? match.homeFranchiseId : null,
    awayFranchiseId: index <= watched ? match.awayFranchiseId : null,
    result: index < watched ? match.result : null,
  }));
  const champion = watched >= PLAYOFF_MATCHES ? bracket.champion : null;

  return (
    <section aria-label="Playoffs" {...stylex.props(styles.panel)}>
      <header {...stylex.props(styles.stack)}>
        <h2 {...stylex.props(styles.heading)}>Playoffs</h2>
        <p {...stylex.props(styles.note)}>
          {champion
            ? `${franchiseName(champion)} are the champions.`
            : "The top four of the league qualify, in IPL format."}
        </p>
      </header>

      <PlayoffBracket matches={masked} champion={champion} />

      <div {...stylex.props(styles.logs)}>
        {bracket.matches.map((match, index) =>
          index <= watched && match.result ? (
            <MatchLogView
              key={match.slot}
              title={`${PLAYOFF_SLOT_LABELS[match.slot]}: ${franchiseAbbreviation(match.result.homeFranchiseId)} v ${franchiseAbbreviation(match.result.awayFranchiseId)}`}
              result={match.result}
              live={index === watched}
              onDone={() => handleDone(index)}
            />
          ) : null,
        )}
      </div>
    </section>
  );
}
