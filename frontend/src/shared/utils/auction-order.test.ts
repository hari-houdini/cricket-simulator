import { describe, expect, it } from "vitest";

import { shuffleAuctionOrder } from "./auction-order";

const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];

describe("shuffleAuctionOrder", () => {
  it("returns every id exactly once", () => {
    const order = shuffleAuctionOrder(ids, "ABC123:auction");

    expect([...order].sort()).toEqual([...ids].sort());
  });

  it("gives the same order for the same seed", () => {
    expect(shuffleAuctionOrder(ids, "ABC123:auction")).toEqual(
      shuffleAuctionOrder(ids, "ABC123:auction"),
    );
  });

  it("gives a different order for a different seed", () => {
    expect(shuffleAuctionOrder(ids, "ABC123:auction")).not.toEqual(
      shuffleAuctionOrder(ids, "XYZ789:auction"),
    );
  });

  it("does not change the input array", () => {
    const input = [...ids];
    shuffleAuctionOrder(input, "ABC123:auction");

    expect(input).toEqual(ids);
  });

  it("handles an empty list and a single id", () => {
    expect(shuffleAuctionOrder([], "ABC123:auction")).toEqual([]);
    expect(shuffleAuctionOrder(["only"], "ABC123:auction")).toEqual(["only"]);
  });
});
