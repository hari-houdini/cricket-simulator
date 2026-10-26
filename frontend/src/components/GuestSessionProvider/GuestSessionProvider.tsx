"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { GUEST_ID_STORAGE_KEY } from "../../shared/const/guest.const";
import type {
  GuestSession,
  GuestSessionProviderProps,
} from "./GuestSessionProvider.types";

const GuestSessionContext = createContext<GuestSession | null>(null);

/**
 * Makes a random guest ID. `crypto.randomUUID` needs a secure context, so a
 * page served over plain HTTP on a LAN falls back to a random string.
 *
 * @returns A new guest ID.
 */
function createGuestId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Returns the guest ID stored in the browser, creating and storing one if none
 * exists. If storage is blocked or cleared mid-session, the guest gets an ID for
 * this page load only, so the app still works.
 *
 * @returns The guest ID to use for this session.
 */
function readOrCreateGuestId(): string {
  try {
    const stored = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);
    if (stored) {
      return stored;
    }
    const created = createGuestId();
    window.localStorage.setItem(GUEST_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return createGuestId();
  }
}

/**
 * Holds the game API and the guest ID for the whole app, so every screen shares
 * one mock state and one identity. The app shell creates the API once per page
 * load and passes it in, which lets stories supply a seeded mock instead.
 *
 * @param props - The API to share, and the children to render inside it.
 * @returns The provider around the children.
 */
export function GuestSessionProvider({
  api,
  children,
}: GuestSessionProviderProps) {
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    setGuestId(readOrCreateGuestId());
  }, []);

  const session = useMemo(() => ({ api, guestId }), [api, guestId]);

  return (
    <GuestSessionContext.Provider value={session}>
      {children}
    </GuestSessionContext.Provider>
  );
}

/**
 * Reads the guest session. Must be called below a {@link GuestSessionProvider}.
 *
 * @returns The API and the guest ID (`null` until the browser has produced one).
 * @throws {Error} When called outside a {@link GuestSessionProvider}.
 */
export function useGuestSession(): GuestSession {
  const session = useContext(GuestSessionContext);
  if (!session) {
    throw new Error(
      "useGuestSession must be used inside GuestSessionProvider.",
    );
  }
  return session;
}
