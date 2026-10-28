//! The live auction as a pure state machine (docs/game-design.md section 3).
//!
//! Time is an input. Every method takes `at_ms`, a millisecond timestamp supplied by the
//! caller, and the core never reads a clock. The Durable Object in phase 2 supplies the
//! real time, and tests supply fixed times.

use std::collections::VecDeque;

use serde::{Deserialize, Serialize};

use crate::model::{Lakhs, Player};
use crate::seed::{GameRng, seed_from};
use crate::squad::{PURSE_LAKHS, SQUAD_SIZE};

/// How long each lot stays open after the last bid, in milliseconds.
pub const BID_TIMER_MS: u64 = 5_000;

/// Returns the step by which a bid rises from `current` (docs/game-design.md section 3).
///
/// Below ₹1cr the step is ₹10L. From ₹1cr to ₹5cr inclusive it is ₹50L. Above ₹5cr it is ₹1cr.
///
/// @param current - The current bid in lakhs.
/// @returns The increment in lakhs.
pub fn bid_increment(current: Lakhs) -> Lakhs {
    if current < 100 {
        10
    } else if current <= 500 {
        50
    } else {
        100
    }
}

/// Returns the lowest legal next bid for a lot.
///
/// @param leader_amount - The current high bid, or `None` if nobody has bid yet.
/// @param base_price - The lot's base price, which is the first legal bid.
/// @returns The amount a bid must equal to be accepted, in lakhs.
pub fn next_bid(leader_amount: Option<Lakhs>, base_price: Lakhs) -> Lakhs {
    match leader_amount {
        None => base_price,
        Some(current) => current + bid_increment(current),
    }
}

/// Orders the player pool for the auction. The order is derived from the lobby, so every
/// guest sees the same sequence of lots.
///
/// @param players - The player pool, in any order.
/// @param lobby_id - The lobby the auction belongs to.
/// @returns The players in lot order.
pub fn lot_order(mut players: Vec<Player>, lobby_id: &str) -> Vec<Player> {
    players.sort_by(|a, b| a.id.cmp(&b.id));
    let mut rng = GameRng::from_seed(seed_from(&["auction", lobby_id]));
    rng.shuffle(&mut players);
    players
}

/// An owner's place in the lobby, before the auction starts.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OwnerSeat {
    /// The guest who owns the franchise.
    pub guest_id: String,
    /// The franchise they own.
    pub franchise_id: String,
}

/// Whether an owner is still in the lobby.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SeatStatus {
    /// In the lobby and able to continue.
    Active,
    /// Removed for being unable to reach a 15-player squad (GLOSSARY.md, Removed owner).
    Removed,
}

/// An owner's money and squad during the auction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OwnerState {
    /// The guest who owns the franchise.
    pub guest_id: String,
    /// The franchise they own.
    pub franchise_id: String,
    /// Money left in the purse, in lakhs.
    pub purse_remaining: Lakhs,
    /// Players bought so far.
    pub squad: Vec<Player>,
    /// Whether the owner is still in the lobby.
    pub status: SeatStatus,
}

impl OwnerState {
    /// Reports whether the owner can take part in the current lot.
    ///
    /// @returns `true` when the owner is active and their squad is not yet full.
    pub fn can_bid(&self) -> bool {
        self.status == SeatStatus::Active && self.squad.len() < SQUAD_SIZE
    }
}

/// The current high bid on a lot.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Bid {
    /// The guest who placed the bid.
    pub guest_id: String,
    /// The bid amount in lakhs.
    pub amount: Lakhs,
}

/// A player currently up for auction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Lot {
    /// The player being auctioned.
    pub player: Player,
    /// The high bid, or `None` if nobody has bid.
    pub leader: Option<Bid>,
    /// Owners who passed on this lot (GLOSSARY.md, Pass).
    pub passed: Vec<String>,
    /// When the lot closes unless a bid resets the timer, in milliseconds.
    pub deadline_ms: u64,
}

