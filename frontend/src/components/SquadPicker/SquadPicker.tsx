"use client";

import * as stylex from "@stylexjs/stylex";
import { useState } from "react";

import { FIRST_MATCH_ROUND, XI_SIZE } from "../../shared/const/squad.const";
import type { StartingXi } from "../../shared/types/squad.types";
import {
  describeSubstitutionBlock,
  describeXiBlock,
} from "../../shared/utils/describe-api-error";
import {
  startingXiBlock,
  substitutionBlock,
  type XiSelection,
} from "../../shared/utils/squad-rules";
import { Button } from "../Button/Button";
import { ROLE_LABELS } from "./SquadPicker.const";
import { styles } from "./SquadPicker.styles";
import type { SquadPickerProps } from "./SquadPicker.types";

/** The XI being chosen before the first match. Captain and vice-captain are unset until picked. */
type Draft = XiSelection & { readonly playerIds: readonly string[] };

/**
 * Starts the draft from the XI already saved, or from an empty XI.
 *
 * @param saved - The saved XI, or `null` if none has been saved.
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

/**
 * Shows the owner's squad and lets them choose the starting XI, or, once the
 * first match has been played, shows the locked XI and the one free
 * substitution.
 *
 * Before the first match, the picker validates the draft as the owner builds
 * it, and names the rule that is still unmet. Save stays disabled until the XI
 * is legal. After the first match, the XI is read-only, apart from the single
 * substitution, which is checked the same way the API checks it.
 *
 * @param props - The squad, the pending and error state, and the save and substitute handlers.
 * @returns The squad list, the XI controls, and the substitution form.
 */
export function SquadPicker({
  squad,
  pending,
  error,
  onSave,
  onSubstitute,
}: SquadPickerProps) {
  if (squad.locked) {
    return (
      <LockedXi
        squad={squad}
        pending={pending}
        error={error}
        onSubstitute={onSubstitute}
      />
    );
  }
  return (
    <DraftXi squad={squad} pending={pending} error={error} onSave={onSave} />
  );
}

/** Props for {@link DraftXi}, the picker before the first match. */
type DraftXiProps = Pick<
  SquadPickerProps,
  "squad" | "pending" | "error" | "onSave"
>;

/**
 * The XI builder. Each squad player is either in the XI or on the bench, and
 * the XI's captain and vice-captain are chosen from its members.
 *
 * @param props - The squad, the pending and error state, and the save handler.
 * @returns The squad list with XI, captain and vice-captain controls.
 */
