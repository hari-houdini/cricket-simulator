import { describe, expect, it } from "vitest";

import { BID_TIMER_MS, SQUAD_SIZE } from "../const/auction.const";
import type { Auction, Lot } from "../types/auction.types";
import type { Player } from "../types/player.types";
import {
  bidBlockReason,
  bidIncrementLakhs,
  isLotExpired,
  lotOutcome,
  minimumBidLakhs,
  timeLeftMs,
} from "./auction-rules";

const player: Player = {
  id: "virat-kohli",
  name: "Virat Kohli",
  franchiseId: "rcb",
  role: "batter",
  category: "marquee",
  retired: false,
  batting: 90,
  bowling: 20,
  fielding: 70,
  basePrice: 200,
};

const NOW = 1_000_000;

/**
 * Builds a running auction with one open lot and the given purses.
 *
 * @param overrides - Fields to change on the lot or the auction.
 * @returns A valid auction for the rule checks.
 */
function auctionWith(overrides: Partial<Auction> = {}): Auction {
  return {
    lobbyCode: "ABC123",
    status: "running",
    lot: {
      player,
      highBid: null,
      minimumBidLakhs: 200,
      endsAt: NOW + BID_TIMER_MS,
    },
    remaining: 10,
    sold: [],
    unsold: [],
    log: [],
    purses: [
      {
        guestId: "asha",
        displayName: "Asha",
        purseLakhs: 10_000,
        squad: [],
      },
      {
        guestId: "ravi",
        displayName: "Ravi",
        purseLakhs: 10_000,
        squad: [],
      },
    ],
    ...overrides,
  };
}

describe("bidIncrementLakhs", () => {
  it("steps by ₹10L below ₹1cr", () => {
    expect(bidIncrementLakhs(40)).toBe(10);
    expect(bidIncrementLakhs(99)).toBe(10);
  });

  it("steps by ₹50L from ₹1cr up to and including ₹5cr", () => {
    expect(bidIncrementLakhs(100)).toBe(50);
    expect(bidIncrementLakhs(500)).toBe(50);
  });

  it("steps by ₹1cr above ₹5cr", () => {
    expect(bidIncrementLakhs(501)).toBe(100);
    expect(bidIncrementLakhs(1500)).toBe(100);
  });
});

describe("minimumBidLakhs", () => {
  it("opens at the base price when no one has bid", () => {
    expect(minimumBidLakhs(200, null)).toBe(200);
  });

  it("adds the increment for the current bid after a bid", () => {
    expect(minimumBidLakhs(200, 40)).toBe(50);
    expect(minimumBidLakhs(200, 100)).toBe(150);
    expect(minimumBidLakhs(200, 600)).toBe(700);
  });
});

describe("bidBlockReason", () => {
  it("allows the minimum bid from an owner with purse and room", () => {
    expect(bidBlockReason(auctionWith(), "asha", 200, NOW)).toBeNull();
  });

  it("blocks every bid once the auction is complete", () => {
    expect(
      bidBlockReason(
        auctionWith({ status: "complete", lot: null }),
        "asha",
        200,
        NOW,
      ),
    ).toBe("no-open-lot");
  });

  it("blocks a bid when the lot is still empty", () => {
    expect(bidBlockReason(auctionWith({ lot: null }), "asha", 200, NOW)).toBe(
      "no-open-lot",
    );
  });

  it("blocks a bid once the timer has run out, so the hammer comes first", () => {
    expect(bidBlockReason(auctionWith(), "asha", 200, NOW + BID_TIMER_MS)).toBe(
      "lot-closed",
    );
  });

  it("blocks a guest who has no purse in this auction", () => {
    expect(bidBlockReason(auctionWith(), "stranger", 200, NOW)).toBe(
      "not-an-owner",
    );
  });

  it("blocks an owner whose squad is already full", () => {
    const squad = Array.from({ length: SQUAD_SIZE }, (_, index) => ({
      ...player,
      id: `filler-${index}`,
      name: `Filler ${index}`,
    }));
    const auction = auctionWith();
    const asha = auction.purses[0];
    if (!asha) {
      throw new Error("expected a purse");
    }
    asha.squad = squad;

    expect(bidBlockReason(auction, "asha", 200, NOW)).toBe("squad-full");
  });

  it("blocks the current high bidder from raising their own bid", () => {
    const lot: Lot = {
      player,
      highBid: { guestId: "asha", displayName: "Asha", amountLakhs: 200 },
      minimumBidLakhs: 210,
      endsAt: NOW + BID_TIMER_MS,
    };

    expect(bidBlockReason(auctionWith({ lot }), "asha", 210, NOW)).toBe(
      "already-high-bidder",
    );
  });

  it("blocks an amount that is not the minimum next bid", () => {
    expect(bidBlockReason(auctionWith(), "asha", 250, NOW)).toBe(
      "not-next-step",
    );
  });

  it("blocks a bid the owner cannot afford", () => {
    const auction = auctionWith();
    const asha = auction.purses[0];
    if (!asha) {
      throw new Error("expected a purse");
    }
    asha.purseLakhs = 150;

    expect(bidBlockReason(auction, "asha", 200, NOW)).toBe("over-purse");
  });

  it("allows a bid that spends the whole purse exactly", () => {
    const auction = auctionWith();
    const asha = auction.purses[0];
    if (!asha) {
      throw new Error("expected a purse");
    }
    asha.purseLakhs = 200;

    expect(bidBlockReason(auction, "asha", 200, NOW)).toBeNull();
  });
});

describe("isLotExpired and timeLeftMs", () => {
  const lot = auctionWith().lot;
  if (!lot) {
    throw new Error("expected a lot");
  }

  it("is not expired before the end time", () => {
    expect(isLotExpired(lot, NOW)).toBe(false);
  });

  it("is expired at the end time", () => {
    expect(isLotExpired(lot, NOW + BID_TIMER_MS)).toBe(true);
  });

  it("counts down to zero and never below it", () => {
    expect(timeLeftMs(NOW + BID_TIMER_MS, NOW)).toBe(BID_TIMER_MS);
    expect(timeLeftMs(NOW + BID_TIMER_MS, NOW + BID_TIMER_MS + 500)).toBe(0);
  });
});

describe("lotOutcome", () => {
  it("is unsold when no one bid", () => {
    expect(lotOutcome(auctionWith().lot as Lot)).toEqual({ kind: "unsold" });
  });

  it("is sold to the highest bidder at their bid", () => {
    const lot: Lot = {
      player,
      highBid: { guestId: "ravi", displayName: "Ravi", amountLakhs: 250 },
      minimumBidLakhs: 300,
      endsAt: NOW,
    };

    expect(lotOutcome(lot)).toEqual({
      kind: "sold",
      sale: { guestId: "ravi", displayName: "Ravi", amountLakhs: 250 },
    });
  });
});