/// How a lot ended.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum LotOutcome {
    /// The player went to the highest bidder (GLOSSARY.md, Hammer).
    Sold {
        /// The buyer.
        guest_id: String,
        /// The player bought.
        player: Player,
        /// The price paid in lakhs.
        price: Lakhs,
        /// When the hammer fell. This is the true time, not the time the lot was read.
        hammer_at_ms: u64,
    },
    /// Nobody bid. The player moves to the unsold pool.
    Unsold {
        /// The player who received no bid.
        player: Player,
        /// When the lot closed.
        at_ms: u64,
    },
}

/// Why an auction action was refused.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AuctionError {
    /// No lot is open.
    NoOpenLot,
    /// The lot's timer has already run out. Close it with `tick` first.
    TimerExpired,
    /// The owner is unknown, removed, or has a full squad.
    NotBidding,
    /// The owner already passed on this lot.
    AlreadyPassed,
    /// The owner holds the high bid and cannot pass or bid against themselves.
    AlreadyLeading,
    /// The amount is not the next legal bid.
    WrongAmount {
        /// The amount the bid had to equal.
        expected: Lakhs,
    },
    /// The owner cannot afford the bid.
    Unaffordable {
        /// The purse the owner has left.
        purse: Lakhs,
    },
}

/// One accepted bid, kept in the order bids were placed (docs/game-design.md section 3).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BidLogEntry {
    /// One-based position in the bid log.
    pub sequence: u32,
    /// The player the bid was for.
    pub player_id: String,
    /// The player's name at the time of the bid.
    pub player_name: String,
    /// The bidding guest.
    pub guest_id: String,
    /// The bid amount in lakhs.
    pub amount: Lakhs,
    /// When the bid was placed, in milliseconds.
    pub at_ms: u64,
}

/// A live auction for one lobby.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Auction {
    owners: Vec<OwnerState>,
    pool: VecDeque<Player>,
    lot: Option<Lot>,
    outcomes: Vec<LotOutcome>,
    unsold: Vec<Player>,
    released: Vec<Player>,
    bid_log: Vec<BidLogEntry>,
}

impl Auction {
    /// Creates an auction with every owner at the full purse.
    ///
    /// @param seats - The owners in the lobby.
    /// @param lots - The player pool in lot order (see {@link lot_order}).
    /// @returns An auction that has not started. Call {@link Auction::start}.
    pub fn new(seats: &[OwnerSeat], lots: Vec<Player>) -> Self {
        Self::with_purse(seats, lots, PURSE_LAKHS)
    }

    /// Creates an auction where every owner starts with `purse`.
    ///
    /// @param seats - The owners in the lobby.
    /// @param lots - The player pool in lot order.
    /// @param purse - The starting purse in lakhs.
    /// @returns An auction that has not started.
    pub(crate) fn with_purse(seats: &[OwnerSeat], lots: Vec<Player>, purse: Lakhs) -> Self {
        Self {
            owners: seats
                .iter()
                .map(|seat| OwnerState {
                    guest_id: seat.guest_id.clone(),
                    franchise_id: seat.franchise_id.clone(),
                    purse_remaining: purse,
                    squad: Vec::new(),
                    status: SeatStatus::Active,
                })
                .collect(),
            pool: lots.into(),
            lot: None,
            outcomes: Vec::new(),
            unsold: Vec::new(),
            released: Vec::new(),
            bid_log: Vec::new(),
        }
    }

    /// Opens the first lot. Does nothing if a lot is already open.
    ///
    /// @param at_ms - The time the auction starts, in milliseconds.
    pub fn start(&mut self, at_ms: u64) {
        self.open_next_lot(at_ms);
    }

