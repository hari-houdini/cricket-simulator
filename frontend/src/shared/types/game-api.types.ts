import type {
  Auction,
  PlaceBidInput,
  StartAuctionInput,
} from "./auction.types";
import type { Awards } from "./awards.types";
import type { GameEventListener, Unsubscribe } from "./game-event.types";
import type {
  AdvanceRoundInput,
  League,
  Match,
  Standing,
} from "./league.types";
import type {
  ClaimFranchiseInput,
  CreateLobbyInput,
  JoinLobbyInput,
  Lobby,
} from "./lobby.types";
import type { Playoffs } from "./playoffs.types";
import type {
  GetSquadInput,
  SetStartingXiInput,
  Squad,
  SubstituteInput,
} from "./squad.types";

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
  /**
   * Reads one owner's squad. Rejects with `SquadNotReadyError` until the
   * auction has finished, and with `NotAnOwnerError` for a guest who holds no
   * squad in the lobby.
   */
  readonly getSquad: (input: GetSquadInput) => Promise<Squad>;
  /**
   * Saves the owner's starting XI. Rejects with `XiLockedError` once the first
   * match has been played, and with `XiBlockedError` when the XI breaks a rule.
   */
  readonly setStartingXi: (input: SetStartingXiInput) => Promise<Squad>;
  /**
   * Makes the owner's one free substitution. Rejects with
   * `SubstitutionBlockedError` before the first match, after the swap is used,
   * or when the swap would leave an illegal XI.
   */
  readonly substitute: (input: SubstituteInput) => Promise<Squad>;
  /**
   * Reads the league: every fixture in round order, the table, and the round
   * reached. Rejects with `LeagueNotStartedError` until the auction has finished.
   */
  readonly getLeague: (code: string) => Promise<League>;
  /**
   * Plays the next league round and returns the league. Only an owner may play
   * it. Rejects with `LeagueAdvanceBlockedError` when the season is over or an
   * owner has no starting XI yet.
   */
  readonly advanceRound: (input: AdvanceRoundInput) => Promise<League>;
  /**
   * Reads the league table, best first. Rejects with `LeagueNotStartedError`
   * until the auction has finished.
   */
  readonly getStandings: (code: string) => Promise<Standing[]>;
  /**
   * Reads one played league match by its id, such as `r03-csk-mi`. Rejects
   * with `MatchNotFoundError` for an id no league match has, or a match not yet
   * played.
   */
  readonly getMatch: (code: string, matchId: string) => Promise<Match>;
  /**
   * Reads the playoff bracket. Rejects with `AuctionNotStartedError` before the
   * auction starts. Places are null until they are known.
   */
  readonly getPlayoffs: (code: string) => Promise<Playoffs>;
  /**
   * Reads the awards for the season so far: the caps, the Most Valuable Player,
   * the Emerging Player, Fair Play, and each match's Man of the Match. Rejects
   * with `AuctionNotStartedError` before the auction starts.
   */
  readonly getAwards: (code: string) => Promise<Awards>;
  /**
   * Listens for live events in a lobby: bids, hammers, match progress and the
   * season's end. Resolves to a function that stops the listening. The HTTP
   * mode rejects, since its live transport (WebSocket) is not built yet.
   */
  readonly subscribe: (
    code: string,
    listener: GameEventListener,
  ) => Promise<Unsubscribe>;
};
