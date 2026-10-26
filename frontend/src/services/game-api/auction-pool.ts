import playersFile from "../../../../data/seeds/players.v1.json";
import type { Player } from "../../shared/types/player.types";
import { playerSeedFileSchema } from "../../shared/types/seed.schema";
import { shuffleAuctionOrder } from "../../shared/utils/auction-order";

let currentPool: readonly Player[] | undefined;

/**
 * The players a lobby auctions: current players from the seed, in seed order.
 * Retired players are kept in the seed for reference but are not drafted. The
 * file is parsed once, the first time a lobby needs it.
 *
 * @returns The current players, in seed order.
 */
export function currentPlayers(): readonly Player[] {
  currentPool ??= playerSeedFileSchema
    .parse(playersFile)
    .players.filter((player) => !player.retired);
  return currentPool;
}

/**
 * The order players come up for a lobby. It is derived from the lobby code, so
 * the same lobby always runs the same auction.
 *
 * @param code - The lobby code, used as the seed.
 * @returns The auction queue, in the order players will come up.
 */
export function auctionOrder(code: string): Player[] {
  const byId = new Map(currentPlayers().map((player) => [player.id, player]));
  return shuffleAuctionOrder([...byId.keys()], `${code}:auction`).flatMap(
    (id) => {
      const player = byId.get(id);
      return player ? [player] : [];
    },
  );
}