    /// Places a bid on the open lot and resets the timer.
    ///
    /// @param guest_id - The bidding owner.
    /// @param amount - The bid in lakhs. Must equal {@link next_bid}, since bids use increment buttons only.
    /// @param at_ms - The time of the bid, in milliseconds.
    /// @returns `Ok(())` when the bid is accepted.
    /// @throws Returns an {@link AuctionError} when the lot is closed, the timer has run out, or the bid is not legal.
    pub fn place_bid(
        &mut self,
        guest_id: &str,
        amount: Lakhs,
        at_ms: u64,
    ) -> Result<(), AuctionError> {
        let lot = self.lot.as_mut().ok_or(AuctionError::NoOpenLot)?;
        if at_ms >= lot.deadline_ms {
            return Err(AuctionError::TimerExpired);
        }
        let owner = self
            .owners
            .iter()
            .find(|owner| owner.guest_id == guest_id && owner.can_bid())
            .ok_or(AuctionError::NotBidding)?;
        if lot.passed.iter().any(|id| id == guest_id) {
            return Err(AuctionError::AlreadyPassed);
        }
        if lot
            .leader
            .as_ref()
            .is_some_and(|bid| bid.guest_id == guest_id)
        {
            return Err(AuctionError::AlreadyLeading);
        }
        let expected = next_bid(
            lot.leader.as_ref().map(|bid| bid.amount),
            lot.player.base_price,
        );
        if amount != expected {
            return Err(AuctionError::WrongAmount { expected });
        }
        if amount > owner.purse_remaining {
            return Err(AuctionError::Unaffordable {
                purse: owner.purse_remaining,
            });
        }
        self.bid_log.push(BidLogEntry {
            sequence: self.bid_log.len() as u32 + 1,
            player_id: lot.player.id.clone(),
            player_name: lot.player.name.clone(),
            guest_id: guest_id.to_string(),
            amount,
            at_ms,
        });
        lot.leader = Some(Bid {
            guest_id: guest_id.to_string(),
            amount,
        });
        lot.deadline_ms = at_ms + BID_TIMER_MS;
        Ok(())
    }

    /// Passes on the open lot. The owner can still bid on later lots.
    ///
    /// If no other owner is left to bid, the lot closes at once: the leader wins, or the
    /// lot goes unsold if nobody bid.
    ///
    /// @param guest_id - The passing owner.
    /// @param at_ms - The time of the pass, in milliseconds.
    /// @returns The lot outcome if the pass closed the lot, otherwise `None`.
    /// @throws Returns an {@link AuctionError} when the pass is not allowed.
    pub fn pass_lot(
        &mut self,
        guest_id: &str,
        at_ms: u64,
    ) -> Result<Option<LotOutcome>, AuctionError> {
        let lot = self.lot.as_ref().ok_or(AuctionError::NoOpenLot)?;
        if at_ms >= lot.deadline_ms {
            return Err(AuctionError::TimerExpired);
        }
        if !self
            .owners
            .iter()
            .any(|owner| owner.guest_id == guest_id && owner.can_bid())
        {
            return Err(AuctionError::NotBidding);
        }
        if lot
            .leader
            .as_ref()
            .is_some_and(|bid| bid.guest_id == guest_id)
        {
            return Err(AuctionError::AlreadyLeading);
        }
        if lot.passed.iter().any(|id| id == guest_id) {
            return Err(AuctionError::AlreadyPassed);
        }

        let lot = self.lot.as_mut().ok_or(AuctionError::NoOpenLot)?;
        lot.passed.push(guest_id.to_string());
        let leader_id = lot.leader.as_ref().map(|bid| bid.guest_id.clone());
        let someone_left = self.owners.iter().any(|owner| {
            owner.can_bid()
                && Some(&owner.guest_id) != leader_id.as_ref()
                && !lot.passed.iter().any(|id| id == &owner.guest_id)
        });

        if someone_left {
            return Ok(None);
        }
        let outcome = self.close_lot(at_ms);
        self.settle(at_ms);
        Ok(outcome)
    }

    /// Closes the open lot if its timer has run out. Call this when the clock advances.
    ///
    /// Only one lot closes per call. The next lot then opens at `at_ms`, the moment the
    /// clock was read, so an idle gap does not sell the whole pool at once
    /// (docs/game-design.md section 3).
    ///
    /// @param at_ms - The current time, in milliseconds.
    /// @returns The outcome of the lot that closed, or `None` if no lot's timer has run out.
    pub fn tick(&mut self, at_ms: u64) -> Option<LotOutcome> {
        let deadline = self.lot.as_ref()?.deadline_ms;
        if at_ms < deadline {
            return None;
        }
        let outcome = self.close_lot(deadline)?;
        self.settle(at_ms);
        Some(outcome)
    }

