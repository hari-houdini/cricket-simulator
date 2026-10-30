import { beforeAll, describe, expect, it } from "vitest";

import type { GameApi } from "../../shared/types/game-api.types";
import {
  AuctionAlreadyStartedError,
  AuctionNotStartedError,
  AuctionStartBlockedError,
  BidBlockedError,
  FranchiseClaimClosedError,
  FranchiseNotFoundError,
  LeagueNotStartedError,
  LobbyNotFoundError,
  NotAnOwnerError,
  SquadNotReadyError,
} from "../../shared/utils/game-api.errors";
import { createHttpGameApi } from "./http-game-api";
import { createMockGameApi } from "./mock-game-api";

/**
 * The contract every {@link GameApi} must meet. The same scenarios run against
 * the in-process mock and against the Rust backend, so a difference between the
 * two shows up as a failing test. The backend runs when `API_CONTRACT_URL` is
 * set, for example `API_CONTRACT_URL=http://localhost:8787` with `wrangler dev`
 * running in `backend/`. Otherwise only the mock runs.
 *
 * Each scenario creates its own lobby with fresh guest IDs, so scenarios do not
 * depend on each other or on the order they run in.
 */

/**
 * Returns a guest ID that no other scenario uses.
 *
 * @param label - A short name for the guest, for readable failures.
 * @returns A unique guest ID.
 */
