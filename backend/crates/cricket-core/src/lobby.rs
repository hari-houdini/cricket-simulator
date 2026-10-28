//! The lobby: one season from claiming franchises, through the auction, the league and the
//! playoffs (GLOSSARY.md, Lobby; docs/game-design.md sections 2 to 5).
//!
//! The lobby is pure state. Time and seed data come in as arguments, and the caller (the
//! Durable Object in `cricket-worker`) decides when to call `tick` and `advance`.

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

use crate::auction::{Auction, AuctionError, LotOutcome, OwnerSeat, SeatStatus, lot_order};
use crate::model::Player;
use crate::playoffs::{PlayoffBracket, PlayoffError};
use crate::schedule::{Fixture, ScheduleError, lobby_schedule};
use crate::simulator::{MatchOutcome, ModifierConfig, Side};
use crate::squad::{SQUAD_SIZE, SquadError, validate_starting_xi};
use crate::standings::{TeamRecord, league_table};
use crate::system_squad::{SystemSquadError, fill_system_squad, strongest_legal_xi};

/// Rounds in the league phase.
const LEAGUE_ROUNDS: u32 = 14;

/// Where the lobby is in the season (ARCHITECTURE.md, Lobby).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Phase {
    /// Guests are claiming franchises. The auction has not started.
    Waiting,
    /// The live auction is running, or has finished and squads are being set.
    Auction,
    /// The league is being played round by round.
    League,
    /// The playoff bracket is being played.
    Playoffs,
    /// The Final is played and the season is over.
    Complete,
}

/// A guest's claim on a franchise (GLOSSARY.md, Owner).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Claim {
    /// The guest.
    pub guest_id: String,
    /// The franchise they claimed.
    pub franchise_id: String,
}

/// A starting XI and its leadership, in batting order.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StartingXi {
    /// The 11 player IDs, batting order first.
    pub player_ids: Vec<String>,
    /// The captain, who earns 1.5x fantasy points.
    pub captain_id: String,
    /// The vice-captain, who earns 1.25x fantasy points.
    pub vice_captain_id: String,
}

/// One franchise's squad at the end of the auction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SquadEntry {
    /// The franchise.
    pub franchise_id: String,
    /// The owner, or `None` for a system squad.
    pub owner_guest_id: Option<String>,
    /// The 15 drafted players.
    pub players: Vec<Player>,
    /// The XI, once chosen. Owners choose theirs; system squads get the strongest legal XI.
    pub starting_xi: Option<StartingXi>,
}

/// Why a lobby action was refused.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LobbyError {
    /// The action is not allowed in the current phase.
    WrongPhase { phase: Phase },
    /// The franchise is not in this lobby.
    UnknownFranchise(String),
    /// Another guest already owns the franchise.
    FranchiseTaken(String),
    /// The guest already owns a franchise.
    AlreadyOwns(String),
    /// The auction cannot start with no owners.
    NoOwners,
    /// The guest does not own a franchise in this lobby.
    NotAnOwner(String),
    /// The starting XI breaks a squad rule.
    InvalidXi(SquadError),
    /// The XI is locked because the league has started.
    XiLocked,
    /// These franchises have no starting XI yet.
    XiMissing(Vec<String>),
    /// The auction refused the action.
    Auction(AuctionError),
    /// The league schedule could not be built from the template.
    Schedule(ScheduleError),
    /// A system squad could not be filled from the pool.
    SystemSquad(SystemSquadError),
    /// The playoff bracket refused the action.
    Playoff(PlayoffError),
}

/// One lobby: its franchises, owners, auction, squads, league and playoffs.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Lobby {
    /// The lobby identifier. Part of every seed.
    pub id: String,
    /// The seed data version the lobby was created with (GLOSSARY.md, Seed file).
    pub seed_version: String,
    franchise_ids: Vec<String>,
    claims: Vec<Claim>,
    connected: BTreeSet<String>,
    phase: Phase,
    auction: Option<Auction>,
    squads: Vec<SquadEntry>,
    schedule: Vec<Fixture>,
    league: Vec<MatchOutcome>,
    bracket: Option<PlayoffBracket>,
    next_round: u32,
}

