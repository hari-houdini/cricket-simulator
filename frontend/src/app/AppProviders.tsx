"use client";

import { type ReactNode, useState } from "react";

import { GuestSessionProvider } from "../components/GuestSessionProvider/GuestSessionProvider";
import { createGameApi } from "../services/game-api/create-game-api";
import type { GameApi } from "../shared/types/game-api.types";

/**
 * Creates the game API once for this page load and shares it with the app. The
 * mock keeps its lobbies in memory, so the API must outlive client navigation.
 *
 * @param props.children - The app shell and pages.
 * @returns The children inside a guest session.
 */
export function AppProviders({ children }: { readonly children: ReactNode }) {
  const [api] = useState<GameApi>(() => createGameApi());
  return <GuestSessionProvider api={api}>{children}</GuestSessionProvider>;
}