function guest(label: string): string {
  return `${label}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Registers the contract scenarios for one implementation.
 *
 * @param label - The implementation's name, shown in the test output.
 * @param makeApi - Creates the implementation under test.
 */
function runContract(label: string, makeApi: () => GameApi): void {
  describe(label, () => {
    let api: GameApi;
    beforeAll(() => {
      api = makeApi();
    });

    it("creates a lobby with its creator as the first owner", async () => {
      const creator = guest("creator");
      const lobby = await api.createLobby({
        name: "Contract",
        guestId: creator,
        displayName: "Asha",
      });

      expect(lobby.code).toMatch(/^[A-Z0-9]{6}$/);
      expect(lobby.name).toBe("Contract");
      expect(lobby.phase).toBe("auction");
      expect(lobby.owners.map((owner) => owner.guestId)).toEqual([creator]);
    });

    it("reads a lobby back by its code, whatever the case", async () => {
      const created = await api.createLobby({
        name: "Readback",
        guestId: guest("reader"),
        displayName: "Ravi",
      });

      const lobby = await api.getLobby(created.code.toLowerCase());

      expect(lobby.code).toBe(created.code);
      expect(lobby.name).toBe("Readback");
    });

    it("refuses an unknown code with LobbyNotFoundError", async () => {
      await expect(api.getLobby("ZZZZZZ")).rejects.toBeInstanceOf(
        LobbyNotFoundError,
      );
    });

    it("keeps one owner when the same guest joins again", async () => {
      const created = await api.createLobby({
        name: "Rejoin",
        guestId: guest("host"),
        displayName: "Host",
      });
      const joiner = guest("joiner");

      await api.joinLobby({
        code: created.code,
        guestId: joiner,
        displayName: "Joiner",
      });
      const lobby = await api.joinLobby({
        code: created.code,
        guestId: joiner,
        displayName: "Joiner",
      });

      expect(lobby.owners).toHaveLength(2);
    });

    it("claims a franchise and shows it on the owner", async () => {
      const host = guest("claimer");
      const created = await api.createLobby({
        name: "Claim",
        guestId: host,
        displayName: "Claimer",
      });

      const lobby = await api.claimFranchise({
        code: created.code,
        guestId: host,
        franchiseId: "csk",
      });

      expect(lobby.owners[0]?.franchiseId).toBe("csk");
    });

    it("refuses a franchise the league does not have with FranchiseNotFoundError", async () => {
      const host = guest("unknown-franchise");
      const created = await api.createLobby({
        name: "Unknown",
        guestId: host,
        displayName: "Host",
      });

      await expect(
        api.claimFranchise({
          code: created.code,
          guestId: host,
          franchiseId: "nope",
        }),
      ).rejects.toBeInstanceOf(FranchiseNotFoundError);
    });

    it("refuses a claim from a guest who has not joined with NotAnOwnerError", async () => {
      const created = await api.createLobby({
        name: "Stranger",
        guestId: guest("member"),
        displayName: "Member",
      });

      await expect(
        api.claimFranchise({
          code: created.code,
          guestId: guest("stranger"),
          franchiseId: "mi",
        }),
      ).rejects.toBeInstanceOf(NotAnOwnerError);
    });

    it("refuses to start while an owner has no franchise, naming the reason", async () => {
      const host = guest("starter");
      const created = await api.createLobby({
        name: "Unclaimed",
        guestId: host,
        displayName: "Host",
      });
      await api.claimFranchise({
        code: created.code,
        guestId: host,
        franchiseId: "csk",
      });
      await api.joinLobby({
        code: created.code,
        guestId: guest("unclaimed"),
        displayName: "Unclaimed",
      });

      const refusal = await api
        .startAuction({ code: created.code, guestId: host })
        .catch((error: unknown) => error);

      expect(refusal).toBeInstanceOf(AuctionStartBlockedError);
      expect((refusal as AuctionStartBlockedError).reason).toBe(
        "unclaimed-franchise",
      );
    });

    it("refuses an auction read before the auction starts", async () => {
      const created = await api.createLobby({
        name: "Early",
        guestId: guest("early"),
        displayName: "Early",
      });

      await expect(api.getAuction(created.code)).rejects.toBeInstanceOf(
        AuctionNotStartedError,
      );
    });

    it("starts the auction, shows the open lot, and refuses a bid that is not the next step", async () => {
      const host = guest("bidder");
      const created = await api.createLobby({
        name: "Bidding",
        guestId: host,
        displayName: "Bidder",
      });
      await api.claimFranchise({
        code: created.code,
        guestId: host,
        franchiseId: "rcb",
      });
      await api.startAuction({ code: created.code, guestId: host });

      const auction = await api.getAuction(created.code);
      const minimum = auction.lot?.minimumBidLakhs ?? 0;
      expect(minimum).toBeGreaterThan(0);

      const refusal = await api
        .placeBid({
          code: created.code,
          guestId: host,
          amountLakhs: minimum + 7,
        })
        .catch((error: unknown) => error);

      expect(refusal).toBeInstanceOf(BidBlockedError);
      expect((refusal as BidBlockedError).reason).toBe("not-next-step");
    });

    it("refuses a claim and a join once the auction has started", async () => {
      const host = guest("closed");
      const created = await api.createLobby({
        name: "Closed",
        guestId: host,
        displayName: "Host",
      });
      await api.claimFranchise({
        code: created.code,
        guestId: host,
        franchiseId: "kkr",
      });
      await api.startAuction({ code: created.code, guestId: host });

      await expect(
        api.claimFranchise({
          code: created.code,
          guestId: host,
          franchiseId: "dc",
        }),
      ).rejects.toBeInstanceOf(FranchiseClaimClosedError);
      await expect(
        api.joinLobby({
          code: created.code,
          guestId: guest("late"),
          displayName: "Late",
        }),
      ).rejects.toBeInstanceOf(AuctionAlreadyStartedError);
    });

    it("refuses the squad and the league until the auction has finished", async () => {
      const host = guest("unfinished");
      const created = await api.createLobby({
        name: "Unfinished",
        guestId: host,
        displayName: "Host",
      });
      await api.claimFranchise({
        code: created.code,
        guestId: host,
        franchiseId: "srh",
      });
      await api.startAuction({ code: created.code, guestId: host });

      await expect(
        api.getSquad({ code: created.code, guestId: host }),
      ).rejects.toBeInstanceOf(SquadNotReadyError);
      await expect(api.getLeague(created.code)).rejects.toBeInstanceOf(
        LeagueNotStartedError,
      );
    });
  });
}

runContract("mock", () => createMockGameApi());

const liveUrl = process.env.API_CONTRACT_URL ?? "";
(liveUrl === "" ? describe.skip : describe)("backend", () => {
  runContract("http", () => createHttpGameApi({ baseUrl: liveUrl }));
});