impl Lobby {
    /// Creates a lobby in the waiting phase.
    ///
    /// @param id - The lobby identifier.
    /// @param seed_version - The seed data version to record.
    /// @param franchise_ids - The franchises in the lobby, normally all 10.
    /// @returns A lobby waiting for owners to claim franchises.
    pub fn new(id: &str, seed_version: &str, franchise_ids: Vec<String>) -> Self {
        Self {
            id: id.to_string(),
            seed_version: seed_version.to_string(),
            franchise_ids,
            claims: Vec::new(),
            connected: BTreeSet::new(),
            phase: Phase::Waiting,
            auction: None,
            squads: Vec::new(),
            schedule: Vec::new(),
            league: Vec::new(),
            bracket: None,
            next_round: 1,
        }
    }

    /// The current phase.
    ///
    /// @returns The phase.
    pub fn phase(&self) -> Phase {
        self.phase
    }

    /// The owners' claims.
    ///
    /// @returns Every claim, in the order guests claimed.
    pub fn claims(&self) -> &[Claim] {
        &self.claims
    }

    /// The auction, once started.
    ///
    /// @returns The auction, or `None` before the lobby starts it.
    pub fn auction(&self) -> Option<&Auction> {
        self.auction.as_ref()
    }

    /// Every franchise's squad, available once the auction is over.
    ///
    /// @returns The squads, one per franchise, or an empty list before the auction ends.
    pub fn squads(&self) -> &[SquadEntry] {
        &self.squads
    }

    /// Every league match played so far.
    ///
    /// @returns The league matches in play order.
    pub fn league(&self) -> &[MatchOutcome] {
        &self.league
    }

    /// The playoff bracket, once the league is over.
    ///
    /// @returns The bracket, or `None` before the playoffs.
    pub fn bracket(&self) -> Option<&PlayoffBracket> {
        self.bracket.as_ref()
    }

    /// The league table so far.
    ///
    /// @returns The table, best first.
    pub fn table(&self) -> Vec<TeamRecord> {
        league_table(&self.franchise_ids, &self.league)
    }

    /// The champion, once the Final is played.
    ///
    /// @returns The winning franchise, or `None` before the Final.
    pub fn champion(&self) -> Option<&str> {
        self.bracket.as_ref().and_then(PlayoffBracket::champion)
    }

    /// Records a guest's claim on a franchise.
    ///
    /// @param guest_id - The guest claiming.
    /// @param franchise_id - The franchise to claim.
    /// @returns `Ok(())` when the claim is recorded.
    /// @throws Returns a {@link LobbyError} if the phase is wrong, the franchise is unknown or taken, or the guest already owns one.
    pub fn claim_franchise(
        &mut self,
        guest_id: &str,
        franchise_id: &str,
    ) -> Result<(), LobbyError> {
        self.require_phase(Phase::Waiting)?;
        if !self.franchise_ids.iter().any(|id| id == franchise_id) {
            return Err(LobbyError::UnknownFranchise(franchise_id.to_string()));
        }
        if self
            .claims
            .iter()
            .any(|claim| claim.franchise_id == franchise_id)
        {
            return Err(LobbyError::FranchiseTaken(franchise_id.to_string()));
        }
        if self.claims.iter().any(|claim| claim.guest_id == guest_id) {
            return Err(LobbyError::AlreadyOwns(guest_id.to_string()));
        }
        self.claims.push(Claim {
            guest_id: guest_id.to_string(),
            franchise_id: franchise_id.to_string(),
        });
        // A guest who has just claimed is in the lobby, so they start connected.
        self.connected.insert(guest_id.to_string());
        Ok(())
    }

    /// Records whether a guest is connected. A disconnected owner is passed on each lot
    /// (docs/game-design.md section 14, open item 6, decided in grilling).
    ///
    /// @param guest_id - The guest.
    /// @param connected - `true` when the guest is connected.
    /// @returns The closed lots from any passes this change caused.
    /// @throws Returns a {@link LobbyError} if an auto-pass is refused by the auction.
    pub fn set_connected(
        &mut self,
        guest_id: &str,
        connected: bool,
    ) -> Result<Vec<LotOutcome>, LobbyError> {
        if connected {
            self.connected.insert(guest_id.to_string());
            Ok(Vec::new())
        } else {
            self.connected.remove(guest_id);
            self.settle_disconnected(0)
        }
    }

