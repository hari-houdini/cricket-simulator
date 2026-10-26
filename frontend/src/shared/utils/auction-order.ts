import { createSeededRandom } from "./seeded-random";

/**
 * Shuffles player ids into the auction order for a lobby. The same seed gives
 * the same order, so every guest sees the same players come up in the same
 * sequence (`docs/game-design.md` section 3). Uses Fisher-Yates with the seeded
 * generator, so the result is a permutation of the input.
 *
 * @param ids - Player ids in their seed order.
 * @param seed - The lobby seed, such as its code.
 * @returns A new array with the same ids in auction order.
 */
export function shuffleAuctionOrder(
  ids: readonly string[],
  seed: string,
): string[] {
  const random = createSeededRandom(seed);
  const order = [...ids];
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    const current = order[index];
    const other = order[swapWith];
    if (current === undefined || other === undefined) {
      throw new Error("Shuffle index out of range.");
    }
    order[index] = other;
    order[swapWith] = current;
  }
  return order;
}
