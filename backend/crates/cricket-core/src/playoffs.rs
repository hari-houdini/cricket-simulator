//! The IPL playoff bracket (docs/game-design.md section 5). Rounds 15 to 18.

use crate::simulator::{MatchKind, MatchOutcome, ModifierConfig, Side, simulate_match};
use crate::standings::TeamRecord;

/// Round of Qualifier 1.
pub const QUALIFIER_1_ROUND: u32 = 15;
/// Round of the Eliminator.
pub const ELIMINATOR_ROUND: u32 = 16;
/// Round of Qualifier 2.
pub const QUALIFIER_2_ROUND: u32 = 17;
/// Round of the Final.
pub const FINAL_ROUND: u32 = 18;

/// The four playoff matches and the champion.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlayoffResult {
    /// Qualifier 1, Eliminator, Qualifier 2 and the Final, in that order.
    pub matches: Vec<MatchOutcome>,
    /// The winner of the Final.
    pub champion_id: String,
}

/// Why the playoffs cannot be run.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PlayoffError {
    /// Fewer than four franchises are in the table.
    NotEnoughTeams { found: usize },
    /// A playoff franchise has no starting XI in `sides`.
    MissingSide(String),
}

/// Finds the side for a franchise.
///
/// @param sides - The lobby's sides.
/// @param franchise_id - The franchise to find.
/// @returns The side, or a {@link PlayoffError} if it is missing.
fn side_for<'a>(sides: &'a [Side], franchise_id: &str) -> Result<&'a Side, PlayoffError> {
    sides
        .iter()
        .find(|side| side.franchise_id == franchise_id)
        .ok_or_else(|| PlayoffError::MissingSide(franchise_id.to_string()))
}

/// Plays the four playoff matches from the final league table.
///
/// Qualifier 1 is 1st against 2nd. The Eliminator is 3rd against 4th. Qualifier 2 is the
/// loser of Qualifier 1 against the Eliminator's winner. The Final is the winners of
/// Qualifier 1 and Qualifier 2. Level playoff matches are settled by super overs.
///
/// @param lobby_id - The lobby, used to seed the matches.
/// @param table - The final league table, best first.
/// @param sides - The starting XI for each franchise.
/// @param config - The ball model parameters.
/// @returns The playoff matches and the champion.
/// @throws Returns a {@link PlayoffError} if the table is too short or a side is missing.
pub fn run_playoffs(
    lobby_id: &str,
    table: &[TeamRecord],
    sides: &[Side],
    config: &ModifierConfig,
) -> Result<PlayoffResult, PlayoffError> {
    if table.len() < 4 {
        return Err(PlayoffError::NotEnoughTeams { found: table.len() });
    }
    let seeded = |position: usize| side_for(sides, &table[position].franchise_id);

    let (first, second, third, fourth) = (seeded(0)?, seeded(1)?, seeded(2)?, seeded(3)?);

    let qualifier_1 = play(
        lobby_id,
        "r15-qualifier-1",
        QUALIFIER_1_ROUND,
        first,
        second,
        config,
    );
    let eliminator = play(
        lobby_id,
        "r16-eliminator",
        ELIMINATOR_ROUND,
        third,
        fourth,
        config,
    );

    let qualifier_1_loser = side_for(sides, loser_of(&qualifier_1))?;
    let eliminator_winner = side_for(sides, winner_of(&eliminator))?;
    let qualifier_2 = play(
        lobby_id,
        "r17-qualifier-2",
        QUALIFIER_2_ROUND,
        qualifier_1_loser,
        eliminator_winner,
        config,
    );

    let qualifier_1_winner = side_for(sides, winner_of(&qualifier_1))?;
    let qualifier_2_winner = side_for(sides, winner_of(&qualifier_2))?;
    let final_match = play(
        lobby_id,
        "r18-final",
        FINAL_ROUND,
        qualifier_1_winner,
        qualifier_2_winner,
        config,
    );

    let champion_id = winner_of(&final_match).to_string();
    Ok(PlayoffResult {
        matches: vec![qualifier_1, eliminator, qualifier_2, final_match],
        champion_id,
    })
}

