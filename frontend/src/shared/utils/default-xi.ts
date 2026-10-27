import { MIN_BOWLING_OPTIONS, XI_SIZE } from "../const/squad.const";
import type { Player } from "../types/player.types";
import type { StartingXi } from "../types/squad.types";
import { isBowlingOption } from "./squad-rules";

/**
 * Picks a starting XI for an owner who saved none, so the league can still be
 * played. It takes the strongest wicket-keeper, the strongest bowling options
 * up to the minimum, then the strongest remaining players, and it always
 * passes {@link startingXiBlock}. The first two players become captain and
 * vice-captain.
 *
 * TODO: the auction does not require a wicket-keeper or bowling options, so
 * some squads have no legal XI and this returns null. Guarantee a legal squad
 * in the auction, so this fallback never fails. Tracked in
 * `docs/game-design.md` section 14.
 *
 * @param squad - The owner's squad.
 * @returns A legal starting XI, or null when the squad cannot field one.
 */
export function defaultStartingXi(squad: readonly Player[]): StartingXi | null {
  const ranked = [...squad].sort(
    (left, right) =>
      right.batting +
      right.bowling +
      right.fielding -
      (left.batting + left.bowling + left.fielding),
  );
  const keeper = ranked.find((player) => player.role === "wicket-keeper");
  const bowlers = ranked.filter(isBowlingOption).slice(0, MIN_BOWLING_OPTIONS);
  if (!keeper || bowlers.length < MIN_BOWLING_OPTIONS) {
    return null;
  }

  const chosen = new Set<Player>([keeper, ...bowlers]);
  const fillers = ranked.filter(
    (player) => !chosen.has(player) && player.role !== "wicket-keeper",
  );
  const spots = XI_SIZE - chosen.size;
  if (fillers.length < spots) {
    return null;
  }
  for (const filler of fillers.slice(0, spots)) {
    chosen.add(filler);
  }

  const playerIds = ranked
    .filter((player) => chosen.has(player))
    .map((player) => player.id);
  // The XI has exactly XI_SIZE players here, so the first two always exist.
  const [captainId, viceCaptainId] = playerIds as [string, string];
  return { playerIds, captainId, viceCaptainId };
}
