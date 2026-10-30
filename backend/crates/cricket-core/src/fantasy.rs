//! Fantasy points for one player in one match, and the captain and vice-captain multipliers
//! (docs/game-design.md sections 4 and 7).
//!
//! The weights are the phase 3 working formula from the grilling session. They are constants
//! here so one place can tune them. Points stay integers. Multipliers are kept in hundredths
//! so a boosted total still compares exactly.

use crate::performance::PlayerPerformance;

/// Points for each run scored off the bat.
pub const POINTS_PER_RUN: u32 = 1;
/// Extra points for each boundary, on top of its runs.
pub const POINTS_PER_BOUNDARY: u32 = 1;
/// Points for each wicket taken. Matches the Man of the Match tie-break `runs + 20 × wickets`.
pub const POINTS_PER_WICKET: u32 = 20;
/// Points for each catch.
pub const POINTS_PER_CATCH: u32 = 10;
/// Runs in one match that earn the fifty bonus.
pub const FIFTY_RUNS: u32 = 50;
/// The fifty bonus, earned once per match.
pub const FIFTY_BONUS: u32 = 10;
/// Wickets in one match that earn the haul bonus.
pub const THREE_WICKET_HAUL: u32 = 3;
/// The haul bonus, earned once per match.
pub const THREE_WICKET_BONUS: u32 = 10;
/// Captain multiplier in hundredths: 1.5×.
pub const CAPTAIN_HUNDREDTHS: u32 = 150;
/// Vice-captain multiplier in hundredths: 1.25×.
pub const VICE_CAPTAIN_HUNDREDTHS: u32 = 125;

/// A player's leadership in an owner's starting XI.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SquadRole {
    /// The captain.
    Captain,
    /// The vice-captain.
    ViceCaptain,
    /// Anyone else in the XI.
    Other,
}

/// The fantasy points a performance earns, before any multiplier.
///
/// @param performance - One player's line in one match.
/// @returns The points.
pub fn points(performance: &PlayerPerformance) -> u32 {
    let mut total = performance.runs * POINTS_PER_RUN
        + performance.boundaries * POINTS_PER_BOUNDARY
        + performance.wickets * POINTS_PER_WICKET
        + performance.catches * POINTS_PER_CATCH;
    if performance.runs >= FIFTY_RUNS {
        total += FIFTY_BONUS;
    }
    if performance.wickets >= THREE_WICKET_HAUL {
        total += THREE_WICKET_BONUS;
    }
    total
}

/// The multiplier a squad role gives, in hundredths.
///
/// @param role - The player's role in the owner's XI.
/// @returns 150 for the captain, 125 for the vice-captain and 100 for anyone else.
pub fn multiplier_hundredths(role: SquadRole) -> u32 {
    match role {
        SquadRole::Captain => CAPTAIN_HUNDREDTHS,
        SquadRole::ViceCaptain => VICE_CAPTAIN_HUNDREDTHS,
        SquadRole::Other => 100,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn line(runs: u32, boundaries: u32, wickets: u32, catches: u32) -> PlayerPerformance {
        PlayerPerformance {
            player_id: "p".to_string(),
            franchise_id: "f".to_string(),
            batting_position: 1,
            batted: runs > 0 || boundaries > 0,
            runs,
            balls_faced: runs,
            boundaries,
            wickets,
            catches,
            runs_conceded: 0,
            balls_bowled: 0,
        }
    }

    #[test]
    fn runs_boundaries_wickets_and_catches_score_their_weights() {
        assert_eq!(points(&line(10, 2, 0, 0)), 12);
        assert_eq!(points(&line(0, 0, 2, 1)), 40 + 10);
    }

    #[test]
    fn a_fifty_and_a_three_wicket_haul_each_add_a_bonus_once() {
        assert_eq!(points(&line(50, 0, 0, 0)), 50 + FIFTY_BONUS);
        assert_eq!(points(&line(0, 0, 3, 0)), 60 + THREE_WICKET_BONUS);
        assert_eq!(
            points(&line(100, 0, 4, 0)),
            100 + 80 + FIFTY_BONUS + THREE_WICKET_BONUS
        );
    }

    #[test]
    fn multipliers_are_in_hundredths() {
        assert_eq!(multiplier_hundredths(SquadRole::Captain), 150);
        assert_eq!(multiplier_hundredths(SquadRole::ViceCaptain), 125);
        assert_eq!(multiplier_hundredths(SquadRole::Other), 100);
    }
}