    /// Starts the auction with the player pool.
    ///
    /// @param players - The player pool, from the seed file.
    /// @param at_ms - The time the first lot opens, in milliseconds.
    /// @returns The lots closed by disconnect passes (usually none).
    /// @throws Returns a {@link LobbyError} if the lobby is not waiting or has no owners.
    pub fn start_auction(
        &mut self,
        players: Vec<Player>,
        at_ms: u64,
    ) -> Result<Vec<LotOutcome>, LobbyError> {
        self.require_phase(Phase::Waiting)?;
        if self.claims.is_empty() {
            return Err(LobbyError::NoOwners);
        }
        let seats: Vec<OwnerSeat> = self
            .claims
            .iter()
            .map(|claim| OwnerSeat {
                guest_id: claim.guest_id.clone(),
                franchise_id: claim.franchise_id.clone(),
            })
            .collect();
        let mut auction = Auction::new(&seats, lot_order(players, &self.id));
        auction.start(at_ms);
        self.auction = Some(auction);
        self.phase = Phase::Auction;
        let closed = self.settle_disconnected(at_ms)?;
        self.finish_auction_if_complete()?;
        Ok(closed)
    }

    /// Places a bid on the open lot.
    ///
    /// @param guest_id - The bidding owner.
    /// @param amount - The bid in lakhs.
    /// @param at_ms - The time of the bid.
    /// @returns `Ok(())` when the bid is accepted.
    /// @throws Returns a {@link LobbyError} if no auction is running or the auction refuses the bid.
    pub fn place_bid(&mut self, guest_id: &str, amount: u32, at_ms: u64) -> Result<(), LobbyError> {
        let auction = self.running_auction()?;
        auction
            .place_bid(guest_id, amount, at_ms)
            .map_err(LobbyError::Auction)
    }

    /// Passes on the open lot.
    ///
    /// @param guest_id - The passing owner.
    /// @param at_ms - The time of the pass.
    /// @returns Every lot closed by this pass and any disconnect passes it caused.
    /// @throws Returns a {@link LobbyError} if no auction is running or the auction refuses the pass.
    pub fn pass_lot(&mut self, guest_id: &str, at_ms: u64) -> Result<Vec<LotOutcome>, LobbyError> {
        let auction = self.running_auction()?;
        let mut closed = Vec::new();
        if let Some(outcome) = auction
            .pass_lot(guest_id, at_ms)
            .map_err(LobbyError::Auction)?
        {
            closed.push(outcome);
        }
        closed.extend(self.settle_disconnected(at_ms)?);
        self.finish_auction_if_complete()?;
        Ok(closed)
    }

    /// Advances the auction clock. Closes at most one lot whose timer has run out.
    ///
    /// @param at_ms - The current time.
    /// @returns The lots closed by this tick, including any disconnect passes.
    /// @throws Returns a {@link LobbyError} if no auction is running.
    pub fn tick(&mut self, at_ms: u64) -> Result<Vec<LotOutcome>, LobbyError> {
        let auction = self.running_auction()?;
        let mut closed = Vec::new();
        if let Some(outcome) = auction.tick(at_ms) {
            closed.push(outcome);
        }
        closed.extend(self.settle_disconnected(at_ms)?);
        self.finish_auction_if_complete()?;
        Ok(closed)
    }

