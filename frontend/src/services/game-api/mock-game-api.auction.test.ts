import { describe, expect, it } from "vitest";

import {
  BID_TIMER_MS,
  STARTING_PURSE_LAKHS,
} from "../../shared/const/auction.const";
import {
  AuctionAlreadyStartedError,
  AuctionNotStartedError,
  AuctionStartBlockedError,
  BidBlockedError,
  FranchiseClaimClosedError,
  NotAnOwnerError,
} from "../../shared/utils/game-api.errors";
import { currentPlayers } from "./auction-pool";
import { createMockGameApi } from "./mock-game-api";

const asha = { guestId: "asha", displayName: "Asha" };
const ravi = { guestId: "ravi", displayName: "Ravi" };

/**
 * Builds a mock with a fake clock, a lobby with Asha and Ravi, and both of them
 * holding franchises, so the auction can start.
 *
 * @param start - The clock's starting time, in epoch milliseconds.
 * @returns The API, the clock setter and the lobby code.
 */
async function setUpLobby(start = 1_000_000) {
  let clock = start;
  const api = createMockGameApi({ seed: "auction", now: () => clock });
  const created = await api.createLobby({ name: "Auction", ...asha });
  await api.joinLobby({ code: created.code, ...ravi });
  await api.claimFranchise({
    code: created.code,
    guestId: asha.guestId,
    franchiseId: "csk",
  });
  await api.claimFranchise({
    code: created.code,
    guestId: ravi.guestId,
    franchiseId: "mi",
  });
  return {
    api,
    code: created.code,
    setClock: (next: number) => {
      clock = next;
    },
    advance: (ms: number) => {
      clock += ms;
    },
    now: () => clock,
  };
}

describe("startAuction", () => {
  it("refuses to start while an owner has no franchise", async () => {
    const clock = 1_000_000;
    const api = createMockGameApi({ seed: "unclaimed", now: () => clock });
    const created = await api.createLobby({ name: "Early", ...asha });

    await expect(
      api.startAuction({ code: created.code, guestId: asha.guestId }),
    ).rejects.toEqual(new AuctionStartBlockedError("unclaimed-franchise"));
  });

  it("lets only an owner start the auction", async () => {
    const { api, code } = await setUpLobby();

    await expect(
      api.startAuction({ code, guestId: "stranger" }),
    ).rejects.toBeInstanceOf(NotAnOwnerError);
  });

  it("moves the lobby to running and opens the first lot at the base price", async () => {
    const { api, code } = await setUpLobby();

    const lobby = await api.startAuction({ code, guestId: asha.guestId });
    const auction = await api.getAuction(code);

    expect(lobby.auctionStatus).toBe("running");
    expect(auction.lot?.minimumBidLakhs).toBe(auction.lot?.player.basePrice);
    expect(auction.remaining).toBe(currentPlayers().length - 1);
    expect(auction.purses.map((purse) => purse.purseLakhs)).toEqual([
      STARTING_PURSE_LAKHS,
      STARTING_PURSE_LAKHS,
    ]);
  });

  it("gives the same first lot for the same seed and clock", async () => {
    const first = await setUpLobby();
    const second = await setUpLobby();
    await first.api.startAuction({ code: first.code, guestId: asha.guestId });
    await second.api.startAuction({ code: second.code, guestId: asha.guestId });

    const firstLot = (await first.api.getAuction(first.code)).lot?.player.id;
    const secondLot = (await second.api.getAuction(second.code)).lot?.player.id;

    expect(firstLot).toBe(secondLot);
  });

  it("refuses a second start", async () => {
    const { api, code } = await setUpLobby();
    await api.startAuction({ code, guestId: asha.guestId });

    await expect(
      api.startAuction({ code, guestId: asha.guestId }),
    ).rejects.toBeInstanceOf(AuctionAlreadyStartedError);
  });
});

describe("getAuction before the start", () => {
  it("rejects with AuctionNotStartedError", async () => {
    const { api, code } = await setUpLobby();

    await expect(api.getAuction(code)).rejects.toBeInstanceOf(
      AuctionNotStartedError,
    );
  });
});

