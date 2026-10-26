"use client";

import * as stylex from "@stylexjs/stylex";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ZodError } from "zod";

import type { Lobby } from "../../shared/types/lobby.types";
import { describeApiError } from "../../shared/utils/describe-api-error";
import { LobbyNotFoundError } from "../../shared/utils/game-api.errors";
import { EmptyState } from "../EmptyState/EmptyState";
import { ErrorBanner } from "../ErrorBanner/ErrorBanner";
import { useGuestSession } from "../GuestSessionProvider/GuestSessionProvider";
import { LobbyView } from "../LobbyView/LobbyView";
import { Skeleton } from "../Skeleton/Skeleton";
import { styles } from "./LobbyScreen.styles";
import type { LobbyScreenProps } from "./LobbyScreen.types";

/**
 * How often the lobby is re-read while its auction runs. The auction panel reads
 * the auction itself, but the lobby decides whether the squad panel shows, so
 * the lobby must move on to `complete` without a reload.
 */
const LOBBY_POLL_MS = 1000;

/**
 * What the screen is showing: loading, a lobby, no lobby at this code, or a
 * failure that the guest can read.
 */
type ScreenState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly lobby: Lobby }
  | { readonly status: "missing" }
  | { readonly status: "failed"; readonly message: string };

/**
 * Loads a lobby by its code and runs the guest's actions on it. A shared link
 * opens here, so a guest who is not yet an owner gets the join form first.
 *
 * A code that cannot be a lobby code is reported the same way as one that is
 * not found, since the guest sees the same mistake either way.
 *
 * @param props.code - The lobby code from the URL.
 * @returns The loading state, the lobby, or a message.
 */
export function LobbyScreen({ code }: LobbyScreenProps) {
  const { api, guestId } = useGuestSession();
  const [state, setState] = useState<ScreenState>({ status: "loading" });
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!guestId) {
      return;
    }
    let cancelled = false;
    api
      .getLobby(code)
      .then((lobby) => {
        if (!cancelled) {
          setState({ status: "ready", lobby });
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) {
          return;
        }
        if (
          caught instanceof LobbyNotFoundError ||
          caught instanceof ZodError
        ) {
          setState({ status: "missing" });
        } else {
          setState({ status: "failed", message: describeApiError(caught) });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, code, guestId]);

  const auctionRunning =
    state.status === "ready" && state.lobby.auctionStatus === "running";

  // Re-read the lobby while the auction runs, so it notices when the auction ends.
  // A failed read is skipped; the next tick tries again.
  useEffect(() => {
    if (!auctionRunning) {
      return;
    }
    let cancelled = false;
    const id = window.setInterval(() => {
      api
        .getLobby(code)
        .then((lobby) => {
          if (!cancelled) {
            setState({ status: "ready", lobby });
          }
        })
        .catch(() => undefined);
    }, LOBBY_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [api, code, auctionRunning]);

  /**
   * Runs an action that returns the lobby, and shows the result or the error.
   *
   * @param action - The API call to run.
   */
  async function run(action: () => Promise<Lobby>) {
    setActionError(null);
    setPending(true);
    try {
      const lobby = await action();
      setState({ status: "ready", lobby });
    } catch (caught) {
      setActionError(describeApiError(caught));
    } finally {
      setPending(false);
    }
  }

  if (state.status === "missing") {
    return (
      <EmptyState
        title="No lobby has this code"
        description="Check the code and try again, or ask the owner for a new link."
        action={
          <Link href="/" {...stylex.props(styles.link)}>
            Back to home
          </Link>
        }
      />
    );
  }

  if (state.status === "failed") {
    return <ErrorBanner message={state.message} />;
  }

  if (state.status === "loading" || !guestId) {
    return (
      <output aria-busy="true" {...stylex.props(styles.loading)}>
        <span {...stylex.props(styles.srOnly)}>Loading lobby</span>
        <Skeleton height="2rem" width="60%" />
        <Skeleton height="1rem" />
        <Skeleton height="12rem" />
      </output>
    );
  }

  const { lobby } = state;
  return (
    <LobbyView
      lobby={lobby}
      guestId={guestId}
      shareUrl={`${window.location.origin}/lobby/${lobby.code}`}
      pending={pending}
      error={actionError}
      onClaim={(franchiseId) =>
        void run(() =>
          api.claimFranchise({ code: lobby.code, guestId, franchiseId }),
        )
      }
      onJoin={(displayName) =>
        void run(() =>
          api.joinLobby({ code: lobby.code, guestId, displayName }),
        )
      }
      onStart={() =>
        void run(() => api.startAuction({ code: lobby.code, guestId }))
      }
    />
  );
}