    /// Sets an owner's starting XI. The XI can change until the first league match.
    ///
    /// @param guest_id - The owner.
    /// @param player_ids - The 11 player IDs in batting order.
    /// @param captain_id - The captain, from the XI.
    /// @param vice_captain_id - The vice-captain, from the XI and not the captain.
    /// @returns `Ok(())` when the XI is saved.
    /// @throws Returns a {@link LobbyError} if the XI is locked, the guest is not an owner, or the XI is illegal.
    pub fn set_starting_xi(
        &mut self,
        guest_id: &str,
        player_ids: Vec<String>,
        captain_id: &str,
        vice_captain_id: &str,
    ) -> Result<(), LobbyError> {
        if !self.league.is_empty() {
            return Err(LobbyError::XiLocked);
        }
        if !matches!(self.phase, Phase::Auction | Phase::League) {
            return Err(LobbyError::WrongPhase { phase: self.phase });
        }
        let entry = self
            .squads
            .iter_mut()
            .find(|entry| entry.owner_guest_id.as_deref() == Some(guest_id))
            .ok_or_else(|| LobbyError::NotAnOwner(guest_id.to_string()))?;
        validate_starting_xi(&entry.players, &player_ids, captain_id, vice_captain_id)
            .map_err(LobbyError::InvalidXi)?;
        entry.starting_xi = Some(StartingXi {
            player_ids,
            captain_id: captain_id.to_string(),
            vice_captain_id: vice_captain_id.to_string(),
        });
        Ok(())
    }

    /// Starts the league: builds the lobby's schedule from the template.
    ///
    /// Every franchise must have a starting XI first.
    ///
    /// @param template - The league fixtures from `ipl-schedule.v1.json`.
    /// @returns `Ok(())` when the league has started.
    /// @throws Returns a {@link LobbyError} if the auction is not over, an XI is missing, or the template is invalid.
    pub fn start_league(&mut self, template: &[Fixture]) -> Result<(), LobbyError> {
        self.require_phase(Phase::Auction)?;
        if self.squads.is_empty() {
            return Err(LobbyError::WrongPhase { phase: self.phase });
        }
        let missing: Vec<String> = self
            .squads
            .iter()
            .filter(|entry| entry.starting_xi.is_none())
            .map(|entry| entry.franchise_id.clone())
            .collect();
        if !missing.is_empty() {
            return Err(LobbyError::XiMissing(missing));
        }
        self.schedule = lobby_schedule(template, &self.id).map_err(LobbyError::Schedule)?;
        self.phase = Phase::League;
        Ok(())
    }

    /// Plays the next step of the season: a whole league round, or the next playoff match.
    ///
    /// @param config - The ball model parameters.
    /// @returns The matches played in this step.
    /// @throws Returns a {@link LobbyError} if the season is not running or a match cannot be played.
    pub fn advance(&mut self, config: &ModifierConfig) -> Result<Vec<MatchOutcome>, LobbyError> {
        match self.phase {
            Phase::League => self.play_league_round(config),
            Phase::Playoffs => self.play_playoff_match(config),
            phase => Err(LobbyError::WrongPhase { phase }),
        }
    }

    /// Plays every match in the next league round.
    ///
    /// @param config - The ball model parameters.
    /// @returns The round's matches.
    /// @throws Returns a {@link LobbyError} if a side or the bracket cannot be built.
    fn play_league_round(
        &mut self,
        config: &ModifierConfig,
    ) -> Result<Vec<MatchOutcome>, LobbyError> {
        let sides = self.sides()?;
        let round = self.next_round;
        let fixtures: Vec<Fixture> = self
            .schedule
            .iter()
            .filter(|fixture| fixture.round == round)
            .cloned()
            .collect();

        let mut played = Vec::with_capacity(fixtures.len());
        for fixture in fixtures {
            let home = find_side(&sides, &fixture.home_franchise_id)?;
            let away = find_side(&sides, &fixture.away_franchise_id)?;
            let match_id = format!(
                "r{:02}-{}-{}",
                round, fixture.home_franchise_id, fixture.away_franchise_id
            );
            played.push(crate::simulator::simulate_match(
                &self.id,
                &match_id,
                round,
                home,
                away,
                crate::simulator::MatchKind::League,
                config,
            ));
        }
        self.league.extend(played.iter().cloned());

        self.next_round += 1;
        if self.next_round > LEAGUE_ROUNDS {
            let table = self.table();
            self.bracket = Some(PlayoffBracket::new(&table).map_err(LobbyError::Playoff)?);
            self.phase = Phase::Playoffs;
        }
        Ok(played)
    }

