"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Lobby } from "../../shared/types/lobby.types";
import { describeApiError } from "../../shared/utils/describe-api-error";
import { ErrorBanner } from "../ErrorBanner/ErrorBanner";
import { useGuestSession } from "../GuestSessionProvider/GuestSessionProvider";
import { SwitchForm } from "../SwitchForm/SwitchForm";
import type { SwitchMode, SwitchPanel } from "../SwitchForm/SwitchForm.types";

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
 * failed request shows its message above the form and keeps the typed values.
 *
 * @returns The lobby entry form and any error from the last request.
 */
export function LobbyEntry() {
  const router = useRouter();
  const { api, guestId } = useGuestSession();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /**
   * Runs a create or join, then opens the lobby it returns.
   *
   * @param action - The API call that returns the lobby.
   */
  async function run(action: () => Promise<Lobby>) {
    setError(null);
    setPending(true);
    try {
      const lobby = await action();
      router.push(`/lobby/${lobby.code}`);
    } catch (caught) {
      setError(describeApiError(caught));
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
    <>
      {error ? <ErrorBanner message={error} /> : null}
      <SwitchForm
        aria-label="Create or join a lobby"
        signUp={createPanel}
        signIn={joinPanel}
        disabled={disabled}
        onSubmit={handleSubmit}
      />
    </>
  );
}
