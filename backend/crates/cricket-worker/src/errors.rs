//! Refusals as HTTP responses. Each one carries the frontend's error class name (for example
//! `BidBlockedError`) and, where the frontend names a reason, the reason in kebab-case, so
//! phase 4 can map a response to the same error the mock throws.

use cricket_core::auction::AuctionError;
use cricket_core::lobby::{LobbyError, SubstitutionError};
use cricket_core::squad::SquadError;

/// A refusal: an HTTP status, the error class name, and an optional reason.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ApiError {
    /// The HTTP status code.
    pub status: u16,
    /// The frontend error class name, such as `BidBlockedError`.
    pub name: &'static str,
    /// The reason, in the frontend's kebab-case vocabulary, when there is one.
    pub reason: Option<&'static str>,
}

impl ApiError {
    /// Creates a refusal with no reason.
    ///
    /// @param status - The HTTP status code.
    /// @param name - The error class name.
    /// @returns The refusal.
    pub fn new(status: u16, name: &'static str) -> Self {
        Self {
            status,
            name,
            reason: None,
        }
    }

    /// Creates a refusal with a reason.
    ///
    /// @param status - The HTTP status code.
    /// @param name - The error class name.
    /// @param reason - The reason, from the frontend's vocabulary.
    /// @returns The refusal.
    pub fn because(status: u16, name: &'static str, reason: &'static str) -> Self {
        Self {
            status,
            name,
            reason: Some(reason),
        }
    }

    /// The JSON body sent with the refusal: `{ "error": name, "reason": reason | null }`.
    ///
    /// @returns The body as JSON text.
    pub fn body(&self) -> String {
        serde_json::json!({ "error": self.name, "reason": self.reason }).to_string()
    }
}

/// Maps a lobby refusal that does not depend on which action was attempted. The service maps
/// the phase-dependent ones itself, because the same phase error means different things.
///
/// @param error - The lobby's refusal.
/// @returns The HTTP refusal.
pub fn from_lobby(error: LobbyError) -> ApiError {
    match error {
        LobbyError::NotAMember(_) | LobbyError::NotAnOwner(_) => {
            ApiError::new(403, "NotAnOwnerError")
        }
        LobbyError::UnknownFranchise(_) => ApiError::new(404, "FranchiseNotFoundError"),
        LobbyError::FranchiseTaken(_) => ApiError::new(409, "FranchiseTakenError"),
        LobbyError::LobbyFull => ApiError::new(409, "LobbyFullError"),
        LobbyError::NoOwners => ApiError::because(409, "AuctionStartBlockedError", "no-owners"),
        LobbyError::UnclaimedOwners(_) => {
            ApiError::because(409, "AuctionStartBlockedError", "unclaimed-franchise")
        }
        LobbyError::InvalidXi(error) => ApiError::because(409, "XiBlockedError", xi_reason(&error)),
        LobbyError::XiLocked => ApiError::new(409, "XiLockedError"),
        LobbyError::XiMissing(_) => {
            ApiError::because(409, "LeagueAdvanceBlockedError", "no-legal-starting-xi")
        }
        LobbyError::Substitution(error) => {
            ApiError::because(409, "SubstitutionBlockedError", substitution_reason(&error))
        }
        LobbyError::SimPaused => ApiError::because(409, "LeagueAdvanceBlockedError", "sim-paused"),
        LobbyError::Auction(error) => ApiError::because(409, "BidBlockedError", bid_reason(&error)),
        LobbyError::WrongPhase { .. } => ApiError::new(409, "WrongPhaseError"),
        LobbyError::Schedule(_) | LobbyError::SystemSquad(_) | LobbyError::Playoff(_) => {
            ApiError::new(500, "InternalError")
        }
    }
}

/// The starting-XI rule a squad error breaks, in the frontend's `XiBlock` vocabulary.
///
/// @param error - The squad rule that failed.
/// @returns The kebab-case reason.
pub fn xi_reason(error: &SquadError) -> &'static str {
    match error {
        SquadError::WrongXiSize { .. }
        | SquadError::WrongSquadSize { .. }
        | SquadError::OverPurse { .. } => "wrong-size",
        SquadError::DuplicatePlayer(_) => "duplicate",
        SquadError::NotInSquad(_) => "not-in-squad",
        SquadError::CaptainNotInXi => "captain-not-in-xi",
        SquadError::ViceCaptainNotInXi => "vice-captain-not-in-xi",
        SquadError::SameCaptainAndViceCaptain => "same-captain-and-vice-captain",
        SquadError::WicketKeeperCount { found } if *found == 0 => "no-wicket-keeper",
        SquadError::WicketKeeperCount { .. } => "too-many-wicket-keepers",
        SquadError::NotEnoughBowlingOptions { .. } => "too-few-bowling-options",
    }
}

/// The reason a substitution was refused, in the frontend's `SubstitutionBlock` vocabulary.
///
/// @param error - The refusal.
/// @returns The kebab-case reason.
pub fn substitution_reason(error: &SubstitutionError) -> &'static str {
    match error {
        SubstitutionError::NotYetPlayed => "not-yet-played",
        SubstitutionError::NotInProgress => "not-in-progress",
        SubstitutionError::AlreadyUsed => "already-used",
        SubstitutionError::NoStartingXi => "no-starting-xi",
        SubstitutionError::OutNotInXi => "out-not-in-xi",
        SubstitutionError::CaptainOrViceCaptain => "captain-or-vice-captain",
        SubstitutionError::InNotInSquad => "in-not-in-squad",
        SubstitutionError::InAlreadyInXi => "in-already-in-xi",
        SubstitutionError::Xi(error) => xi_reason(error),
    }
}

/// The reason a bid was refused, in the frontend's `BidBlock` vocabulary.
///
/// `NotBidding` is reported as `not-an-owner` here. The service changes it to `squad-full` when
/// the owner already holds fifteen players, because only the service knows the squad.
///
/// @param error - The refusal.
/// @returns The kebab-case reason.
pub fn bid_reason(error: &AuctionError) -> &'static str {
    match error {
        AuctionError::NoOpenLot => "no-open-lot",
        AuctionError::TimerExpired => "lot-closed",
        AuctionError::NotBidding => "not-an-owner",
        AuctionError::AlreadyPassed => "not-an-owner",
        AuctionError::AlreadyLeading => "already-high-bidder",
        AuctionError::WrongAmount { .. } => "not-next-step",
        AuctionError::Unaffordable { .. } => "over-purse",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_refusal_body_names_the_error_and_the_reason() {
        let body = ApiError::because(409, "BidBlockedError", "over-purse").body();
        let json: serde_json::Value = serde_json::from_str(&body).expect("valid JSON");
        assert_eq!(json["error"], "BidBlockedError");
        assert_eq!(json["reason"], "over-purse");
    }

    #[test]
    fn a_refusal_without_a_reason_sends_null() {
        let body = ApiError::new(409, "XiLockedError").body();
        let json: serde_json::Value = serde_json::from_str(&body).expect("valid JSON");
        assert!(json["reason"].is_null());
    }

    #[test]
    fn a_wrong_bid_amount_is_not_next_step() {
        assert_eq!(
            bid_reason(&AuctionError::WrongAmount { expected: 100 }),
            "not-next-step"
        );
    }

    #[test]
    fn a_missing_wicket_keeper_and_too_many_are_different_reasons() {
        assert_eq!(
            xi_reason(&SquadError::WicketKeeperCount { found: 0 }),
            "no-wicket-keeper"
        );
        assert_eq!(
            xi_reason(&SquadError::WicketKeeperCount { found: 2 }),
            "too-many-wicket-keepers"
        );
    }
}