    /// Plays the next playoff match.
    ///
    /// @param config - The ball model parameters.
    /// @returns The single match played.
    /// @throws Returns a {@link LobbyError} if the bracket refuses the match.
    fn play_playoff_match(
        &mut self,
        config: &ModifierConfig,
    ) -> Result<Vec<MatchOutcome>, LobbyError> {
        let sides = self.sides()?;
        let bracket = self
            .bracket
            .as_mut()
            .ok_or(LobbyError::WrongPhase { phase: self.phase })?;
        let outcome = bracket
            .play_next(&self.id, &sides, config)
            .map_err(LobbyError::Playoff)?
            .clone();
        if bracket.next_round().is_none() {
            self.phase = Phase::Complete;
        }
        Ok(vec![outcome])
    }

    /// Builds the sides for simulation from the squads and their chosen XIs.
    ///
    /// @returns One side per franchise, in batting order.
    /// @throws Returns {@link LobbyError::XiMissing} if any squad has no XI.
    fn sides(&self) -> Result<Vec<Side>, LobbyError> {
        let missing: Vec<String> = self
            .squads
            .iter()
            .filter(|entry| entry.starting_xi.is_none())
            .map(|entry| entry.franchise_id.clone())
            .collect();
        if !missing.is_empty() {
            return Err(LobbyError::XiMissing(missing));
        }
        Ok(self
            .squads
            .iter()
            .map(|entry| {
                let xi = entry
                    .starting_xi
                    .as_ref()
                    .map(|xi| xi.player_ids.as_slice())
                    .unwrap_or_default();
                Side {
                    franchise_id: entry.franchise_id.clone(),
                    xi: xi
                        .iter()
                        .filter_map(|id| {
                            entry
                                .players
                                .iter()
                                .find(|player| &player.id == id)
                                .cloned()
                        })
                        .collect(),
                }
            })
            .collect())
    }

    /// Passes for every connected-away owner who has to act on the open lot, until none is left.
    ///
    /// A pass can close the lot and open the next one. That next lot is handled in the same
    /// way, so a lobby where every owner is disconnected moves through the pool.
    ///
    /// @param at_ms - The time of the passes.
    /// @returns The lots closed by these passes.
    /// @throws Returns a {@link LobbyError} if the auction refuses a pass.
    fn settle_disconnected(&mut self, at_ms: u64) -> Result<Vec<LotOutcome>, LobbyError> {
        let mut closed = Vec::new();
        while let Some(guest_id) = self.next_disconnected_pass() {
            let auction = self
                .auction
                .as_mut()
                .ok_or(LobbyError::WrongPhase { phase: self.phase })?;
            if let Some(outcome) = auction
                .pass_lot(&guest_id, at_ms)
                .map_err(LobbyError::Auction)?
            {
                closed.push(outcome);
            }
        }
        Ok(closed)
    }

    /// The first connected-away owner who still has to act on the open lot.
    ///
    /// @returns The owner's guest ID, or `None` if no auto-pass is due.
    fn next_disconnected_pass(&self) -> Option<String> {
        let auction = self.auction.as_ref()?;
        let lot = auction.current_lot()?;
        auction
            .owners()
            .iter()
            .find(|owner| {
                owner.can_bid()
                    && !self.connected.contains(&owner.guest_id)
                    && !lot.passed.iter().any(|id| id == &owner.guest_id)
                    && lot
                        .leader
                        .as_ref()
                        .is_none_or(|bid| bid.guest_id != owner.guest_id)
            })
            .map(|owner| owner.guest_id.clone())
    }