/// Simulates one playoff match.
///
/// @param lobby_id - The lobby, used to seed the match.
/// @param match_id - The playoff match identifier.
/// @param round - The playoff round.
/// @param home - The home side.
/// @param away - The away side.
/// @param config - The ball model parameters.
/// @returns The completed playoff match.
fn play(
    lobby_id: &str,
    match_id: &str,
    round: u32,
    home: &Side,
    away: &Side,
    config: &ModifierConfig,
) -> MatchOutcome {
    simulate_match(
        lobby_id,
        match_id,
        round,
        home,
        away,
        MatchKind::Playoff,
        config,
    )
}

/// Returns the winner of a playoff match. Playoff matches always have one.
///
/// @param outcome - The completed playoff match.
/// @returns The winning franchise ID.
fn winner_of(outcome: &MatchOutcome) -> &str {
    outcome.winner_id.as_deref().unwrap_or(&outcome.home_id)
}

/// Returns the loser of a playoff match.
///
/// @param outcome - The completed playoff match.
/// @returns The franchise that lost.
fn loser_of(outcome: &MatchOutcome) -> &str {
    if winner_of(outcome) == outcome.home_id {
        &outcome.away_id
    } else {
        &outcome.home_id
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{Category, Player, Role};

    fn player(id: &str, role: Role) -> Player {
        Player {
            id: id.to_string(),
            name: id.to_string(),
            franchise_id: None,
            role,
            category: Category::Capped,
            retired: false,
            batting: 60,
            bowling: 60,
            fielding: 60,
            base_price: 100,
            trouble_rating: 0,
        }
    }

    fn side(franchise: &str) -> Side {
        let roles = [
            Role::Batter,
            Role::Batter,
            Role::Batter,
            Role::AllRounder,
            Role::WicketKeeper,
            Role::AllRounder,
            Role::Bowler,
            Role::Bowler,
            Role::Bowler,
            Role::Bowler,
            Role::Batter,
        ];
        Side {
            franchise_id: franchise.to_string(),
            xi: roles
                .iter()
                .enumerate()
                .map(|(index, role)| player(&format!("{franchise}-{index}"), *role))
                .collect(),
        }
    }

    fn table(ids: &[&str]) -> Vec<TeamRecord> {
        ids.iter().map(|id| TeamRecord::new(id)).collect()
    }

    #[test]
    fn the_bracket_plays_four_matches_in_order_and_crowns_a_champion() {
        let ids = ["a", "b", "c", "d"];
        let sides: Vec<Side> = ids.iter().map(|id| side(id)).collect();
        let result = run_playoffs("lobby-po", &table(&ids), &sides, &ModifierConfig::default())
            .expect("playoffs run");

        let rounds: Vec<u32> = result.matches.iter().map(|outcome| outcome.round).collect();
        assert_eq!(rounds, vec![15, 16, 17, 18]);
        assert!(
            result
                .matches
                .iter()
                .all(|outcome| outcome.winner_id.is_some())
        );
        assert_eq!(
            Some(&result.champion_id),
            result.matches[3].winner_id.as_ref()
        );
    }

    #[test]
    fn qualifier_one_is_first_against_second_and_the_eliminator_is_third_against_fourth() {
        let ids = ["a", "b", "c", "d"];
        let sides: Vec<Side> = ids.iter().map(|id| side(id)).collect();
        let result = run_playoffs(
            "lobby-seed",
            &table(&ids),
            &sides,
            &ModifierConfig::default(),
        )
        .expect("playoffs run");
        let q1 = &result.matches[0];
        let elim = &result.matches[1];
        assert_eq!((q1.home_id.as_str(), q1.away_id.as_str()), ("a", "b"));
        assert_eq!((elim.home_id.as_str(), elim.away_id.as_str()), ("c", "d"));
    }

    #[test]
    fn the_playoffs_need_four_teams() {
        let sides = vec![side("a")];
        assert_eq!(
            run_playoffs("lobby", &table(&["a"]), &sides, &ModifierConfig::default()),
            Err(PlayoffError::NotEnoughTeams { found: 1 })
        );
    }
}
