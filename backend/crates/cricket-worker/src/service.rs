//! The lobby service: one operation in, one JSON body out, with the lobby changed in place.
//!
//! This module is plain Rust with no Cloudflare types, so the whole season is tested on the
//! host. The Durable Object in `durable.rs` loads the lobby, calls {@link execute}, saves the
//! result when it changed, and sets the next alarm. Nothing here reads a clock: the caller
//! passes `now_ms`.

use cricket_core::auction::AuctionError;
use cricket_core::lobby::{Lobby, LobbyError, Phase};
use cricket_core::match_simulator::ModifierConfig;
use cricket_core::models::{Franchise, Player};
use cricket_core::schedule::Fixture;
use cricket_core::seed_data::{parse_franchises, parse_players, parse_schedule};
use cricket_core::squad::SQUAD_SIZE;

use crate::errors::{ApiError, from_lobby, substitution_reason, xi_reason};
use crate::operation::Operation;
use crate::views;

/// The seed data a lobby is created from. It is parsed once and shared by every request.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Seeds {
    /// Seed version recorded on the lobby (GLOSSARY.md, Seed file).
    pub seed_version: String,
    /// The 10 franchise IDs.
    pub franchise_ids: Vec<String>,
    /// The player pool.
    pub players: Vec<Player>,
    /// The league template every lobby shuffles its own schedule from.
    pub template: Vec<Fixture>,
}

impl Seeds {
    /// Parses the three seed files.
    ///
    /// @param players_json - Contents of `players.v1.json`.
    /// @param franchises_json - Contents of `franchises.v1.json`.
    /// @param schedule_json - Contents of `ipl-schedule.v1.json`.
    /// @returns The parsed seeds. The players' seed version is used for every lobby.
    /// @throws Returns a `serde_json::Error` if any file does not match its shape.
    pub fn parse(
        players_json: &str,
        franchises_json: &str,
        schedule_json: &str,
    ) -> Result<Self, serde_json::Error> {
        let players = parse_players(players_json)?;
        let franchises: Vec<Franchise> = parse_franchises(franchises_json)?.franchises;
        let schedule = parse_schedule(schedule_json)?;
        Ok(Self {
            seed_version: players.seed_version,
            franchise_ids: franchises
                .into_iter()
                .map(|franchise| franchise.id)
                .collect(),
            players: players.players,
            template: schedule.league,
        })
    }
}

/// Creates a lobby, with the creator as its first guest.
///
/// @param code - The lobby code, which is also its identifier.
/// @param name - The lobby's name.
/// @param guest_id - The creator.
/// @param display_name - The creator's name.
/// @param seeds - The seed data.
/// @returns The new lobby.
/// @throws Returns an {@link ApiError} if the creator cannot join, which an empty lobby prevents.
pub fn create(
    code: &str,
    name: &str,
    guest_id: &str,
    display_name: &str,
    seeds: &Seeds,
) -> Result<Lobby, ApiError> {
    let mut lobby = Lobby::new(
        code,
        name,
        &seeds.seed_version,
        seeds.franchise_ids.clone(),
        seeds.template.clone(),
    );
    lobby.join(guest_id, display_name).map_err(from_lobby)?;
    Ok(lobby)
}

/// Settles every auction lot whose timer has run out by `now_ms`. Each call closes one lot and
/// opens the next at `now_ms`, so the loop ends once no lot is overdue.
///
/// @param lobby - The lobby to bring up to date.
/// @param now_ms - The current time.
/// @returns `Ok(())` once no lot is overdue.
/// @throws Returns an {@link ApiError} if the auction refuses a close, which a running auction does not.
pub fn catch_up(lobby: &mut Lobby, now_ms: u64) -> Result<(), ApiError> {
    while auction_is_running(lobby) && overdue(lobby, now_ms) {
        lobby.tick(now_ms).map_err(from_lobby)?;
    }
    Ok(())
}