    /// Ends the auction and builds every squad once no lot is left.
    ///
    /// Owners who are still active keep their squads. Every other franchise is a system squad,
    /// filled from the unsold pool and the released players.
    ///
    /// @returns `Ok(())` once the squads are built, or immediately if the auction is still running.
    /// @throws Returns a {@link LobbyError} if a system squad cannot be filled.
    fn finish_auction_if_complete(&mut self) -> Result<(), LobbyError> {
        let Some(auction) = self.auction.as_ref() else {
            return Ok(());
        };
        if self.phase != Phase::Auction || !auction.is_complete() || !self.squads.is_empty() {
            return Ok(());
        }

        let mut pool: Vec<Player> = auction.unsold().to_vec();
        pool.extend(auction.released().iter().cloned());

        let mut squads = Vec::with_capacity(self.franchise_ids.len());
        for franchise_id in self.franchise_ids.clone() {
            let owner = auction.owners().iter().find(|owner| {
                owner.franchise_id == franchise_id && owner.status == SeatStatus::Active
            });
            match owner {
                Some(owner) if owner.squad.len() == SQUAD_SIZE => squads.push(SquadEntry {
                    franchise_id,
                    owner_guest_id: Some(owner.guest_id.clone()),
                    players: owner.squad.clone(),
                    starting_xi: None,
                }),
                _ => {
                    let players = fill_system_squad(&franchise_id, &mut pool)
                        .map_err(LobbyError::SystemSquad)?;
                    let starting_xi = strongest_legal_xi(&players).map(|ids| StartingXi {
                        captain_id: ids[0].clone(),
                        vice_captain_id: ids[1].clone(),
                        player_ids: ids,
                    });
                    squads.push(SquadEntry {
                        franchise_id,
                        owner_guest_id: None,
                        players,
                        starting_xi,
                    });
                }
            }
        }
        self.squads = squads;
        Ok(())
    }

    /// Checks the lobby is in the expected phase.
    ///
    /// @param expected - The phase the action needs.
    /// @returns `Ok(())` when the phase matches.
    /// @throws Returns {@link LobbyError::WrongPhase} otherwise.
    fn require_phase(&self, expected: Phase) -> Result<(), LobbyError> {
        if self.phase == expected {
            Ok(())
        } else {
            Err(LobbyError::WrongPhase { phase: self.phase })
        }
    }

    /// The running auction.
    ///
    /// @returns The auction, which must be in the auction phase.
    /// @throws Returns {@link LobbyError::WrongPhase} if the auction is not running.
    fn running_auction(&mut self) -> Result<&mut Auction, LobbyError> {
        let phase = self.phase;
        match self.auction.as_mut() {
            Some(auction) if phase == Phase::Auction => Ok(auction),
            _ => Err(LobbyError::WrongPhase { phase }),
        }
    }
}

