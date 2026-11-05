"use client";

import * as stylex from "@stylexjs/stylex";
import { useId, useState } from "react";

import { Button } from "../../../components/Button/Button";
import { ROLE_LABELS } from "../../../components/SquadPicker/SquadPicker.const";
import type { StartingXiSelection } from "../../../components/SquadPicker/SquadPicker.types";
import { XI_SIZE } from "../../../shared/const/squad.const";
import type { Squad, StartingXi } from "../../../shared/types/squad.types";
import { describeXiBlock } from "../../../shared/utils/describe-api-error";
import { startingXiBlock } from "../../../shared/utils/squad-rules";
import { styles } from "./ProtoXi.styles";

/** The draft selection: the players in the XI, and the captain and vice-captain, unset until picked. */
type Draft = {
  readonly playerIds: readonly string[];
  readonly captainId: string | null;
  readonly viceCaptainId: string | null;
};

/**
 * Starts a draft from the saved XI, or from nothing when none is saved yet.
 *
 * @param saved - The XI already saved for this guest, if any.
 * @returns The draft to edit.
 */
function draftFrom(saved: StartingXi | null): Draft {
  if (!saved) {
    return { playerIds: [], captainId: null, viceCaptainId: null };
  }
  return {
    playerIds: [...saved.playerIds],
    captainId: saved.captainId,
    viceCaptainId: saved.viceCaptainId,
  };
}

/** The props for {@link ProtoXiPicker}. */
type ProtoXiPickerProps = {
  /** The guest's squad, with the saved XI if there is one. */
  readonly squad: Squad;
  /** True while a save is in flight. */
  readonly pending: boolean;
  /** A refusal from the last save, if any. */
  readonly error: string | null;
  /** Saves the XI. */
  readonly onSave: (selection: StartingXiSelection) => void;
};

/**
 * The starting XI, before the first match. The guest picks eleven of the fifteen,
 * then a captain and a vice-captain from them. The legality rules are the shared
 * ones, and a block is said in words in the status line, so the guest knows why
 * the save is off.
 *
 * Each player is a card. Its state is text ("In the XI", "On the bench"), and the
 * captain and vice-captain are toggles with `aria-pressed`, so the choice is not
 * read from colour alone.
 *
 * @param props - The squad, the pending flag, the last error, and the save handler.
 * @returns The XI picker.
 */
export function ProtoXiPicker({
  squad,
  pending,
  error,
  onSave,
}: ProtoXiPickerProps) {
  const [draft, setDraft] = useState(() => draftFrom(squad.startingXi));
  const statusId = useId();
  const block = startingXiBlock(squad.players, draft);
  const canSave =
    block === null && draft.captainId !== null && draft.viceCaptainId !== null;

  /**
   * Adds a player to the XI, or takes them out. Taking a player out also clears
   * any captaincy they held. A full XI refuses another player.
   *
   * @param id - The player to toggle.
   */
  function toggleInXi(id: string) {
    setDraft((current) => {
      if (current.playerIds.includes(id)) {
        return {
          playerIds: current.playerIds.filter((item) => item !== id),
          captainId: current.captainId === id ? null : current.captainId,
          viceCaptainId:
            current.viceCaptainId === id ? null : current.viceCaptainId,
        };
      }
      if (current.playerIds.length >= XI_SIZE) {
        return current;
      }
      return { ...current, playerIds: [...current.playerIds, id] };
    });
  }

  /**
   * Makes a player captain, or clears the captaincy. A player cannot hold both roles.
   *
   * @param id - The player to toggle as captain.
   */
  function toggleCaptain(id: string) {
    setDraft((current) => ({
      ...current,
      captainId: current.captainId === id ? null : id,
      viceCaptainId:
        current.viceCaptainId === id ? null : current.viceCaptainId,
    }));
  }

  /**
   * Makes a player vice-captain, or clears the role. A player cannot hold both roles.
   *
   * @param id - The player to toggle as vice-captain.
   */
  function toggleViceCaptain(id: string) {
    setDraft((current) => ({
      ...current,
      viceCaptainId: current.viceCaptainId === id ? null : id,
      captainId: current.captainId === id ? null : current.captainId,
    }));
  }

  /** Saves the draft, once it is legal and both roles are set. */
  function handleSave() {
    if (
      draft.captainId === null ||
      draft.viceCaptainId === null ||
      block !== null
    ) {
      return;
    }
    onSave({
      playerIds: [...draft.playerIds],
      captainId: draft.captainId,
      viceCaptainId: draft.viceCaptainId,
    });
  }

  const filled = Array.from(
    { length: XI_SIZE },
    (_, index) => index < draft.playerIds.length,
  );

  return (
    <div {...stylex.props(styles.panel)}>
      {error ? (
        <p role="alert" {...stylex.props(styles.error)}>
          {error}
        </p>
      ) : null}

      <div {...stylex.props(styles.header)}>
        <p {...stylex.props(styles.eyebrow)}>Starting XI</p>
        <p {...stylex.props(styles.count)}>
          {draft.playerIds.length} of {XI_SIZE} chosen
        </p>
        <ul aria-hidden="true" {...stylex.props(styles.slots)}>
          {filled.map((isFilled, index) => (
            <li
              // The slots are a fixed row of eleven, never reordered.
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed row of slots
              key={index}
              {...stylex.props(styles.slot, isFilled && styles.slotFilled)}
            />
          ))}
        </ul>
        <p id={statusId} aria-live="polite" {...stylex.props(styles.status)}>
          {block === null
            ? "Your starting XI is legal. Pick a captain and a vice-captain, then save."
            : describeXiBlock(block)}
        </p>
      </div>

      <ul aria-label="Squad" {...stylex.props(styles.grid)}>
        {squad.players.map((player) => {
          const inXi = draft.playerIds.includes(player.id);
          const full = !inXi && draft.playerIds.length >= XI_SIZE;
          return (
            <li
              key={player.id}
              {...stylex.props(styles.player, inXi && styles.playerIn)}
            >
              <div {...stylex.props(styles.playerRow)}>
                <div>
                  <p {...stylex.props(styles.name)}>{player.name}</p>
                  <p {...stylex.props(styles.role)}>
                    {ROLE_LABELS[player.role]} ·{" "}
                    {inXi ? "In the XI" : "On the bench"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={inXi ? "tertiary" : "primary"}
                  disabled={pending || full}
                  aria-label={`${inXi ? "Remove" : "Add"} ${player.name} ${inXi ? "from" : "to"} the XI`}
                  onClick={() => toggleInXi(player.id)}
                >
                  {inXi ? "Remove" : "Add to XI"}
                </Button>
              </div>
              {inXi ? (
                <div {...stylex.props(styles.actions)}>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    aria-pressed={draft.captainId === player.id}
                    aria-label={`Captain: ${player.name}`}
                    onClick={() => toggleCaptain(player.id)}
                  >
                    {draft.captainId === player.id ? "✓ Captain" : "Captain"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    aria-pressed={draft.viceCaptainId === player.id}
                    aria-label={`Vice-captain: ${player.name}`}
                    onClick={() => toggleViceCaptain(player.id)}
                  >
                    {draft.viceCaptainId === player.id
                      ? "✓ Vice-captain"
                      : "Vice-captain"}
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div {...stylex.props(styles.saveBar)}>
        <Button
          size="lg"
          disabled={pending || !canSave}
          aria-describedby={statusId}
          onClick={handleSave}
        >
          Save starting XI
        </Button>
      </div>
    </div>
  );
}