/// The next time the lobby needs waking, for the auction timer.
///
/// @param lobby - The lobby.
/// @returns The deadline of the open lot, or `None` when no timer is running.
pub fn next_wake(lobby: &Lobby) -> Option<u64> {
    if !auction_is_running(lobby) {
        return None;
    }
    lobby
        .auction()
        .and_then(|auction| auction.current_lot())
        .map(|lot| lot.deadline_ms)
}

/// Reports whether the auction is in progress with an open lot.
///
/// @param lobby - The lobby.
/// @returns `true` while the auction is running.
fn auction_is_running(lobby: &Lobby) -> bool {
    lobby.phase() == Phase::Auction
        && lobby
            .auction()
            .is_some_and(|auction| !auction.is_complete())
}

/// Reports whether the open lot's timer has run out.
///
/// @param lobby - The lobby.
/// @param now_ms - The current time.
/// @returns `true` when the lot should close now.
fn overdue(lobby: &Lobby, now_ms: u64) -> bool {
    lobby
        .auction()
        .and_then(|auction| auction.current_lot())
        .is_some_and(|lot| now_ms >= lot.deadline_ms)
}

/// Brings the lobby up to date with the clock: settles overdue auction lots, then plays the season
/// step that is due (ADR 0008). Every operation and read runs this before and after it, so the
/// season moves only while the lobby is being used.
///
/// A step blocked by an owner with no legal XI is left in place rather than failing the call, so
/// reads of the lobby still work while the owner resolves it.
///
/// @param lobby - The lobby, changed in place.
/// @param now_ms - The current time.
/// @param config - The ball model parameters.
/// @returns `Ok(())` once the lobby is up to date.
/// @throws Returns an {@link ApiError} if a season step fails for any other reason.
fn settle(lobby: &mut Lobby, now_ms: u64, config: &ModifierConfig) -> Result<(), ApiError> {
    catch_up(lobby, now_ms)?;
    match lobby.advance_clock(now_ms, config) {
        Ok(_) | Err(LobbyError::XiMissing(_)) => Ok(()),
        Err(error) => Err(from_lobby(error)),
    }
}