/// Finds a side by franchise ID.
///
/// @param sides - The sides to search.
/// @param franchise_id - The franchise.
/// @returns The side, or {@link LobbyError::UnknownFranchise} if it is missing.
fn find_side<'a>(sides: &'a [Side], franchise_id: &str) -> Result<&'a Side, LobbyError> {
    sides
        .iter()
        .find(|side| side.franchise_id == franchise_id)
        .ok_or_else(|| LobbyError::UnknownFranchise(franchise_id.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::Franchise;
    use crate::seed_data::{parse_franchises, parse_players, parse_schedule};

    const PLAYERS: &str = include_str!("../../../../data/seeds/players.v1.json");
    const FRANCHISES: &str = include_str!("../../../../data/seeds/franchises.v1.json");
    const SCHEDULE: &str = include_str!("../../../../data/seeds/ipl-schedule.v1.json");

    fn seed() -> (Vec<String>, Vec<Player>, Vec<Fixture>) {
        let franchises: Vec<Franchise> = parse_franchises(FRANCHISES)
            .expect("franchises parse")
            .franchises;
        let players = parse_players(PLAYERS).expect("players parse").players;
        let template = parse_schedule(SCHEDULE).expect("schedule parses").league;
        (
            franchises
                .into_iter()
                .map(|franchise| franchise.id)
                .collect(),
            players,
            template,
        )
    }

    fn new_lobby(franchise_ids: Vec<String>) -> Lobby {
        Lobby::new("lobby-test", "1.1.0", franchise_ids)
    }

    /// Runs the auction to the end. Each lot is either bid on by `bidder` (if they can afford
    /// and need it) or left alone, and then the clock is advanced past the deadline.
    fn run_auction(lobby: &mut Lobby, bidder: Option<&str>) {
        let mut now = 0u64;
        for _ in 0..1_000 {
            if lobby.phase() != Phase::Auction || lobby.auction().is_some_and(Auction::is_complete)
            {
                break;
            }
            if let (Some(guest), Some(lot)) =
                (bidder, lobby.auction().and_then(Auction::current_lot))
            {
                let base = lot.player.base_price;
                let can_bid = lobby
                    .auction()
                    .and_then(|auction| {
                        auction
                            .owners()
                            .iter()
                            .find(|owner| owner.guest_id == guest)
                    })
                    .is_some_and(|owner| owner.can_bid());
                if can_bid {
                    let _ = lobby.place_bid(guest, base, now);
                }
            }
            now += 5_000;
            lobby.tick(now).expect("auction is running");
        }
        assert!(
            lobby.auction().is_some_and(Auction::is_complete),
            "auction should finish"
        );
    }

    #[test]
    fn a_franchise_can_be_claimed_once_and_a_guest_owns_one() {
        let (ids, _, _) = seed();
        let mut lobby = new_lobby(ids);
        lobby
            .claim_franchise("guest-a", "csk")
            .expect("first claim");
        assert_eq!(
            lobby.claim_franchise("guest-b", "csk"),
            Err(LobbyError::FranchiseTaken("csk".to_string()))
        );
        assert_eq!(
            lobby.claim_franchise("guest-a", "mi"),
            Err(LobbyError::AlreadyOwns("guest-a".to_string()))
        );
        assert_eq!(
            lobby.claim_franchise("guest-c", "nope"),
            Err(LobbyError::UnknownFranchise("nope".to_string()))
        );
    }

    #[test]
    fn the_auction_needs_at_least_one_owner() {
        let (ids, players, _) = seed();
        let mut lobby = new_lobby(ids);
        assert_eq!(lobby.start_auction(players, 0), Err(LobbyError::NoOwners));
    }

    #[test]
    fn with_no_owner_bidding_every_franchise_gets_a_system_squad_with_a_legal_xi() {
        let (ids, players, template) = seed();
        let mut lobby = new_lobby(ids.clone());
        lobby.claim_franchise("guest-a", "csk").expect("claim");
        lobby.start_auction(players, 0).expect("auction starts");
        run_auction(&mut lobby, None);

        assert_eq!(lobby.squads().len(), 10);
        assert!(
            lobby
                .squads()
                .iter()
                .all(|entry| entry.owner_guest_id.is_none())
        );
        assert!(
            lobby
                .squads()
                .iter()
                .all(|entry| entry.players.len() == SQUAD_SIZE)
        );
        assert!(
            lobby
                .squads()
                .iter()
                .all(|entry| entry.starting_xi.is_some())
        );

        let mut all_ids: Vec<&str> = lobby
            .squads()
            .iter()
            .flat_map(|entry| entry.players.iter().map(|p| p.id.as_str()))
            .collect();
        all_ids.sort_unstable();
        let before = all_ids.len();
        all_ids.dedup();
        assert_eq!(all_ids.len(), before, "no player is in two squads");

        lobby.start_league(&template).expect("league starts");
        assert_eq!(lobby.phase(), Phase::League);
    }

    #[test]
    fn an_owner_who_buys_fifteen_keeps_the_squad_and_sets_an_xi() {
        let (ids, players, template) = seed();
        let mut lobby = new_lobby(ids);
        lobby.claim_franchise("guest-a", "csk").expect("claim");
        lobby.start_auction(players, 0).expect("auction starts");
        run_auction(&mut lobby, Some("guest-a"));

        let owned = lobby
            .squads()
            .iter()
            .find(|entry| entry.owner_guest_id.as_deref() == Some("guest-a"))
            .expect("owner keeps a squad");
        assert_eq!(owned.franchise_id, "csk");
        assert_eq!(owned.players.len(), SQUAD_SIZE);

        let legal = strongest_legal_xi(&owned.players).expect("the bought squad has a legal XI");
        let captain = legal[0].clone();
        let vice = legal[1].clone();
        lobby
            .set_starting_xi("guest-a", legal, &captain, &vice)
            .expect("the legal XI is accepted");
        lobby.start_league(&template).expect("league starts");
    }

    #[test]
    fn an_illegal_xi_is_refused() {
        let (ids, players, _) = seed();
        let mut lobby = new_lobby(ids);
        lobby.claim_franchise("guest-a", "csk").expect("claim");
        lobby.start_auction(players, 0).expect("auction starts");
        run_auction(&mut lobby, Some("guest-a"));
        let result = lobby.set_starting_xi("guest-a", vec!["x".to_string()], "x", "x");
        assert!(matches!(
            result,
            Err(LobbyError::InvalidXi(SquadError::WrongXiSize { found: 1 }))
        ));
    }

    #[test]
    fn the_league_and_playoffs_play_to_a_champion() {
        let (ids, players, template) = seed();
        let mut lobby = new_lobby(ids);
        lobby.claim_franchise("guest-a", "csk").expect("claim");
        lobby.start_auction(players, 0).expect("auction starts");
        run_auction(&mut lobby, None);
        lobby.start_league(&template).expect("league starts");

        let config = ModifierConfig::default();
        for _ in 0..LEAGUE_ROUNDS {
            assert_eq!(lobby.advance(&config).expect("round plays").len(), 5);
        }
        assert_eq!(lobby.league().len(), 70);
        assert_eq!(lobby.phase(), Phase::Playoffs);

        for _ in 0..4 {
            lobby.advance(&config).expect("playoff match plays");
        }
        assert_eq!(lobby.phase(), Phase::Complete);
        let champion = lobby.champion().expect("champion crowned").to_string();
        assert!(
            lobby
                .table()
                .iter()
                .take(4)
                .any(|record| record.franchise_id == champion)
        );
    }

    #[test]
    fn the_league_cannot_start_while_an_xi_is_missing() {
        let (ids, players, template) = seed();
        let mut lobby = new_lobby(ids);
        lobby.claim_franchise("guest-a", "csk").expect("claim");
        lobby.start_auction(players, 0).expect("auction starts");
        run_auction(&mut lobby, Some("guest-a"));
        if lobby
            .squads()
            .iter()
            .any(|entry| entry.owner_guest_id.is_some() && entry.starting_xi.is_none())
        {
            assert!(matches!(
                lobby.start_league(&template),
                Err(LobbyError::XiMissing(_))
            ));
        }
    }

    #[test]
    fn a_disconnected_owner_is_passed_on_each_lot() {
        let (ids, players, _) = seed();
        let mut lobby = new_lobby(ids);
        lobby.claim_franchise("guest-a", "csk").expect("claim");
        lobby.claim_franchise("guest-b", "mi").expect("claim");
        lobby.set_connected("guest-b", false).expect("disconnect");
        lobby.start_auction(players, 0).expect("auction starts");

        // guest-b is passed on the first lot, so guest-a's bid is the only one left to resolve.
        let lot = lobby
            .auction()
            .and_then(Auction::current_lot)
            .expect("a lot is open")
            .clone();
        lobby
            .place_bid("guest-a", lot.player.base_price, 0)
            .expect("bid accepted");
        assert_eq!(lobby.phase(), Phase::Auction);
        let closed = lobby.tick(5_000).expect("tick works");
        assert!(
            matches!(closed.first(), Some(LotOutcome::Sold { guest_id, .. }) if guest_id == "guest-a")
        );
    }

    #[test]
    fn a_reconnected_owner_bids_again_on_the_next_lot() {
        let (ids, players, _) = seed();
        let mut lobby = new_lobby(ids);
        lobby.claim_franchise("guest-a", "csk").expect("claim");
        lobby.claim_franchise("guest-b", "mi").expect("claim");
        lobby.set_connected("guest-b", false).expect("disconnect");
        lobby.start_auction(players, 0).expect("auction starts");
        lobby.set_connected("guest-b", true).expect("reconnect");

        let lot = lobby
            .auction()
            .and_then(Auction::current_lot)
            .expect("a lot is open")
            .clone();
        lobby
            .place_bid("guest-a", lot.player.base_price, 0)
            .expect("bid accepted");
        // guest-b was passed on the first lot, so they bid on the next one.
        lobby.tick(5_000).expect("tick works");
        let next = lobby
            .auction()
            .and_then(Auction::current_lot)
            .expect("next lot open")
            .clone();
        assert_eq!(
            lobby.place_bid("guest-b", next.player.base_price, 5_000),
            Ok(())
        );
    }
}