    /// Reports whether every lot has been auctioned or moved to the unsold pool.
    ///
    /// @returns `true` when no lot is open and the pool is empty.
    pub fn is_complete(&self) -> bool {
        self.lot.is_none() && self.pool.is_empty()
    }

    /// The owners, with their purse and squad so far.
    ///
    /// @returns The owner states in seat order.
    pub fn owners(&self) -> &[OwnerState] {
        &self.owners
    }

    /// The lot currently open, if any.
    ///
    /// @returns The open lot, or `None` between lots and after the auction ends.
    pub fn current_lot(&self) -> Option<&Lot> {
        self.lot.as_ref()
    }

    /// Every accepted bid, in the order they were placed.
    ///
    /// @returns The bid log.
    pub fn bid_log(&self) -> &[BidLogEntry] {
        &self.bid_log
    }

    /// Players not yet on a lot. Players on the open lot are not counted.
    ///
    /// @returns The number of players still waiting in the pool.
    pub fn remaining(&self) -> usize {
        self.pool.len()
    }

    /// Every closed lot, in order.
    ///
    /// @returns The outcomes of closed lots.
    pub fn outcomes(&self) -> &[LotOutcome] {
        &self.outcomes
    }

    /// Players nobody bid on. They are not auctioned again.
    ///
    /// @returns The unsold players.
    pub fn unsold(&self) -> &[Player] {
        &self.unsold
    }

    /// Players bought by removed owners. They are not re-auctioned and can be
    /// assigned to system squads.
    ///
    /// @returns The released players.
    pub fn released(&self) -> &[Player] {
        &self.released
    }

    /// Closes the open lot and records the outcome.
    ///
    /// @param hammer_at_ms - When the hammer fell, in milliseconds.
    /// @returns The outcome of the lot, or `None` if no lot was open.
    fn close_lot(&mut self, hammer_at_ms: u64) -> Option<LotOutcome> {
        let lot = self.lot.take()?;
        let outcome = match lot.leader {
            Some(bid) => {
                if let Some(owner) = self
                    .owners
                    .iter_mut()
                    .find(|owner| owner.guest_id == bid.guest_id)
                {
                    owner.purse_remaining -= bid.amount;
                    owner.squad.push(lot.player.clone());
                }
                LotOutcome::Sold {
                    guest_id: bid.guest_id,
                    player: lot.player,
                    price: bid.amount,
                    hammer_at_ms,
                }
            }
            None => {
                self.unsold.push(lot.player.clone());
                LotOutcome::Unsold {
                    player: lot.player,
                    at_ms: hammer_at_ms,
                }
            }
        };
        self.outcomes.push(outcome.clone());
        Some(outcome)
    }

    /// Removes owners who can no longer reach 15 players, then opens the next lot.
    ///
    /// An owner is removed when their squad is short and their purse is below the cheapest
    /// base price left in the pool (or the pool is empty). Their players are released.
    ///
    /// @param at_ms - The time the next lot opens, in milliseconds.
    fn settle(&mut self, at_ms: u64) {
        let cheapest = self.pool.iter().map(|player| player.base_price).min();
        for owner in self.owners.iter_mut() {
            let cannot_fill = owner.squad.len() < SQUAD_SIZE
                && cheapest.is_none_or(|price| owner.purse_remaining < price);
            if owner.status == SeatStatus::Active && cannot_fill {
                owner.status = SeatStatus::Removed;
                self.released.append(&mut owner.squad);
            }
        }
        self.open_next_lot(at_ms);
    }