/// Runs one operation on a lobby.
///
/// The lobby is brought up to date before and after the operation. Before, so the operation sees
/// the season as it stands now. After, so a pause or skip it causes takes effect in the same call.
/// A refused operation can still have changed the lobby by the first step, which is why the caller
/// saves whenever the lobby differs.
///
/// @param lobby - The lobby, changed in place.
/// @param operation - The action.
/// @param now_ms - The current time.
/// @param seeds - The seed data, for the auction pool.
/// @param config - The ball model parameters.
/// @returns The JSON body of the response.
/// @throws Returns an {@link ApiError} for a refused operation, with the status and name the frontend expects.
pub fn execute(
    lobby: &mut Lobby,
    operation: Operation,
    now_ms: u64,
    seeds: &Seeds,
    config: &ModifierConfig,
) -> Result<String, ApiError> {
    settle(lobby, now_ms, config)?;
    let body = match operation {
        // Creation happens before a lobby exists, in `create`, so reaching here means the code is taken.
        Operation::CreateLobby { .. } => return Err(ApiError::new(409, "LobbyCodeTakenError")),
        Operation::GetLobby => to_json(&views::lobby(lobby)),
        Operation::Join {
            guest_id,
            display_name,
        } => {
            lobby.join(&guest_id, &display_name).map_err(join_error)?;
            to_json(&views::lobby(lobby))
        }
        Operation::ClaimFranchise {
            guest_id,
            franchise_id,
        } => {
            lobby
                .claim_franchise(&guest_id, &franchise_id)
                .map_err(claim_error)?;
            to_json(&views::lobby(lobby))
        }
        Operation::StartAuction { guest_id } => {
            if !lobby.is_member(&guest_id) {
                return Err(ApiError::new(403, "NotAnOwnerError"));
            }
            lobby
                .start_auction(seeds.players.clone(), now_ms)
                .map_err(start_error)?;
            to_json(&views::lobby(lobby))
        }
        Operation::GetAuction => to_json(&views::auction(lobby)?),
        Operation::PlaceBid {
            guest_id,
            amount_lakhs,
        } => {
            lobby
                .place_bid(&guest_id, amount_lakhs, now_ms)
                .map_err(|error| bid_error(lobby, &guest_id, error))?;
            to_json(&views::auction(lobby)?)
        }
        Operation::GetSquad { guest_id } => to_json(&views::squad(lobby, &guest_id)?),
        Operation::GetLineups => to_json(&views::lineups(lobby)?),
        Operation::SetStartingXi {
            guest_id,
            player_ids,
            captain_id,
            vice_captain_id,
        } => {
            lobby
                .set_starting_xi(&guest_id, player_ids, &captain_id, &vice_captain_id)
                .map_err(xi_error)?;
            to_json(&views::squad(lobby, &guest_id)?)
        }
        Operation::Substitute {
            guest_id,
            out_player_id,
            in_player_id,
        } => {
            lobby
                .substitute(&guest_id, &out_player_id, &in_player_id)
                .map_err(substitute_error)?;
            to_json(&views::squad(lobby, &guest_id)?)
        }
        Operation::BeginSubstitution { guest_id } => {
            lobby
                .begin_substitution(&guest_id)
                .map_err(substitute_error)?;
            to_json(&views::lobby(lobby))
        }
        Operation::CancelSubstitution { guest_id } => {
            lobby.cancel_substitution(&guest_id);
            to_json(&views::lobby(lobby))
        }
        Operation::SetSkipVote { guest_id, vote } => {
            lobby.set_skip_vote(&guest_id, vote).map_err(from_lobby)?;
            to_json(&views::lobby(lobby))
        }
        Operation::GetLeague => to_json(&views::league(lobby)?),
        Operation::GetStandings => to_json(&views::standings(lobby)?),
        Operation::GetMatch { match_id } => to_json(&views::played_match(lobby, &match_id)?),
        Operation::GetPlayoffs => to_json(&views::playoffs(lobby, config)?),
        Operation::GetAwards => to_json(&views::awards(lobby)?),
    };
    settle(lobby, now_ms, config)?;
    Ok(body)
}

/// Serialises a response body.
///
/// @param value - The DTO.
/// @returns The JSON text.
fn to_json<T: serde::Serialize>(value: &T) -> String {
    serde_json::to_string(value).expect("DTOs serialise to JSON")
}

/// Maps a join refusal. A join once the auction has started is `AuctionAlreadyStartedError`.
///
/// @param error - The lobby refusal.
/// @returns The HTTP refusal.
fn join_error(error: LobbyError) -> ApiError {
    match error {
        LobbyError::WrongPhase { .. } => ApiError::new(409, "AuctionAlreadyStartedError"),
        other => from_lobby(other),
    }
}

/// Maps a claim refusal. A claim once the auction has started is `FranchiseClaimClosedError`.
///
/// @param error - The lobby refusal.
/// @returns The HTTP refusal.
fn claim_error(error: LobbyError) -> ApiError {
    match error {
        LobbyError::WrongPhase { .. } => ApiError::new(409, "FranchiseClaimClosedError"),
        other => from_lobby(other),
    }
}

/// Maps an auction start refusal. Starting twice is `AuctionAlreadyStartedError`.
///
/// @param error - The lobby refusal.
/// @returns The HTTP refusal.
fn start_error(error: LobbyError) -> ApiError {
    match error {
        LobbyError::WrongPhase { .. } => ApiError::new(409, "AuctionAlreadyStartedError"),
        other => from_lobby(other),
    }
}

