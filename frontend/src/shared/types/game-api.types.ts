import type {
  Auction,
  PlaceBidInput,
  StartAuctionInput,
} from "./auction.types";
import type {
  ClaimFranchiseInput,
  CreateLobbyInput,
  JoinLobbyInput,
  Lobby,
} from "./lobby.types";

/**
 * The game API the UI depends on. Components and hooks use this type only, so
 * the mock and the Rust backend are interchangeable behind one switch
 * (`NEXT_PUBLIC_API_MODE`, see `createGameApi` in `services/game-api/`).
 *
 * Every method rejects with a typed error from `shared/utils/game-api.errors.ts`
 * when the lobby cannot be found, joined or claimed, and with a `ZodError` when
 * input is invalid.
 */
export type GameApi = {
  /** Creates a lobby with the caller as its first owner. */
  readonly createLobby: (input: CreateLobbyInput) => Promise<Lobby>;
  /** Fetches a lobby by its code. The code is case-insensitive. */
  readonly getLobby: (code: string) => Promise<Lobby>;
  /** Adds the caller as an owner. Joining again with the same guest ID is a no-op. */
  readonly joinLobby: (input: JoinLobbyInput) => Promise<Lobby>;
  /**
   * Gives the caller's owner one free franchise. Claiming the franchise they
   * already hold is a no-op. Switching to another free franchise replaces it.
   */
  readonly claimFranchise: (input: ClaimFranchiseInput) => Promise<Lobby>;
  /**
   * Starts the auction. Any owner may start it, once every owner has a franchise.
   * Joining and claiming close when it starts.
   */
  readonly startAuction: (input: StartAuctionInput) => Promise<Lobby>;
  /**
   * Reads the auction state. Rejects with `AuctionNotStartedError` before the
   * auction starts. Reading also settles any lot whose timer has run out.
   */
  readonly getAuction: (code: string) => Promise<Auction>;
  /**
   * Places a bid on the current lot. The amount must be the lot's minimum next
   * bid. Rejects with `BidBlockedError` when the bid is refused.
   */
  readonly placeBid: (input: PlaceBidInput) => Promise<Auction>;
};
