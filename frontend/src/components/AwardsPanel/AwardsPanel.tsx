"use client";

import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";

import type {
  Awards,
  OwnerAwardLine,
  PlayerAwardLine,
} from "../../shared/types/awards.types";
import { describeApiError } from "../../shared/utils/describe-api-error";
import { franchiseName } from "../../shared/utils/franchise-label";
import { AwardCard } from "../AwardCard/AwardCard";
import type { AwardEntry } from "../AwardCard/AwardCard.types";
import { FairPlayScreen } from "../FairPlayScreen/FairPlayScreen";
import { useGuestSession } from "../GuestSessionProvider/GuestSessionProvider";
import { styles } from "./AwardsPanel.styles";
import type { AwardsPanelProps } from "./AwardsPanel.types";

/**
 * A player's place on an individual award, with the stat that the award ranks by.
 *
 * @param line - The player's line, or null while the place is open.
 * @param stat - The stat the award is ranked by, such as "412 runs".
 * @returns The entry for the card, or null while the place is open.
 */
function playerPlace(
  line: PlayerAwardLine | null,
  stat: (line: PlayerAwardLine) => string,
): AwardEntry | null {
  return line
    ? {
        label: line.name,
        detail: `${franchiseName(line.franchiseId)} · ${stat(line)}`,
      }
    : null;
}

/**
 * An owner's place on the Most Valuable Player award.
 *
 * @param line - The owner's line, or null while the place is open.
 * @returns The entry for the card, or null while the place is open.
 */
function ownerPlace(line: OwnerAwardLine | null): AwardEntry | null {
  return line
    ? {
        label: line.displayName,
        detail: `${franchiseName(line.franchiseId)} · ${Math.round(line.fantasyPoints)} fantasy points`,
      }
    : null;
}

/**
 * The awards for the season so far: the caps, Most Valuable Player, Emerging
 * Player, the Man of the Match in each match, and the Fair Play screen. The
 * awards are read from the matches played, so they show the leaders until the
 * Final has been played.
 *
 * @param props.code - The lobby whose awards to show.
 * @returns The awards, or a loading or error line while they are read.
 */
export function AwardsPanel({ code }: AwardsPanelProps) {
  const { api } = useGuestSession();
  const [awards, setAwards] = useState<Awards | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getAwards(code)
      .then((loaded) => {
        if (!cancelled) {
          setAwards(loaded);
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

  if (loadError) {
    return (
      <section aria-label="Awards" {...stylex.props(styles.panel)}>
        <p role="alert" {...stylex.props(styles.loading)}>
          {loadError}
        </p>
      </section>
    );
  }
  if (!awards) {
    return (
      <section aria-label="Awards" {...stylex.props(styles.panel)}>
        <p aria-busy="true" {...stylex.props(styles.loading)}>
          Loading the awards…
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Awards" {...stylex.props(styles.panel)}>
      <header {...stylex.props(styles.stack)}>
        <h2 {...stylex.props(styles.heading)}>Awards</h2>
        <p {...stylex.props(styles.note)}>
          {awards.seasonComplete
            ? "The season is over. These are the final awards."
            : "These are the leaders so far. They can change until the Final is played."}
        </p>
      </header>

      <div {...stylex.props(styles.grid)}>
        <AwardCard
          title="Orange Cap"
          description="Most runs in the season."
          winner={playerPlace(
            awards.orangeCap.winner,
            (line) => `${line.runs} runs`,
          )}
          runnerUp={playerPlace(
            awards.orangeCap.runnerUp,
            (line) => `${line.runs} runs`,
          )}
        />
        <AwardCard
          title="Purple Cap"
          description="Most wickets in the season."
          winner={playerPlace(
            awards.purpleCap.winner,
            (line) => `${line.wickets} wickets`,
          )}
          runnerUp={playerPlace(
            awards.purpleCap.runnerUp,
            (line) => `${line.wickets} wickets`,
          )}
        />
        <AwardCard
          title="Most Valuable Player"
          description="Owners ranked by fantasy points, with the captain and vice-captain multipliers applied."
          winner={ownerPlace(awards.mostValuable.winner)}
          runnerUp={ownerPlace(awards.mostValuable.runnerUp)}
        />
        <AwardCard
          title="Emerging Player"
          description="The leading uncapped player. This is a proxy until the seed has age and caps data."
          winner={playerPlace(
            awards.emerging.winner,
            (line) => `${line.fantasyPoints} fantasy points`,
          )}
          runnerUp={playerPlace(
            awards.emerging.runnerUp,
            (line) => `${line.fantasyPoints} fantasy points`,
          )}
        />
      </div>

      <section
        aria-labelledby="man-of-the-match-heading"
        {...stylex.props(styles.stack)}
      >
        <h3 id="man-of-the-match-heading" {...stylex.props(styles.subheading)}>
          Man of the Match
        </h3>
        {awards.manOfTheMatch.length === 0 ? (
          <p {...stylex.props(styles.note)}>No matches have been played yet.</p>
        ) : (
          <ul {...stylex.props(styles.list)}>
            {awards.manOfTheMatch.map((award) => (
              <li
                key={`${award.round}-${award.homeFranchiseId}-${award.awayFranchiseId}`}
              >
                Round {award.round}: {award.name},{" "}
                {franchiseName(award.franchiseId)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="fair-play-heading"
        {...stylex.props(styles.stack)}
      >
        <h3 id="fair-play-heading" {...stylex.props(styles.subheading)}>
          Fair Play
        </h3>
        <FairPlayScreen
          franchises={awards.fairPlay.franchises}
          winnerFranchiseId={awards.fairPlay.winnerFranchiseId}
        />
      </section>
    </section>
  );
}
