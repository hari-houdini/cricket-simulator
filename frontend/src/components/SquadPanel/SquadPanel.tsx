"use client";

import * as stylex from "@stylexjs/stylex";
import { useCallback, useEffect, useState } from "react";

import type { Squad } from "../../shared/types/squad.types";
import { describeApiError } from "../../shared/utils/describe-api-error";
import { useGuestSession } from "../GuestSessionProvider/GuestSessionProvider";
import { SquadPicker } from "../SquadPicker/SquadPicker";
import type { StartingXiSelection } from "../SquadPicker/SquadPicker.types";
import { styles } from "./SquadPanel.styles";
import type { SquadPanelProps } from "./SquadPanel.types";

/**
 * Loads the guest's squad once the auction has finished, and runs the starting
 * XI and the free substitution through the game API. The picker does the
 * checking and the display; this component does the calls and holds the result.
 *
 * @param props.code - The lobby whose auction has finished.
 * @returns The squad picker, or a loading or error message while it loads.
 */
export function SquadPanel({ code }: SquadPanelProps) {
  const { api, guestId } = useGuestSession();
  const [squad, setSquad] = useState<Squad | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!guestId) {
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
      .catch((caught: unknown) => {
        if (!cancelled) {
          setLoadError(describeApiError(caught));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, code, guestId]);

  /**
   * Runs a squad action and shows the squad it returns, or the error it raised.
   *
   * @param action - The API call that returns the squad.
   */
  const run = useCallback(async (action: () => Promise<Squad>) => {
    setActionError(null);
    setPending(true);
    try {
      setSquad(await action());
    } catch (caught) {
      setActionError(describeApiError(caught));
    } finally {
      setPending(false);
    }
  }, []);

  if (loadError) {
    return (
      <section aria-label="Squad" {...stylex.props(styles.panel)}>
        <p role="alert" {...stylex.props(styles.loading)}>
          {loadError}
        </p>
      </section>
    );
  }
  if (!squad || !guestId) {
    return (
      <section aria-label="Squad" {...stylex.props(styles.panel)}>
        <p aria-busy="true" {...stylex.props(styles.loading)}>
          Loading your squad…
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Squad" {...stylex.props(styles.panel)}>
      <SquadPicker
        squad={squad}
        pending={pending}
        error={actionError}
        onSave={(selection: StartingXiSelection) =>
          void run(() => api.setStartingXi({ code, guestId, ...selection }))
        }
        onSubstitute={(outPlayerId, inPlayerId) =>
          void run(() =>
            api.substitute({ code, guestId, outPlayerId, inPlayerId }),
          )
        }
      />
    </section>
  );
}
