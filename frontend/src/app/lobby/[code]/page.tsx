import { Suspense } from "react";

import { BroadcastFrame } from "../../_components/BroadcastFrame";
import { LowerThird } from "../../_components/LowerThird";
import { ProtoLobbyRoute } from "../../_components/ProtoLobbyRoute";

/**
 * Steps 2 to 8: the lobby. The lobby screen lays out the
 * scorebug, the owners, the franchise pick and the auction on the broadcast
 * layout. The season, the XI and the awards still use the production components
 * under the same theme. The lobby name is the page's `h1`, so the lower third
 * carries only its label.
 *
 * @returns The lobby step.
 */
export default function LobbyPage() {
  return (
    <BroadcastFrame stage="Lobby">
      <LowerThird eyebrow="Steps 2 to 8 · Franchise pick to awards" />
      <Suspense fallback={<p>Loading lobby…</p>}>
        <ProtoLobbyRoute />
      </Suspense>
    </BroadcastFrame>
  );
}
