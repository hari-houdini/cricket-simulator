"use client";

import { useParams } from "next/navigation";

import { LobbyScreen } from "../LobbyScreen/LobbyScreen";

/**
 * Reads the lobby code from the URL on the client and renders the lobby screen.
 * `useParams` resolves during client navigation, so the code is never read on
 * the server, and the route's page can stay a static shell. The route must
 * render this under a Suspense boundary, since the hook reads runtime data.
 *
 * @returns The lobby screen for the code in the URL.
 */
export function LobbyRoute() {
  const { code } = useParams<{ code: string }>();
  return <LobbyScreen code={code} />;
}
