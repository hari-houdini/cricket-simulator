"use client";

import * as stylex from "@stylexjs/stylex";
import { Fragment, useEffect, useState } from "react";
import { focusRing } from "../../shared/const/focus-ring.styles";
import type { Awards } from "../../shared/types/awards.types";
import type { Standing } from "../../shared/types/league.types";
import type { Lineup } from "../../shared/types/lineup.types";
import type { Lobby, Owner } from "../../shared/types/lobby.types";
import { describeApiError } from "../../shared/utils/describe-api-error";
import { rankFairPlay } from "../../shared/utils/fair-play-ranking";
import { franchiseName } from "../../shared/utils/franchise-label";
import { xiAt } from "../../shared/utils/xi-at";
import { Button } from "../Button/Button";
import { FairPlayScreen } from "../FairPlayScreen/FairPlayScreen";
import { useGuestSession } from "../GuestSessionProvider/GuestSessionProvider";
import { LeagueTable } from "../LeagueTable/LeagueTable";
import { Modal } from "../Modal/Modal";
import { styles } from "./SeasonNav.styles";
import type { SeasonNavProps } from "./SeasonNav.types";

/** Which view is open, or none. */
type OpenView = "standings" | "fair-play" | "squads";

/**
 * Shows a loading line, or the error that stopped the read. Each view reads its data only when
 * it opens, so the sim keeps running underneath while a view loads.
 *
 * @param props.error - The read's error message, or null.
 * @returns An alert for the error, or a busy line while loading.
 */
function ViewStatus({ error }: { readonly error: string | null }) {
  if (error) {
    return <p role="alert">{error}</p>;
  }
  return (
    <p aria-busy="true" {...stylex.props(styles.note)}>
      Loading…
    </p>
  );
}

/**
 * The league table, read when the view opens.
 *
 * @param props.code - The lobby whose table to read.
 * @returns The table, or a loading or error line.
 */