/// Maps a bid refusal. A bid from an owner whose squad is already full is `squad-full`, because
/// the auction only knows it as not bidding.
///
/// @param lobby - The lobby, to read the bidder's squad.
/// @param guest_id - The bidder.
/// @param error - The lobby refusal.
/// @returns The HTTP refusal.
fn bid_error(lobby: &Lobby, guest_id: &str, error: LobbyError) -> ApiError {
    match error {
        LobbyError::WrongPhase { .. } => ApiError::because(409, "BidBlockedError", "no-open-lot"),
        LobbyError::Auction(AuctionError::NotBidding) => {
            let full = lobby
                .auction()
                .and_then(|auction| {
                    auction
                        .owners()
                        .iter()
                        .find(|owner| owner.guest_id == guest_id)
                })
                .is_some_and(|owner| owner.squad.len() >= SQUAD_SIZE);
            let reason = if full { "squad-full" } else { "not-an-owner" };
            ApiError::because(409, "BidBlockedError", reason)
        }
        other => from_lobby(other),
    }
}

/// Maps a starting-XI refusal, with the frontend's names for a locked or illegal XI.
///
/// @param error - The lobby refusal.
/// @returns The HTTP refusal.
fn xi_error(error: LobbyError) -> ApiError {
    match error {
        LobbyError::XiLocked => ApiError::new(409, "XiLockedError"),
        LobbyError::InvalidXi(rule) => ApiError::because(409, "XiBlockedError", xi_reason(&rule)),
        LobbyError::WrongPhase { .. } => ApiError::new(409, "SquadNotReadyError"),
        other => from_lobby(other),
    }
}

