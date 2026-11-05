"use client";

import { useParams } from "next/navigation";

import { ProtoLobby } from "./ProtoLobby";

/**
 * Reads the lobby code from the URL on the client and renders the lobby. As in the production route, the code is read on the client,
 * so the page prerenders as a shell under a Suspense boundary.
 *
 * @returns The lobby for the code in the URL.
 */
export function ProtoLobbyRoute() {
  const { code } = useParams<{ code: string }>();
  return <ProtoLobby code={code} />;
}
