"use client";

import * as stylex from "@stylexjs/stylex";
import { useCallback, useEffect, useState } from "react";

import { useGuestSession } from "../../components/GuestSessionProvider/GuestSessionProvider";
import type { StartingXiSelection } from "../../components/SquadPicker/SquadPicker.types";
import type { Squad } from "../../shared/types/squad.types";
import { describeApiError } from "../../shared/utils/describe-api-error";
import { styles } from "./ProtoXi.styles";
import { ProtoXiPicker } from "./ProtoXiPicker";

/** The props for {@link ProtoSquadPanel}. */
type ProtoSquadPanelProps = {
  /** The lobby whose squad is being picked. */
  readonly code: string;
  /** Called once the XI is saved, so the lobby can move on to the season. */
  readonly onSaved: () => void;
};

/**
 * Loads the viewer's squad and saves their starting XI, using the XI picker. The loading and the saving use the same API calls as the production
 * squad panel, and a refused save keeps the picker in place with the reason shown.
 *
 * @param props.code - The lobby whose squad is being picked.
 * @param props.onSaved - Called once the XI is saved.
 * @returns The picker, or a loading or error line.
 */
export function ProtoSquadPanel({ code, onSaved }: ProtoSquadPanelProps) {
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
   * Saves the XI. On success the squad is replaced and the lobby moves on; on a
   * refusal the reason is kept on screen beside the picker.
   *
   * @param selection - The XI to save.
   */
  const save = useCallback(
    async (selection: StartingXiSelection) => {
      if (!guestId) {
        return;
      }
      setActionError(null);
      setPending(true);
      try {
        setSquad(await api.setStartingXi({ code, guestId, ...selection }));
        onSaved();
      } catch (caught) {
        setActionError(describeApiError(caught));
      } finally {
        setPending(false);
      }
    },
    [api, code, guestId, onSaved],
  );

  if (loadError) {
    return (
      <section aria-label="Starting XI" {...stylex.props(styles.panel)}>
        <p role="alert">{loadError}</p>
      </section>
    );
  }
  if (!squad || !guestId) {
    return <p aria-busy="true">Loading your squad…</p>;
  }

  return (
    <section aria-label="Starting XI" {...stylex.props(styles.panel)}>
      <ProtoXiPicker
        squad={squad}
        pending={pending}
        error={actionError}
        onSave={(selection) => void save(selection)}
      />
    </section>
  );
}