/// Maps a substitution refusal.
///
/// @param error - The lobby refusal.
/// @returns The HTTP refusal.
fn substitute_error(error: LobbyError) -> ApiError {
    match error {
        LobbyError::Substitution(reason) => ApiError::because(
            409,
            "SubstitutionBlockedError",
            substitution_reason(&reason),
        ),
        other => from_lobby(other),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cricket_core::auction::BID_TIMER_MS;
    use cricket_core::lobby::MATCH_INTERVAL_MS;

    const PLAYERS: &str = include_str!("../../../../data/seeds/players.v1.json");
    const FRANCHISES: &str = include_str!("../../../../data/seeds/franchises.v1.json");
    const SCHEDULE: &str = include_str!("../../../../data/seeds/ipl-schedule.v1.json");

    fn seeds() -> Seeds {
        Seeds::parse(PLAYERS, FRANCHISES, SCHEDULE).expect("seed files parse")
    }

    fn run(lobby: &mut Lobby, operation: Operation, now_ms: u64) -> Result<String, ApiError> {
        execute(
            lobby,
            operation,
            now_ms,
            &seeds(),
            &ModifierConfig::default(),
        )
    }

    fn join(guest: &str) -> Operation {
        Operation::Join {
            guest_id: guest.to_string(),
            display_name: guest.to_string(),
        }
    }

    fn claim(guest: &str, franchise: &str) -> Operation {
        Operation::ClaimFranchise {
            guest_id: guest.to_string(),
            franchise_id: franchise.to_string(),
        }
    }

    fn start(guest: &str) -> Operation {
        Operation::StartAuction {
            guest_id: guest.to_string(),
        }
    }

    /// A lobby with one guest who has claimed CSK.
    fn lobby_with_one_owner() -> Lobby {
        let mut lobby = create("ABC123", "Test", "a", "a", &seeds()).expect("creates");
        run(&mut lobby, claim("a", "csk"), 0).expect("claims");
        lobby
    }

    /// Runs the auction to its end. The guest bids the base price on every lot they can, as the
    /// lot opens, and every timer is then run out in turn.
    ///
    /// @param lobby - A lobby whose auction has started.
    /// @param guest - The guest who bids.
    /// @returns The time the auction ended.
    fn play_auction(lobby: &mut Lobby, guest: &str) -> u64 {
        let mut now = 0;
        while lobby.phase() == Phase::Auction {
            let deadline = next_wake(lobby).expect("a timer runs");
            let opened = deadline - BID_TIMER_MS;
            if let Some(base) = lobby
                .auction()
                .and_then(|auction| auction.current_lot())
                .map(|lot| lot.player.base_price)
            {
                let _ = run(
                    lobby,
                    Operation::PlaceBid {
                        guest_id: guest.to_string(),
                        amount_lakhs: base,
                    },
                    opened,
                );
            }
            now = deadline;
            run(lobby, Operation::GetAuction, now).expect("reads");
        }
        now
    }

    /// Sets the guest's XI to the strongest legal one from their squad, as an owner would.
    /// A league round is blocked until every owner has an XI, so the season tests need one.
    ///
    /// @param lobby - A lobby whose auction has ended.
    /// @param guest - The owner.
    /// @param now - The current time.
    fn set_strongest_xi(lobby: &mut Lobby, guest: &str, now: u64) {
        let players: Vec<cricket_core::models::Player> = lobby
            .squads()
            .iter()
            .find(|entry| entry.owner_guest_id.as_deref() == Some(guest))
            .expect("the owner has a squad")
            .players
            .clone();
        let legal = cricket_core::system_squad::strongest_legal_xi(&players)
            .expect("the bought squad has a legal XI");
        let captain = legal[0].clone();
        let vice_captain = legal[1].clone();
        run(
            lobby,
            Operation::SetStartingXi {
                guest_id: guest.to_string(),
                player_ids: legal,
                captain_id: captain,
                vice_captain_id: vice_captain,
            },
            now,
        )
        .expect("the legal XI is accepted");
    }

    #[test]
    fn a_guest_must_join_before_claiming_and_the_auction_needs_every_claim() {
        let mut lobby = create("ABC123", "Test", "a", "a", &seeds()).expect("creates");
        run(&mut lobby, join("b"), 0).expect("joins");
        let blocked = run(&mut lobby, start("a"), 0).unwrap_err();
        assert_eq!(blocked.name, "AuctionStartBlockedError");
        assert_eq!(blocked.reason, Some("unclaimed-franchise"));
        assert_eq!(
            run(&mut lobby, claim("zzz", "csk"), 0).unwrap_err().status,
            403
        );
    }

    #[test]
    fn a_claim_or_join_after_the_auction_starts_is_refused_by_name() {
        let mut lobby = lobby_with_one_owner();
        run(&mut lobby, start("a"), 0).expect("starts");
        assert_eq!(
            run(&mut lobby, claim("a", "mi"), 0).unwrap_err().name,
            "FranchiseClaimClosedError"
        );
        assert_eq!(
            run(&mut lobby, join("late"), 0).unwrap_err().name,
            "AuctionAlreadyStartedError"
        );
    }

    #[test]
    fn a_bid_is_refused_with_the_reason_the_frontend_shows() {
        let mut lobby = lobby_with_one_owner();
        run(&mut lobby, start("a"), 0).expect("starts");
        let base = lobby
            .auction()
            .and_then(|auction| auction.current_lot())
            .map(|lot| lot.player.base_price)
            .expect("a lot is open");

        let wrong = run(
            &mut lobby,
            Operation::PlaceBid {
                guest_id: "a".to_string(),
                amount_lakhs: base + 7,
            },
            0,
        )
        .unwrap_err();
        assert_eq!(wrong.name, "BidBlockedError");
        assert_eq!(wrong.reason, Some("not-next-step"));

        let stranger = run(
            &mut lobby,
            Operation::PlaceBid {
                guest_id: "nobody".to_string(),
                amount_lakhs: base,
            },
            0,
        )
        .unwrap_err();
        assert_eq!(stranger.reason, Some("not-an-owner"));
    }

    #[test]
    fn an_expired_lot_is_settled_before_a_read() {
        let mut lobby = lobby_with_one_owner();
        run(&mut lobby, start("a"), 0).expect("starts");
        let deadline = next_wake(&lobby).expect("a timer runs");
        let before = lobby.auction().expect("auction").remaining();
        let body = run(&mut lobby, Operation::GetAuction, deadline).expect("reads");
        assert!(
            body.contains("\"log\":[]"),
            "no bids, so the lot went unsold"
        );
        assert_eq!(lobby.auction().expect("auction").remaining(), before - 1);
    }

    #[test]
    fn a_squad_read_before_the_auction_ends_is_not_ready() {
        let mut lobby = lobby_with_one_owner();
        let refused = run(
            &mut lobby,
            Operation::GetSquad {
                guest_id: "a".to_string(),
            },
            0,
        )
        .unwrap_err();
        assert_eq!(refused.name, "SquadNotReadyError");
    }

    #[test]
    fn lineups_are_public_once_the_auction_ends_and_list_only_the_owners() {
        let mut lobby = lobby_with_one_owner();
        let refused = run(&mut lobby, Operation::GetLineups, 0).unwrap_err();
        assert_eq!(refused.name, "SquadNotReadyError");

        run(&mut lobby, start("a"), 0).expect("starts");
        let now = play_auction(&mut lobby, "a");
        let body = run(&mut lobby, Operation::GetLineups, now).expect("the lineups read");
        let lineups: serde_json::Value = serde_json::from_str(&body).expect("JSON");
        assert_eq!(
            lineups.as_array().map(Vec::len),
            Some(1),
            "system squads are left out"
        );
        assert_eq!(lineups[0]["guestId"], "a");
        assert_eq!(lineups[0]["players"].as_array().map(Vec::len), Some(15));
        assert!(
            lineups[0]["startingXi"].is_null(),
            "no XI is saved until the owner saves one"
        );
    }

    #[test]
    fn a_whole_season_is_played_through_the_operations_and_awards_name_winners() {
        let mut lobby = lobby_with_one_owner();
        run(&mut lobby, start("a"), 0).expect("starts");
        let now = play_auction(&mut lobby, "a");
        assert_eq!(lobby.phase(), Phase::League);
        set_strongest_xi(&mut lobby, "a", now);

        // Seventy league matches, then four playoff matches, one per read of the clock.
        let now = play_out_season(&mut lobby, now);
        assert_eq!(lobby.phase(), Phase::Complete);

        let awards: serde_json::Value =
            serde_json::from_str(&run(&mut lobby, Operation::GetAwards, now).expect("awards"))
                .expect("JSON");
        assert_eq!(awards["seasonComplete"], true);
        assert_eq!(awards["manOfTheMatch"].as_array().map(Vec::len), Some(74));
        assert!(awards["orangeCap"]["winner"]["name"].is_string());
        assert!(awards["fairPlay"]["winnerFranchiseId"].is_string());
    }

    #[test]
    fn the_playoffs_read_replays_each_match_log_to_its_result() {
        let mut lobby = lobby_with_one_owner();
        run(&mut lobby, start("a"), 0).expect("starts");
        let now = play_auction(&mut lobby, "a");
        set_strongest_xi(&mut lobby, "a", now);
        let now = play_out_season(&mut lobby, now);

        let body = run(&mut lobby, Operation::GetPlayoffs, now).expect("the playoffs read");
        let bracket: serde_json::Value = serde_json::from_str(&body).expect("JSON");
        let matches = bracket["matches"].as_array().expect("four slots");
        assert_eq!(matches.len(), 4);
        for slot in matches {
            let result = &slot["result"];
            let log = result["matchLog"].as_array().expect("a match log");
            let first = log.first().expect("a toss");
            let last = log.last().expect("a result");
            assert_eq!(first["kind"], "toss");
            assert_eq!(last["kind"], "result");
            assert_eq!(last["winnerFranchiseId"], result["winnerFranchiseId"]);
            assert!(log.iter().any(|event| event["kind"] == "wicket"));
            assert!(result["manOfTheMatch"]["name"].is_string());
        }
    }

    #[test]
    fn the_stored_season_stays_well_under_the_durable_object_value_limit() {
        let mut lobby = lobby_with_one_owner();
        run(&mut lobby, start("a"), 0).expect("starts");
        let now = play_auction(&mut lobby, "a");
        set_strongest_xi(&mut lobby, "a", now);
        play_out_season(&mut lobby, now);
        let stored = serde_json::to_string(&lobby).expect("serialises");
        // Durable Object values are capped at 2 MiB. A season should use a small fraction of it.
        assert!(
            stored.len() < 1_000_000,
            "stored lobby is {} bytes",
            stored.len()
        );
    }

    /// Reads the lobby once per interval until the season is complete, so each read is one step of
    /// the clock. Returns the time of the last read.
    ///
    /// @param lobby - The lobby with a running season.
    /// @param now - The time the season was last touched.
    /// @returns The time of the last read.
    fn play_out_season(lobby: &mut Lobby, now: u64) -> u64 {
        let mut at = now;
        // A season is 74 steps, and the clock needs one extra read to start.
        for _ in 0..200 {
            if lobby.phase() == Phase::Complete {
                return at;
            }
            at += MATCH_INTERVAL_MS;
            run(lobby, Operation::GetLobby, at).expect("the clock reads");
        }
        panic!("the season did not finish");
    }

    #[test]
    fn the_season_moves_only_as_the_clock_is_read() {
        let mut lobby = lobby_with_one_owner();
        run(&mut lobby, start("a"), 0).expect("starts");
        let now = play_auction(&mut lobby, "a");
        set_strongest_xi(&mut lobby, "a", now);
        let due = lobby
            .next_match_at_ms()
            .expect("the clock starts with the league");

        run(&mut lobby, Operation::GetLobby, due - 1).expect("reads");
        assert_eq!(lobby.matches_played(), 0);
        run(&mut lobby, Operation::GetLobby, due).expect("reads");
        assert_eq!(lobby.matches_played(), 1);
    }

    #[test]
    fn a_substitution_holds_the_season_for_every_read_until_it_is_cancelled() {
        let mut lobby = lobby_with_one_owner();
        run(&mut lobby, start("a"), 0).expect("starts");
        let now = play_auction(&mut lobby, "a");
        set_strongest_xi(&mut lobby, "a", now);
        let first = lobby
            .next_match_at_ms()
            .expect("the clock starts with the league");
        run(&mut lobby, Operation::GetLobby, first).expect("the first match plays");
        assert_eq!(lobby.matches_played(), 1);

        let due = lobby
            .next_match_at_ms()
            .expect("the clock is running again");
        run(
            &mut lobby,
            Operation::BeginSubstitution {
                guest_id: "a".to_string(),
            },
            due - 1,
        )
        .expect("the substitution opens");
        run(&mut lobby, Operation::GetLobby, due + 10_000).expect("reads");
        assert_eq!(lobby.matches_played(), 1, "nothing is played while paused");

        run(
            &mut lobby,
            Operation::CancelSubstitution {
                guest_id: "a".to_string(),
            },
            due + 10_000,
        )
        .expect("the substitution is cancelled");
        assert_eq!(
            lobby.next_match_at_ms(),
            Some(due + 10_001),
            "the pause is not charged to the next match"
        );
        run(&mut lobby, Operation::GetLobby, due + 10_001).expect("reads");
        assert_eq!(lobby.matches_played(), 2);
    }

    #[test]
    fn an_illegal_xi_names_the_rule_that_failed() {
        let mut lobby = lobby_with_one_owner();
        run(&mut lobby, start("a"), 0).expect("starts");
        let now = play_auction(&mut lobby, "a");
        let refused = run(
            &mut lobby,
            Operation::SetStartingXi {
                guest_id: "a".to_string(),
                player_ids: vec!["one".to_string()],
                captain_id: "one".to_string(),
                vice_captain_id: "two".to_string(),
            },
            now,
        )
        .unwrap_err();
        assert_eq!(refused.name, "XiBlockedError");
        assert_eq!(refused.reason, Some("wrong-size"));
    }
}
