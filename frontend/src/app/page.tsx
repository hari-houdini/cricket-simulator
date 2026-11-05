import { LobbyEntry } from "../components/LobbyEntry/LobbyEntry";
import { BroadcastFrame } from "./_components/BroadcastFrame";
import { LowerThird } from "./_components/LowerThird";

/**
 * Step 1: lobby entry. It reuses the production {@link LobbyEntry} and
 * its {@link SwitchForm}, so the form keeps its structure and motion. The lobby
 * opens at `/lobby`.
 *
 * @returns The lobby entry step.
 */
export default function Home() {
  return (
    <BroadcastFrame stage="Lobby entry">
      <LowerThird
        eyebrow="Step 1 of 8 · Lobby entry"
        title="Your season starts here"
      />
      <LobbyEntry />
    </BroadcastFrame>
  );
}