function StandingsView({ code }: { readonly code: string }) {
  const { api } = useGuestSession();
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getStandings(code)
      .then((loaded) => {
        if (!cancelled) {
          setStandings(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(describeApiError(caught));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, code]);

  if (!standings) {
    return <ViewStatus error={error} />;
  }
  return <LeagueTable standings={standings} />;
}

/**
 * The Fair Play table, ranked by the season's standing with the league table as tie-breakers.
 *
 * @param props.code - The lobby whose Fair Play to read.
 * @returns The table, or a loading or error line.
 */
function FairPlayView({ code }: { readonly code: string }) {
  const { api } = useGuestSession();
  const [awards, setAwards] = useState<Awards | null>(null);
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getAwards(code), api.getStandings(code)])
      .then(([loadedAwards, loadedStandings]) => {
        if (!cancelled) {
          setAwards(loadedAwards);
          setStandings(loadedStandings);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(describeApiError(caught));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, code]);

  if (!awards || !standings) {
    return <ViewStatus error={error} />;
  }
  return (
    <FairPlayScreen
      franchises={rankFairPlay(awards.fairPlay.franchises, standings)}
      winnerFranchiseId={awards.fairPlay.winnerFranchiseId}
    />
  );
}

/**
 * The XI at the point, as its player names, with the captain and vice-captain.
 *
 * @param props.lineup - The owner's lineup, with the players to name.
 * @param props.owner - The owner, whose substitutions rebuild the XI.
 * @param props.lobby - The lobby, for its substitution history.
 * @param props.point - How many league matches the viewer has been shown.
 * @returns The owner's captain, vice-captain and XI, or a note that no XI is saved.
 */
function SquadDetail({
  lineup,
  owner,
  lobby,
  point,
}: {
  readonly lineup: Lineup;
  readonly owner: Owner;
  readonly lobby: Lobby;
  readonly point: number;
}) {
  const xi = xiAt(lineup.startingXi, lobby.substitutions, owner.guestId, point);
  if (!xi) {
    return <p {...stylex.props(styles.note)}>No starting XI saved yet.</p>;
  }
  const nameOf = (playerId: string) =>
    lineup.players.find((player) => player.id === playerId)?.name ?? playerId;
  return (
    <div {...stylex.props(styles.stack)}>
      <p {...stylex.props(styles.note)}>Captain: {nameOf(xi.captainId)}</p>
      <p {...stylex.props(styles.note)}>
        Vice-captain: {nameOf(xi.viceCaptainId)}
      </p>
      <ol {...stylex.props(styles.list)}>
        {xi.playerIds.map((playerId) => (
          <li key={playerId}>{nameOf(playerId)}</li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The squads: each lobby player with their team. Each row is an accordion that opens to the
 * captain, vice-captain and XI as they stood at the point the viewer has reached.
 *
 * @param props.code - The lobby whose squads to read.
 * @param props.lobby - The lobby, for its owners and substitutions.
 * @param props.point - How many league matches the viewer has been shown.
 * @returns The squads table, or a loading or error line.
 */
function SquadsView({
  code,
  lobby,
  point,
}: {
  readonly code: string;
  readonly lobby: Lobby;
  readonly point: number;
}) {
  const { api } = useGuestSession();
  const [lineups, setLineups] = useState<Lineup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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
          setError(describeApiError(caught));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, code]);

  if (!lineups) {
    return <ViewStatus error={error} />;
  }

  return (
    <section
      aria-label="Squads"
      // A scroll container must be focusable, so keyboard users can reach the columns that sit
      // off-screen on a phone (axe: scrollable-region-focusable).
      // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region, see the comment above
      tabIndex={0}
      {...stylex.props(styles.scroll, focusRing.ring)}
    >
      <table aria-label="Squads" {...stylex.props(styles.table)}>
        <thead>
          <tr>
            <th scope="col" {...stylex.props(styles.headerCell)}>
              Player
            </th>
            <th scope="col" {...stylex.props(styles.headerCell)}>
              Team
            </th>
          </tr>
        </thead>
        <tbody>
          {lobby.owners.map((owner) => {
            const lineup = lineups.find(
              (item) => item.guestId === owner.guestId,
            );
            const isOpen = expanded === owner.guestId;
            const panelId = `squad-${owner.guestId}`;
            return (
              <Fragment key={owner.guestId}>
                <tr>
                  <th scope="row" {...stylex.props(styles.cell)}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setExpanded(isOpen ? null : owner.guestId)}
                      {...stylex.props(styles.rowButton)}
                    >
                      {owner.displayName}
                    </button>
                  </th>
                  <td {...stylex.props(styles.cell)}>
                    {owner.franchiseId
                      ? franchiseName(owner.franchiseId)
                      : "No franchise"}
                  </td>
                </tr>
                {isOpen && lineup ? (
                  <tr id={panelId}>
                    <td colSpan={2} {...stylex.props(styles.cell)}>
                      <SquadDetail
                        lineup={lineup}
                        owner={owner}
                        lobby={lobby}
                        point={point}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/**
 * The three views a guest can open during the season: the team standings, the Fair Play table,
 * and the squads. Each one opens in a dialog, and the sim keeps running underneath. The awards
 * page carries the same three.
 *
 * @param props - The lobby code, the lobby, and the point the squads view reads.
 * @returns The nav buttons and their dialogs.
 */
export function SeasonNav({ code, lobby, point }: SeasonNavProps) {
  const [open, setOpen] = useState<OpenView | null>(null);
  /** Closes whichever view is open. */
  const close = () => setOpen(null);

  return (
    <nav aria-label="Season views" {...stylex.props(styles.nav)}>
      <Button variant="secondary" onClick={() => setOpen("standings")}>
        Team standings
      </Button>
      <Button variant="secondary" onClick={() => setOpen("fair-play")}>
        Fair Play
      </Button>
      <Button variant="secondary" onClick={() => setOpen("squads")}>
        Squads
      </Button>

      <Modal title="Team standings" open={open === "standings"} onClose={close}>
        <StandingsView code={code} />
      </Modal>
      <Modal title="Fair Play" open={open === "fair-play"} onClose={close}>
        <FairPlayView code={code} />
      </Modal>
      <Modal title="Squads" open={open === "squads"} onClose={close}>
        <SquadsView code={code} lobby={lobby} point={point} />
      </Modal>
    </nav>
  );
}
