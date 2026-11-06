"use client";

import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Lobby } from "../../shared/types/lobby.types";
import { describeApiError } from "../../shared/utils/describe-api-error";
import { useGuestSession } from "../GuestSessionProvider/GuestSessionProvider";
import { notify } from "../Notifier/Notifier";
import { SwitchForm } from "../SwitchForm/SwitchForm";
import type { SwitchMode, SwitchPanel } from "../SwitchForm/SwitchForm.types";
import { useLobbyEntryMotion } from "./LobbyEntry.motion";
import { styles } from "./LobbyEntry.styles";

/** The number of panel-grid cells: eight columns by six rows. */
const PANEL_CELL_COUNT = 48;

/**
 * The create panel, shown first. It is the sign-up panel of {@link SwitchForm},
 * and its submit creates a lobby.
 */
const createPanel: SwitchPanel = {
  title: "Create a lobby",
  tabLabel: "Create lobby",
  fields: [
    {
      name: "lobbyName",
      label: "Lobby name",
      inputType: "text",
      placeholder: "Sunday League",
    },
    {
      name: "displayName",
      label: "Your name",
      inputType: "text",
      placeholder: "Asha",
    },
  ],
  submitLabel: "Create lobby",
  prompt: {
    title: "Have a code?",
    description: "Join a lobby your friends have already started.",
    switchLabel: "Join a lobby",
  },
};

/**
 * The join panel. It is the sign-in panel of {@link SwitchForm}, and its submit
 * joins the lobby with the typed code.
 */
const joinPanel: SwitchPanel = {
  title: "Join a lobby",
  tabLabel: "Join lobby",
  fields: [
    {
      name: "code",
      label: "Lobby code",
      inputType: "text",
      placeholder: "ABC123",
    },
    {
      name: "displayName",
      label: "Your name",
      inputType: "text",
      placeholder: "Ravi",
    },
  ],
  submitLabel: "Join lobby",
  prompt: {
    title: "Starting fresh?",
    description: "Create a lobby and invite your friends to it.",
    switchLabel: "Create a lobby",
  },
};

/**
 * The home screen's two ways in, shown as one {@link SwitchForm}: create a lobby,
 * or join one by its code. Both lead to the lobby screen, where the owner picks
 * a franchise.
 *
 * The form stays disabled until the guest session has an ID, so every request
 * carries one, and while a request is pending, so it cannot be sent twice. A
 * failed request raises a notice and keeps the typed values, so the form does
 * not move when the notice appears.
 *
 * A successful request plays the submit dissolve, then opens the lobby. The
 * panel grid lights up with a fine pointer, and all motion is off under reduced
 * motion (see {@link useLobbyEntryMotion}).
 *
 * @param props.lobbyHref - The route prefix the lobby opens under. Defaults to `/lobby`.
 * @returns The lobby entry form.
 */
export function LobbyEntry({
  lobbyHref = "/lobby",
}: {
  readonly lobbyHref?: string;
}) {
  const router = useRouter();
  const { api, guestId } = useGuestSession();
  const [pending, setPending] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const { cursorOn, playSubmitTransition } = useLobbyEntryMotion(root);

  /**
   * Runs a create or join. On success it plays the dissolve, then opens the lobby
   * it returns. The form stays disabled through the dissolve, so it cannot be
   * sent twice.
   *
   * @param action - The API call that returns the lobby.
   */
  async function run(action: () => Promise<Lobby>) {
    setPending(true);
    try {
      const lobby = await action();
      playSubmitTransition(() => {
        router.push(`${lobbyHref}/${lobby.code}`);
      });
    } catch (caught) {
      notify({ tone: "error", message: describeApiError(caught) });
      setPending(false);
    }
  }

  /**
   * Sends the visible panel's values to the matching API call. The form has
   * already checked that every field is filled, so the fallbacks never apply.
   *
   * @param mode - The panel that was submitted: `signUp` creates, `signIn` joins.
   * @param values - The panel's field values, keyed by field name.
   */
  function handleSubmit(mode: SwitchMode, values: Record<string, string>) {
    if (!guestId) {
      return;
    }
    const displayName = values.displayName ?? "";
    if (mode === "signUp") {
      void run(() =>
        api.createLobby({
          name: values.lobbyName ?? "",
          guestId,
          displayName,
        }),
      );
      return;
    }
    void run(() =>
      api.joinLobby({ code: values.code ?? "", guestId, displayName }),
    );
  }

  const disabled = !guestId || pending;

  return (
    <div ref={root} {...stylex.props(styles.root)}>
      {cursorOn ? (
        <div aria-hidden="true" data-entry-grid {...stylex.props(styles.grid)}>
          {Array.from({ length: PANEL_CELL_COUNT }, (_, index) => (
            <div
              // The grid never reorders, so the index is a stable key.
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed, never-reordered grid
              key={index}
              data-entry-cell
              {...stylex.props(styles.cell)}
            />
          ))}
        </div>
      ) : null}
      <div data-entry-card {...stylex.props(styles.card)}>
        <SwitchForm
          aria-label="Create or join a lobby"
          signUp={createPanel}
          signIn={joinPanel}
          disabled={disabled}
          onSubmit={handleSubmit}
        />
      </div>
      <div aria-hidden="true" data-entry-wash {...stylex.props(styles.wash)} />
    </div>
  );
}
