"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useEffectEvent, useId, useState } from "react";

import {
  MATCH_LOG_EVENT_MS,
  MATCH_LOG_PAUSE_MS,
} from "../../shared/const/match-log.const";
import { franchiseName } from "../../shared/utils/franchise-label";
import { describeMatchEvent } from "../../shared/utils/match-log";
import { Button } from "../Button/Button";
import { Scorecard } from "../Scorecard/Scorecard";
import { styles } from "./MatchLogView.styles";
import type { MatchLogViewProps } from "./MatchLogView.types";

/**
 * A playoff match's match log: its key moments in order, from the toss to the result. A live log
 * reveals one moment at a time, and a guest can skip to the end. Once the log is complete, the
 * result shows, with the scorecard in an accordion below it.
 *
 * @param props.title - The match's heading.
 * @param props.result - The played match.
 * @param props.live - Whether the log is still being revealed.
 * @param props.onDone - Called once a live log has finished and paused.
 * @returns The match log, its result, and its scorecard.
 */
export function MatchLogView({
  title,
  result,
  live,
  onDone,
}: MatchLogViewProps) {
  const total = result.matchLog.length;
  const [revealed, setRevealed] = useState(0);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  // Reads the latest `onDone` without restarting the timer when the parent re-renders.
  const finish = useEffectEvent(() => onDone());

  useEffect(() => {
    if (!live) {
      return;
    }
    if (revealed >= total) {
      const timer = setTimeout(() => finish(), MATCH_LOG_PAUSE_MS);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(
      () => setRevealed((count) => count + 1),
      MATCH_LOG_EVENT_MS,
    );
    return () => clearTimeout(timer);
  }, [live, revealed, total]);

  const shown = live ? revealed : total;
  const complete = shown >= total;
  const winner = result.winnerFranchiseId;

  return (
    <section aria-label={title} {...stylex.props(styles.panel)}>
      <h3 {...stylex.props(styles.heading)}>{title}</h3>
      <ol
        aria-label="Match log"
        aria-live="polite"
        {...stylex.props(styles.list)}
      >
        {result.matchLog.slice(0, shown).map((event, index) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: the log only grows, so an index is stable
            key={index}
            {...stylex.props(
              styles.item,
              (event.kind === "inningsStart" || event.kind === "inningsEnd") &&
                styles.inningsItem,
            )}
          >
            {describeMatchEvent(event)}
          </li>
        ))}
      </ol>

      {live && !complete ? (
        <Button variant="secondary" onClick={() => setRevealed(total)}>
          Skip to result
        </Button>
      ) : null}

      {complete ? (
        <>
          <p {...stylex.props(styles.note)}>
            {winner ? `${franchiseName(winner)} won.` : "No result."}
          </p>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((current) => !current)}
            {...stylex.props(styles.accordion)}
          >
            Scorecard
          </button>
          {open ? (
            <Scorecard
              id={panelId}
              label={`${title} scorecard`}
              home={{
                name: franchiseName(result.homeFranchiseId),
                runs: result.score.homeRuns,
                wickets: result.score.homeWickets,
              }}
              away={{
                name: franchiseName(result.awayFranchiseId),
                runs: result.score.awayRuns,
                wickets: result.score.awayWickets,
              }}
              winnerLine={winner ? `${franchiseName(winner)} won` : "No result"}
              manOfTheMatch={
                result.manOfTheMatch
                  ? {
                      name: result.manOfTheMatch.name,
                      franchise: franchiseName(
                        result.manOfTheMatch.franchiseId,
                      ),
                    }
                  : null
              }
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
