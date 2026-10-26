import { Suspense } from "react";

import { LobbyRoute } from "../../../components/LobbyRoute/LobbyRoute";

/**
 * The lobby page, reached from the share link or from the home screen after
 * creating or joining a lobby. The code is read by a client component, which
 * sits under a Suspense boundary so the route still prerenders as a shell.
 *
 * @returns The lobby page, with a fallback until the code is read.
 */
export default function LobbyPage() {
  return (
    <Suspense fallback={<p>Loading lobby…</p>}>
      <LobbyRoute />
    </Suspense>
  );
}
