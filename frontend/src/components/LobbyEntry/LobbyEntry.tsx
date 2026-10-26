"use client";

import * as stylex from "@stylexjs/stylex";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import type { Lobby } from "../../shared/types/lobby.types";
import { describeApiError } from "../../shared/utils/describe-api-error";
import { Button } from "../Button/Button";
import { ErrorBanner } from "../ErrorBanner/ErrorBanner";
import { useGuestSession } from "../GuestSessionProvider/GuestSessionProvider";
import { Input } from "../Input/Input";
import { styles } from "./LobbyEntry.styles";

/**
 * The home screen's two ways in: create a lobby, or join one by its code. Both
 * lead to the lobby screen, where the owner picks a franchise.
 *
 * Both forms stay disabled until the guest session has an ID, so every request
 * carries one. A failed request shows its message above the forms and keeps the
 * typed values.
 *
 * @returns The create and join forms.
 */
export function LobbyEntry() {
  const router = useRouter();
  const { api, guestId } = useGuestSession();
  const [lobbyName, setLobbyName] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [code, setCode] = useState("");
  const [joinerName, setJoinerName] = useState("");
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
   * @param event - The create form's submit event.
   */
  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guestId) {
      return;
    }
    void run(() =>
      api.createLobby({ name: lobbyName, guestId, displayName: creatorName }),
    );
  }

  /**
   * @param event - The join form's submit event.
   */
  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guestId) {
      return;
    }
    void run(() => api.joinLobby({ code, guestId, displayName: joinerName }));
  }

  const disabled = !guestId || pending;

  return (
    <>
      {error ? <ErrorBanner message={error} /> : null}
      <div {...stylex.props(styles.grid)}>
        <form
          onSubmit={handleCreate}
          aria-labelledby="create-lobby-heading"
          {...stylex.props(styles.panel)}
        >
          <h2 id="create-lobby-heading" {...stylex.props(styles.title)}>
            Create a lobby
          </h2>
          <Input
            kind="text"
            id="create-lobby-name"
            label="Lobby name"
            placeholder="Sunday League"
            value={lobbyName}
            onChange={(event) => setLobbyName(event.target.value)}
          />
          <Input
            kind="text"
            id="create-display-name"
            label="Your name"
            placeholder="Asha"
            value={creatorName}
            onChange={(event) => setCreatorName(event.target.value)}
          />
          <Button type="submit" disabled={disabled}>
            Create lobby
          </Button>
        </form>

        <form
          onSubmit={handleJoin}
          aria-labelledby="join-lobby-heading"
          {...stylex.props(styles.panel)}
        >
          <h2 id="join-lobby-heading" {...stylex.props(styles.title)}>
            Join a lobby
          </h2>
          <Input
            kind="text"
            id="join-lobby-code"
            label="Lobby code"
            placeholder="ABC123"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <Input
            kind="text"
            id="join-display-name"
            label="Your name"
            placeholder="Ravi"
            value={joinerName}
            onChange={(event) => setJoinerName(event.target.value)}
          />
          <Button type="submit" disabled={disabled}>
            Join lobby
          </Button>
        </form>
      </div>
    </>
  );
}
