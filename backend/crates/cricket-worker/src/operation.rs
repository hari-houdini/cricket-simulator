//! One validated action on one lobby. The entry Worker parses an HTTP request into an
//! `Operation` and forwards it to the lobby's Durable Object as JSON, so the object only ever
//! sees input that has already passed the route checks.

use serde::{Deserialize, Serialize};

/// An action on a lobby, or the creation of one.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum Operation {
    /// Creates the lobby with the creator as its first guest.
    CreateLobby {
        /// The lobby's name.
        name: String,
        /// The creator's guest ID.
        guest_id: String,
        /// The creator's name.
        display_name: String,
    },
    /// Reads the lobby.
    GetLobby,
    /// Adds a guest to the lobby.
    Join {
        /// The guest.
        guest_id: String,
        /// The guest's name.
        display_name: String,
    },
    /// Claims a franchise for a guest.
    ClaimFranchise {
        /// The guest.
        guest_id: String,
        /// The franchise.
        franchise_id: String,
    },
    /// Starts the auction.
    StartAuction {
        /// The guest starting it.
        guest_id: String,
    },
    /// Reads the auction.
    GetAuction,
    /// Places a bid on the open lot.
    PlaceBid {
        /// The bidder.
        guest_id: String,
        /// The bid in lakhs.
        amount_lakhs: u32,
    },
    /// Reads one owner's squad.
    GetSquad {
        /// The owner.
        guest_id: String,
    },
    /// Reads every owner's lineup. Public once the auction has ended.
    GetLineups,
    /// Saves an owner's starting XI.
    SetStartingXi {
        /// The owner.
        guest_id: String,
        /// The 11 player IDs in batting order.
        player_ids: Vec<String>,
        /// The captain.
        captain_id: String,
        /// The vice-captain.
        vice_captain_id: String,
    },
    /// Makes an owner's free substitution.
    Substitute {
        /// The owner.
        guest_id: String,
        /// The XI player leaving.
        out_player_id: String,
        /// The squad player coming in.
        in_player_id: String,
    },
    /// Opens an owner's free substitution, which pauses the sim for every guest.
    BeginSubstitution {
        /// The owner.
        guest_id: String,
    },
    /// Cancels an owner's open substitution, which resumes the sim without using it up.
    CancelSubstitution {
        /// The owner.
        guest_id: String,
    },
    /// Records or withdraws an owner's vote to skip the rest of the league.
    SetSkipVote {
        /// The owner.
        guest_id: String,
        /// `true` to vote for the skip.
        vote: bool,
    },
    /// Reads the league.
    GetLeague,
    /// Reads the league table, best first.
    GetStandings,
    /// Reads one played league match.
    GetMatch {
        /// The match ID, such as `r03-csk-mi`.
        match_id: String,
    },
    /// Plays the next league match, the rest of the league once the skip vote has passed, or the
    /// next playoff match.
    AdvanceRound {
        /// The owner playing it.
        guest_id: String,
    },
    /// Reads the playoff bracket.
    GetPlayoffs,
    /// Reads the awards.
    GetAwards,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_operation_round_trips_through_json_with_a_type_tag() {
        let operation = Operation::PlaceBid {
            guest_id: "g1".to_string(),
            amount_lakhs: 20,
        };
        let json = serde_json::to_string(&operation).expect("serialises");
        assert!(json.contains("\"type\":\"placeBid\""));
        assert!(json.contains("\"amountLakhs\":20"));
        let back: Operation = serde_json::from_str(&json).expect("parses");
        assert_eq!(back, operation);
    }
}