    /// Opens the next lot, or moves the rest of the pool to unsold when nobody can bid.
    ///
    /// @param at_ms - The time the lot opens, in milliseconds.
    fn open_next_lot(&mut self, at_ms: u64) {
        if self.lot.is_some() {
            return;
        }
        if !self.owners.iter().any(OwnerState::can_bid) {
            self.unsold.extend(self.pool.drain(..));
            return;
        }
        if let Some(player) = self.pool.pop_front() {
            self.lot = Some(Lot {
                player,
                leader: None,
                passed: Vec::new(),
                deadline_ms: at_ms + BID_TIMER_MS,
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{Category, Role};

    fn player(id: &str, base_price: Lakhs) -> Player {
        Player {
            id: id.to_string(),
            name: id.to_string(),
            franchise_id: None,
            role: Role::Batter,
            category: Category::Capped,
            retired: false,
            batting: 50,
            bowling: 0,
            fielding: 50,
            base_price,
            trouble_rating: 0,
        }
    }

    fn seats(count: usize) -> Vec<OwnerSeat> {
        (0..count)
            .map(|index| OwnerSeat {
                guest_id: format!("guest-{index}"),
                franchise_id: format!("team-{index}"),
            })
            .collect()
    }

    fn owner<'a>(auction: &'a Auction, guest: &str) -> &'a OwnerState {
        auction
            .owners()
            .iter()
            .find(|owner| owner.guest_id == guest)
            .expect("owner exists")
    }

    #[test]
    fn increments_follow_the_three_bands() {
        assert_eq!(bid_increment(20), 10);
        assert_eq!(bid_increment(99), 10);
        assert_eq!(bid_increment(100), 50);
        assert_eq!(bid_increment(500), 50);
        assert_eq!(bid_increment(501), 100);
    }

    #[test]
    fn first_bid_is_the_base_price_then_steps_up() {
        let mut auction = Auction::new(&seats(2), vec![player("a", 200)]);
        auction.start(0);
        assert_eq!(
            auction.place_bid("guest-0", 250, 0),
            Err(AuctionError::WrongAmount { expected: 200 })
        );
        assert_eq!(auction.place_bid("guest-0", 200, 0), Ok(()));
        assert_eq!(
            auction.place_bid("guest-1", 200, 0),
            Err(AuctionError::WrongAmount { expected: 250 })
        );
        assert_eq!(auction.place_bid("guest-1", 250, 0), Ok(()));
    }

    #[test]
    fn a_bid_resets_the_timer() {
        let mut auction = Auction::new(&seats(2), vec![player("a", 100)]);
        auction.start(0);
        auction
            .place_bid("guest-0", 100, 4_000)
            .expect("bid accepted");
        assert_eq!(auction.tick(5_000), None);
        assert!(auction.tick(9_000).is_some());
    }

    #[test]
    fn the_highest_bidder_wins_when_the_timer_runs_out() {
        // A second lot keeps the buyer able to fill a squad after the sale.
        let mut auction = Auction::new(&seats(2), vec![player("a", 100), player("b", 100)]);
        auction.start(0);
        auction
            .place_bid("guest-0", 100, 1_000)
            .expect("bid accepted");
        let outcome = auction.tick(6_000).expect("lot closed");
        assert_eq!(
            outcome,
            LotOutcome::Sold {
                guest_id: "guest-0".to_string(),
                player: player("a", 100),
                price: 100,
                hammer_at_ms: 6_000,
            }
        );
        assert_eq!(
            owner(&auction, "guest-0").purse_remaining,
            PURSE_LAKHS - 100
        );
        assert_eq!(owner(&auction, "guest-0").squad.len(), 1);
    }

    #[test]
    fn a_lot_with_no_bid_goes_unsold() {
        let mut auction = Auction::new(&seats(2), vec![player("a", 100)]);
        auction.start(0);
        assert!(matches!(
            auction.tick(5_000),
            Some(LotOutcome::Unsold { .. })
        ));
        assert_eq!(auction.unsold(), &[player("a", 100)]);
    }

    #[test]
    fn an_idle_gap_opens_the_next_lot_at_the_read_time() {
        let mut auction = Auction::new(&seats(2), vec![player("a", 100), player("b", 100)]);
        auction.start(0);
        auction.tick(60_000);
        // One lot closes per tick. The next lot opens at the read time, not the old deadline.
        assert_eq!(auction.outcomes().len(), 1);
        assert_eq!(
            auction.current_lot().map(|lot| lot.deadline_ms),
            Some(65_000)
        );
    }

    #[test]
    fn passing_removes_the_owner_from_that_lot_only() {
        let mut auction = Auction::new(&seats(3), vec![player("a", 100), player("b", 100)]);
        auction.start(0);
        assert_eq!(auction.pass_lot("guest-1", 0), Ok(None));
        // Lot two is open again, and guest-1 can still bid on it.
        auction.tick(5_000);
        assert_eq!(auction.place_bid("guest-1", 100, 5_000), Ok(()));
    }

    #[test]
    fn the_leader_wins_at_once_when_everyone_else_has_passed() {
        let mut auction = Auction::new(&seats(2), vec![player("a", 100)]);
        auction.start(0);
        auction
            .place_bid("guest-0", 100, 1_000)
            .expect("bid accepted");
        let outcome = auction.pass_lot("guest-1", 2_000).expect("pass accepted");
        assert_eq!(
            outcome,
            Some(LotOutcome::Sold {
                guest_id: "guest-0".to_string(),
                player: player("a", 100),
                price: 100,
                hammer_at_ms: 2_000,
            })
        );
    }

    #[test]
    fn a_lot_passed_by_everyone_goes_unsold_at_once() {
        let mut auction = Auction::new(&seats(2), vec![player("a", 100)]);
        auction.start(0);
        assert_eq!(auction.pass_lot("guest-0", 100), Ok(None));
        let outcome = auction.pass_lot("guest-1", 200).expect("pass accepted");
        assert!(matches!(
            outcome,
            Some(LotOutcome::Unsold { at_ms: 200, .. })
        ));
    }

    #[test]
    fn the_leader_cannot_pass() {
        let mut auction = Auction::new(&seats(2), vec![player("a", 100)]);
        auction.start(0);
        auction.place_bid("guest-0", 100, 0).expect("bid accepted");
        assert_eq!(
            auction.pass_lot("guest-0", 1_000),
            Err(AuctionError::AlreadyLeading)
        );
    }

    #[test]
    fn a_bid_after_the_deadline_is_refused() {
        let mut auction = Auction::new(&seats(2), vec![player("a", 100)]);
        auction.start(0);
        assert_eq!(
            auction.place_bid("guest-0", 100, 5_000),
            Err(AuctionError::TimerExpired)
        );
    }

    #[test]
    fn a_bid_above_the_purse_is_refused() {
        let mut auction = Auction::with_purse(&seats(2), vec![player("a", 100)], 50);
        auction.start(0);
        assert_eq!(
            auction.place_bid("guest-0", 100, 0),
            Err(AuctionError::Unaffordable { purse: 50 })
        );
    }

    #[test]
    fn an_owner_who_cannot_reach_fifteen_is_removed_and_their_players_released() {
        // Purse is 150 and the cheapest remaining player costs 100, so after one buy the owner
        // can no longer reach 15 players.
        let pool = vec![player("a", 100), player("b", 100), player("c", 100)];
        let mut auction = Auction::with_purse(&seats(2), pool, 150);
        auction.start(0);
        auction.place_bid("guest-0", 100, 0).expect("bid accepted");
        auction.tick(5_000);
        assert_eq!(owner(&auction, "guest-0").status, SeatStatus::Removed);
        assert_eq!(auction.released(), &[player("a", 100)]);
        assert!(owner(&auction, "guest-0").squad.is_empty());
    }

    #[test]
    fn a_full_squad_stops_bidding_and_the_rest_of_the_pool_is_unsold() {
        let pool: Vec<Player> = (0..16)
            .map(|index| player(&format!("p{index}"), 30))
            .collect();
        let mut owners_state = Auction::new(&seats(1), pool);
        owners_state.owners[0].squad = (0..14)
            .map(|index| player(&format!("s{index}"), 30))
            .collect();
        owners_state.start(0);
        owners_state
            .place_bid("guest-0", 30, 0)
            .expect("bid accepted");
        owners_state.tick(5_000);
        assert!(owners_state.is_complete());
        assert_eq!(owners_state.unsold().len(), 15);
        assert_eq!(owner(&owners_state, "guest-0").squad.len(), 15);
    }

    #[test]
    fn lot_order_is_stable_for_a_lobby_and_differs_between_lobbies() {
        let pool: Vec<Player> = (0..30)
            .map(|index| player(&format!("p{index:02}"), 30))
            .collect();
        let first = lot_order(pool.clone(), "lobby-a");
        let again = lot_order(pool.clone(), "lobby-a");
        let other = lot_order(pool, "lobby-b");
        assert_eq!(first, again);
        assert_ne!(first, other);
    }
}
