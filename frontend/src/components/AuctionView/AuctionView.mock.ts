import { BASE_PRICE_LAKHS_BY_CATEGORY } from "../../shared/const/player.const";
import type { Auction } from "../../shared/types/auction.types";
import type { Player } from "../../shared/types/player.types";

/**
 * Fixtures for the auction stories. The clock is fixed, so the countdown and
 * the bid checks are the same on every run. `asha` and `ravi` own purses, and
 * `meera` has not joined the lobby.
 */

/** The time every story uses, in epoch milliseconds. */
export const STORY_NOW = 1_700_000_000_000;

/**
 * Builds a player whose base price matches its category, as the schema requires.
 *
 * @param id - The player id.
 * @param name - The player's name.
 * @param category - The auction category, which sets the base price.
 * @returns A valid player.
 */
function player(
  id: string,
  name: string,
  category: "marquee" | "capped" | "uncapped",
): Player {
  return {
    id,
    name,
    franchiseId: "csk",
    role: "batter",
    category,
    retired: false,
    batting: 80,
    bowling: 20,
    fielding: 60,
    basePrice: BASE_PRICE_LAKHS_BY_CATEGORY[category],
    troubleRating: 2,
  };
}

const kohli = player("virat-kohli", "Virat Kohli", "marquee");
const gaikwad = player("ruturaj-gaikwad", "Ruturaj Gaikwad", "capped");
const sharma = player("rohit-sharma", "Rohit Sharma", "marquee");

/** A running auction with nobody having bid on the lot yet. */
export const openLot: Auction = {
  lobbyCode: "ABC123",
  status: "running",
  lot: {
    player: kohli,
    highBid: null,
    minimumBidLakhs: kohli.basePrice,
    endsAt: STORY_NOW + 14_000,
  },
  remaining: 200,
  sold: [
    {
      player: gaikwad,
      guestId: "ravi",
      displayName: "Ravi",
      amountLakhs: 150,
    },
  ],
  unsold: [],
  log: [
    {
      sequence: 1,
      playerName: gaikwad.name,
      guestId: "ravi",
      displayName: "Ravi",
      amountLakhs: 150,
      at: STORY_NOW - 30_000,
    },
  ],
  purses: [
    { guestId: "asha", displayName: "Asha", purseLakhs: 10_000, squad: [] },
    {
      guestId: "ravi",
      displayName: "Ravi",
      purseLakhs: 9_850,
      squad: [gaikwad],
    },
  ],
};

/** The lot after Asha holds the highest bid at ₹2.00cr. */
export const ashaLeads: Auction = {
  ...openLot,
  lot: openLot.lot
    ? {
        ...openLot.lot,
        highBid: { guestId: "asha", displayName: "Asha", amountLakhs: 200 },
        minimumBidLakhs: 250,
        endsAt: STORY_NOW + 12_000,
      }
    : null,
};

/** The lot after Ravi holds the highest bid at ₹2.50cr, so Asha can outbid. */
export const raviLeads: Auction = {
  ...openLot,
  lot: openLot.lot
    ? {
        ...openLot.lot,
        highBid: { guestId: "ravi", displayName: "Ravi", amountLakhs: 250 },
        minimumBidLakhs: 300,
        endsAt: STORY_NOW + 9_000,
      }
    : null,
};

/** An auction that has finished, with no lot left on the table. */
export const finishedAuction: Auction = {
  ...openLot,
  status: "complete",
  lot: null,
  remaining: 0,
  sold: [
    ...openLot.sold,
    {
      player: sharma,
      guestId: "asha",
      displayName: "Asha",
      amountLakhs: 200,
    },
  ],
};