function DraftXi({ squad, pending, error, onSave }: DraftXiProps) {
  const [draft, setDraft] = useState(() => draftFrom(squad.startingXi));
  const block = startingXiBlock(squad.players, draft);
  const canSave =
    block === null && draft.captainId !== null && draft.viceCaptainId !== null;

  /**
   * Adds a player to the XI or takes them out. Taking a player out also clears
   * the captaincy or vice-captaincy they held.
   *
   * @param id - The player's id.
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
   * Makes a player captain, or clears the captaincy if they already hold it.
   * A player cannot be captain and vice-captain at once, so this clears the vice-captaincy.
   *
   * @param id - The player's id, from the XI.
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
   * Makes a player vice-captain, or clears the role if they already hold it.
   * A player cannot be captain and vice-captain at once, so this clears the captaincy.
   *
   * @param id - The player's id, from the XI.
   */
  function toggleViceCaptain(id: string) {
    setDraft((current) => ({
      ...current,
      viceCaptainId: current.viceCaptainId === id ? null : id,
      captainId: current.captainId === id ? null : current.captainId,
    }));
  }

  /**
   * Saves the XI once it is legal, with both captain roles set.
   */
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

  return (
    <div {...stylex.props(styles.stack)}>
      {error ? (
        <p role="alert" {...stylex.props(styles.message)}>
          {error}
        </p>
      ) : null}
      <h3 {...stylex.props(styles.heading)}>
        Starting XI: {draft.playerIds.length} of {XI_SIZE} chosen
      </h3>
      <output aria-live="polite" {...stylex.props(styles.message)}>
        {block === null
          ? "Your starting XI is legal. Save it when you are ready."
          : describeXiBlock(block)}
      </output>
      <ul aria-label="Squad" {...stylex.props(styles.list)}>
        {squad.players.map((player) => {
          const inXi = draft.playerIds.includes(player.id);
          return (
            <li key={player.id} {...stylex.props(styles.row)}>
              <div {...stylex.props(styles.identity)}>
                <span {...stylex.props(styles.name)}>{player.name}</span>
                <span {...stylex.props(styles.role)}>
                  {ROLE_LABELS[player.role]}
                </span>
              </div>
              <div {...stylex.props(styles.actions)}>
                {inXi ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      aria-pressed={draft.captainId === player.id}
                      aria-label={`Captain: ${player.name}`}
                      onClick={() => toggleCaptain(player.id)}
                    >
                      Captain
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={pending}
                      aria-pressed={draft.viceCaptainId === player.id}
                      aria-label={`Vice-captain: ${player.name}`}
                      onClick={() => toggleViceCaptain(player.id)}
                    >
                      Vice-captain
                    </Button>
                  </>
                ) : null}
                <Button
                  size="sm"
                  variant={inXi ? "tertiary" : "primary"}
                  disabled={
                    pending || (!inXi && draft.playerIds.length >= XI_SIZE)
                  }
                  aria-pressed={inXi}
                  aria-label={`${inXi ? "Remove" : "Add"} ${player.name} ${inXi ? "from" : "to"} XI`}
                  onClick={() => toggleInXi(player.id)}
                >
                  {inXi ? "Remove" : "Add to XI"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <div>
        <Button disabled={pending || !canSave} onClick={handleSave}>
          Save starting XI
        </Button>
      </div>
    </div>
  );
}

/** Props for {@link LockedXi}, the picker after the first match. */
type LockedXiProps = Pick<
  SquadPickerProps,
  "squad" | "pending" | "error" | "onSubstitute"
>;

/**
 * The XI after the first match: read-only, with the one free substitution.
 *
 * @param props - The squad, the pending and error state, and the substitute handler.
 * @returns The locked XI and the substitution form, or a note when none is open.
 */
function LockedXi({ squad, pending, error, onSubstitute }: LockedXiProps) {
  const [outPlayerId, setOutPlayerId] = useState("");
  const [inPlayerId, setInPlayerId] = useState("");
  const saved = squad.startingXi;

  if (!saved) {
    return (
      <p {...stylex.props(styles.note)}>
        The first match has been played and no starting XI was saved, so the
        squad plays without one.
      </p>
    );
  }

  const xi = squad.players.filter((player) =>
    saved.playerIds.includes(player.id),
  );
  const bench = squad.players.filter(
    (player) => !saved.playerIds.includes(player.id),
  );
  const swapBlock =
    outPlayerId && inPlayerId
      ? substitutionBlock({
          squad: squad.players,
          startingXi: saved,
          substitutionUsed: squad.substitutionUsed,
          round: FIRST_MATCH_ROUND,
          outPlayerId,
          inPlayerId,
        })
      : null;
  const canSwap = outPlayerId !== "" && inPlayerId !== "" && swapBlock === null;

  return (
    <div {...stylex.props(styles.stack)}>
      {error ? (
        <p role="alert" {...stylex.props(styles.message)}>
          {error}
        </p>
      ) : null}
      <h3 {...stylex.props(styles.heading)}>Starting XI is locked</h3>
      <p {...stylex.props(styles.note)}>
        The first match has been played, so the XI cannot change except through
        the one free substitution.
      </p>
      <ul aria-label="Starting XI" {...stylex.props(styles.list)}>
        {xi.map((player) => (
          <li key={player.id} {...stylex.props(styles.row)}>
            <div {...stylex.props(styles.identity)}>
              <span {...stylex.props(styles.name)}>{player.name}</span>
              <span {...stylex.props(styles.role)}>
                {ROLE_LABELS[player.role]}
              </span>
            </div>
            <span {...stylex.props(styles.note)}>
              {player.id === saved.captainId
                ? "Captain"
                : player.id === saved.viceCaptainId
                  ? "Vice-captain"
                  : ""}
            </span>
          </li>
        ))}
      </ul>

      {squad.substitutionUsed ? (
        <p {...stylex.props(styles.note)}>
          You have used your free substitution this season.
        </p>
      ) : (
        <form
          aria-label="Free substitution"
          onSubmit={(event) => {
            event.preventDefault();
            if (canSwap) {
              onSubstitute(outPlayerId, inPlayerId);
            }
          }}
          {...stylex.props(styles.form)}
        >
          <label {...stylex.props(styles.field)}>
            <span>Player out</span>
            <select
              value={outPlayerId}
              onChange={(event) => setOutPlayerId(event.target.value)}
              {...stylex.props(styles.select, styles.focusRing)}
            >
              <option value="">Choose from the XI</option>
              {xi.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </label>
          <label {...stylex.props(styles.field)}>
            <span>Player in</span>
            <select
              value={inPlayerId}
              onChange={(event) => setInPlayerId(event.target.value)}
              {...stylex.props(styles.select, styles.focusRing)}
            >
              <option value="">Choose from the bench</option>
              {bench.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="submit"
            variant="secondary"
            disabled={pending || !canSwap}
          >
            Make substitution
          </Button>
          <output aria-live="polite" {...stylex.props(styles.message)}>
            {swapBlock ? describeSubstitutionBlock(swapBlock) : ""}
          </output>
        </form>
      )}
    </div>
  );
}