describe("placeBid", () => {
  it("accepts the minimum bid and restarts the timer", async () => {
    const { api, code, advance, now } = await setUpLobby();
    await api.startAuction({ code, guestId: asha.guestId });
    const opening = (await api.getAuction(code)).lot;
    if (!opening) {
      throw new Error("expected a lot");
    }

    advance(15_000);
    const auction = await api.placeBid({
      code,
      guestId: asha.guestId,
      amountLakhs: opening.minimumBidLakhs,
    });

    expect(auction.lot?.highBid?.guestId).toBe(asha.guestId);
    expect(auction.lot?.endsAt).toBe(now() + BID_TIMER_MS);
    expect(auction.log).toHaveLength(1);
    expect(auction.lot?.minimumBidLakhs).toBe(opening.minimumBidLakhs + 10);
  });

  it("refuses an amount that is not the minimum next bid", async () => {
    const { api, code } = await setUpLobby();
    await api.startAuction({ code, guestId: asha.guestId });

    await expect(
      api.placeBid({ code, guestId: asha.guestId, amountLakhs: 99_999 }),
    ).rejects.toEqual(new BidBlockedError("not-next-step"));
  });

  it("lets the next owner outbid, then sells the lot to them at the hammer", async () => {
    const { api, code, advance } = await setUpLobby();
    await api.startAuction({ code, guestId: asha.guestId });
    const opening = (await api.getAuction(code)).lot;
    if (!opening) {
      throw new Error("expected a lot");
    }
    const ashaBid = opening.minimumBidLakhs;
    await api.placeBid({ code, guestId: asha.guestId, amountLakhs: ashaBid });
    const raised = ashaBid + 10;

    await api.placeBid({ code, guestId: ravi.guestId, amountLakhs: raised });
    advance(BID_TIMER_MS);
    const auction = await api.getAuction(code);

    expect(auction.sold).toEqual([
      expect.objectContaining({
        guestId: ravi.guestId,
        amountLakhs: raised,
      }),
    ]);
    expect(
      auction.purses.find((purse) => purse.guestId === ravi.guestId),
    ).toMatchObject({
      purseLakhs: STARTING_PURSE_LAKHS - raised,
      squad: [expect.objectContaining({ id: opening.player.id })],
    });
    expect(auction.lot?.player.id).not.toBe(opening.player.id);
  });

  it("refuses the current high bidder raising their own bid", async () => {
    const { api, code } = await setUpLobby();
    await api.startAuction({ code, guestId: asha.guestId });
    const opening = (await api.getAuction(code)).lot;
    if (!opening) {
      throw new Error("expected a lot");
    }
    await api.placeBid({
      code,
      guestId: asha.guestId,
      amountLakhs: opening.minimumBidLakhs,
    });

    await expect(
      api.placeBid({
        code,
        guestId: asha.guestId,
        amountLakhs: opening.minimumBidLakhs + 10,
      }),
    ).rejects.toEqual(new BidBlockedError("already-high-bidder"));
  });

  it("sends an unbid lot to the unsold pool when its timer runs out", async () => {
    const { api, code, advance } = await setUpLobby();
    await api.startAuction({ code, guestId: asha.guestId });
    const opening = (await api.getAuction(code)).lot;
    if (!opening) {
      throw new Error("expected a lot");
    }

    advance(BID_TIMER_MS);
    const auction = await api.getAuction(code);

    expect(auction.unsold.map((player) => player.id)).toEqual([
      opening.player.id,
    ]);
    expect(auction.sold).toEqual([]);
  });

  it("settles an expired lot before a late bid, so the late bid is priced against the next lot", async () => {
    const { api, code, advance } = await setUpLobby();
    await api.startAuction({ code, guestId: asha.guestId });
    const opening = (await api.getAuction(code)).lot;
    if (!opening) {
      throw new Error("expected a lot");
    }

    advance(BID_TIMER_MS + 1_000);

    await expect(
      api.placeBid({
        code,
        guestId: asha.guestId,
        amountLakhs: opening.player.basePrice,
      }),
    ).rejects.toEqual(new BidBlockedError("not-next-step"));
    const auction = await api.getAuction(code);
    expect(auction.unsold.map((player) => player.id)).toEqual([
      opening.player.id,
    ]);
    expect(auction.lot?.player.id).not.toBe(opening.player.id);
    expect(auction.lot?.highBid).toBeNull();
  });
});

describe("lobby closes once the auction starts", () => {
  it("refuses a new guest joining the lobby", async () => {
    const { api, code } = await setUpLobby();
    await api.startAuction({ code, guestId: asha.guestId });

    await expect(
      api.joinLobby({ code, guestId: "late", displayName: "Late" }),
    ).rejects.toBeInstanceOf(AuctionAlreadyStartedError);
  });

  it("still lets an existing owner rejoin, as a no-op", async () => {
    const { api, code } = await setUpLobby();
    await api.startAuction({ code, guestId: asha.guestId });

    const lobby = await api.joinLobby({ code, ...asha });

    expect(lobby.owners).toHaveLength(2);
  });

  it("refuses a franchise claim", async () => {
    const { api, code } = await setUpLobby();
    await api.startAuction({ code, guestId: asha.guestId });

    await expect(
      api.claimFranchise({ code, guestId: asha.guestId, franchiseId: "rcb" }),
    ).rejects.toBeInstanceOf(FranchiseClaimClosedError);
  });
});
