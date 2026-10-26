import { Suspense } from "react";

import { LobbyScreen } from "../../../components/LobbyScreen/LobbyScreen";

/**
 * Reads the lobby code from the route and renders the lobby screen. It sits
 * under a Suspense boundary because route params are runtime data, which Next
 * will not read during prerender outside a boundary.
 *
 * @param props.params - The route params, including the lobby `code`.
 * @returns The lobby screen for that code.
 */
async function LobbyFromParams({ params }: PageProps<"/lobby/[code]">) {
  const { code } = await params;
  return <LobbyScreen code={code} />;
}

/**
 * The lobby page, reached from the share link or from the home screen after
 * creating or joining a lobby. The screen validates the code before any request.
 *
 * @param props.params - The route params, including the lobby `code`.
 * @returns The lobby page, with a fallback until the code is read.
 */
export default function LobbyPage(props: PageProps<"/lobby/[code]">) {
  return (
    <Suspense fallback={<p>Loading lobby…</p>}>
      <LobbyFromParams {...props} />
    </Suspense>
  );
}
