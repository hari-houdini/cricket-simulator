//! The IPL playoff bracket (docs/game-design.md section 5). Rounds 15 to 18.

use serde::{Deserialize, Serialize};

use crate::match_simulator::{MatchKind, MatchOutcome, ModifierConfig, Side, simulate_match};
use crate::standings::FranchiseRecord;

/// Round of Qualifier 1.
pub const QUALIFIER_1_ROUND: u32 = 15;
/// Round of the Eliminator.
pub const ELIMINATOR_ROUND: u32 = 16;
/// Round of Qualifier 2.
pub const QUALIFIER_2_ROUND: u32 = 17;
/// Round of the Final.
pub const FINAL_ROUND: u32 = 18;
/// Playoff matches in the bracket.
pub const PLAYOFF_MATCHES: usize = 4;

/// Why the playoffs cannot be run.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PlayoffError {
    /// Fewer than four franchises are in the table.
    NotEnoughFranchises { found: usize },
    /// A playoff franchise has no starting XI in `sides`.
    MissingSide(String),
    /// Every playoff match has already been played.
    BracketComplete,
}

/// The playoff bracket, played one match at a time.
///
/// Matches are played in order: Qualifier 1, Eliminator, Qualifier 2, then the Final. The
/// seeds come from the league table when the bracket is created and do not change after.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlayoffBracket {
    /// The top four franchises, seeds 1 to 4.
    seeds: [String; 4],
    /// Matches played so far, in bracket order.
    matches: Vec<MatchOutcome>,
}

impl PlayoffBracket {
    /// Creates a bracket from the final league table.
    ///
    /// @param table - The league table, best first.
    /// @returns A bracket with no matches played.
    /// @throws Returns {@link PlayoffError::NotEnoughFranchises} if the table has fewer than four franchises.
    pub fn new(table: &[FranchiseRecord]) -> Result<Self, PlayoffError> {
        if table.len() < PLAYOFF_MATCHES {
            return Err(PlayoffError::NotEnoughFranchises { found: table.len() });
        }
        Ok(Self {
            seeds: [
                table[0].franchise_id.clone(),
                table[1].franchise_id.clone(),
                table[2].franchise_id.clone(),
                table[3].franchise_id.clone(),
            ],
            matches: Vec::with_capacity(PLAYOFF_MATCHES),
        })
    }

    /// The playoff matches played so far, in bracket order.
    ///
    /// @returns The completed matches.
    pub fn matches(&self) -> &[MatchOutcome] {
        &self.matches
    }

    /// The round of the next match, or `None` when the bracket is complete.
    ///
    /// @returns Round 15 to 18, or `None`.
    pub fn next_round(&self) -> Option<u32> {
        (self.matches.len() < PLAYOFF_MATCHES)
            .then(|| QUALIFIER_1_ROUND + self.matches.len() as u32)
    }

    /// The champion, once the Final is played.
    ///
    /// @returns The winning franchise, or `None` before the Final.
    pub fn champion(&self) -> Option<&str> {
        self.matches
            .get(PLAYOFF_MATCHES - 1)
            .and_then(|outcome| outcome.winner_id.as_deref())
    }

    /// Plays the next match in the bracket.
    ///
    /// @param lobby_id - The lobby, used to seed the match.
    /// @param sides - The starting XI for each franchise.
    /// @param config - The ball model parameters.
    /// @returns The completed match.
    /// @throws Returns a {@link PlayoffError} if the bracket is finished or a side is missing.
    pub fn play_next(
        &mut self,
        lobby_id: &str,
        sides: &[Side],
        config: &ModifierConfig,
    ) -> Result<&MatchOutcome, PlayoffError> {
        let round = self.next_round().ok_or(PlayoffError::BracketComplete)?;
        let (match_id, home_id, away_id) = match self.matches.len() {
            0 => (
                "r15-qualifier-1",
                self.seeds[0].clone(),
                self.seeds[1].clone(),
            ),
            1 => (
                "r16-eliminator",
                self.seeds[2].clone(),
                self.seeds[3].clone(),
            ),
            2 => (
                "r17-qualifier-2",
                self.loser(0)?.to_string(),
                self.winner(1)?.to_string(),
            ),
            _ => (
                "r18-final",
                self.winner(0)?.to_string(),
                self.winner(2)?.to_string(),
            ),
        };
        let home = find_side(sides, &home_id)?;
        let away = find_side(sides, &away_id)?;
        let outcome = simulate_match(
            lobby_id,
            match_id,
            round,
            home,
            away,
            MatchKind::Playoff,
            config,
        );
        self.matches.push(outcome);
        Ok(self
            .matches
            .last()
            .unwrap_or_else(|| unreachable!("a match was just pushed")))
    }

    /// The winner of a played match.
    ///
    /// @param index - Bracket position of the match.
    /// @returns The winning franchise.
    /// @throws Returns {@link PlayoffError::BracketComplete} if that match has not been played.
    fn winner(&self, index: usize) -> Result<&str, PlayoffError> {
        let outcome = self
            .matches
            .get(index)
            .ok_or(PlayoffError::BracketComplete)?;
        Ok(outcome.winner_id.as_deref().unwrap_or(&outcome.home_id))
    }

    /// The loser of a played match.
    ///
    /// @param index - Bracket position of the match.
    /// @returns The franchise that lost.
    /// @throws Returns {@link PlayoffError::BracketComplete} if that match has not been played.
    fn loser(&self, index: usize) -> Result<&str, PlayoffError> {
        let winner = self.winner(index)?;
        let outcome = &self.matches[index];
        Ok(if winner == outcome.home_id {
            &outcome.away_id
        } else {
            &outcome.home_id
        })
    }
}

/// Finds the side for a franchise.
///
/// @param sides - The lobby's sides.
/// @param franchise_id - The franchise to find.
/// @returns The side, or {@link PlayoffError::MissingSide} if it is not there.
fn find_side<'a>(sides: &'a [Side], franchise_id: &str) -> Result<&'a Side, PlayoffError> {
    sides
        .iter()
        .find(|side| side.franchise_id == franchise_id)
        .ok_or_else(|| PlayoffError::MissingSide(franchise_id.to_string()))
}

/// Plays all four playoff matches from the final league table.
///
/// @param lobby_id - The lobby, used to seed the matches.
/// @param table - The final league table, best first.
/// @param sides - The starting XI for each franchise.
/// @param config - The ball model parameters.
/// @returns The four matches in bracket order, and the champion.
/// @throws Returns a {@link PlayoffError} if the table is too short or a side is missing.
pub fn run_playoffs(
    lobby_id: &str,
    table: &[FranchiseRecord],
    sides: &[Side],
    config: &ModifierConfig,
) -> Result<PlayoffResult, PlayoffError> {
    let mut bracket = PlayoffBracket::new(table)?;
    while bracket.next_round().is_some() {
        bracket.play_next(lobby_id, sides, config)?;
    }
    let champion_id = bracket
        .champion()
        .ok_or(PlayoffError::BracketComplete)?
        .to_string();
    Ok(PlayoffResult {
        matches: bracket.matches,
        champion_id,
    })
}

/// The four playoff matches and the champion.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlayoffResult {
    /// Qualifier 1, Eliminator, Qualifier 2 and the Final, in that order.
    pub matches: Vec<MatchOutcome>,
    /// The winner of the Final.
    pub champion_id: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Category, Player, Role};

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

    fn table(ids: &[&str]) -> Vec<FranchiseRecord> {
        ids.iter().map(|id| FranchiseRecord::new(id)).collect()
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
    fn the_second_qualifier_pairs_the_qualifier_loser_with_the_eliminator_winner() {
        let ids = ["a", "b", "c", "d"];
        let sides: Vec<Side> = ids.iter().map(|id| side(id)).collect();
        let result = run_playoffs("lobby-q2", &table(&ids), &sides, &ModifierConfig::default())
            .expect("playoffs run");
        let q1 = &result.matches[0];
        let elim = &result.matches[1];
        let q2 = &result.matches[2];
        let q1_loser = if q1.winner_id == Some(q1.home_id.clone()) {
            &q1.away_id
        } else {
            &q1.home_id
        };
        assert_eq!(&q2.home_id, q1_loser);
        assert_eq!(q2.away_id, elim.winner_id.clone().unwrap_or_default());
    }

    #[test]
    fn the_playoffs_need_four_franchises() {
        let sides = vec![side("a")];
        assert_eq!(
            run_playoffs("lobby", &table(&["a"]), &sides, &ModifierConfig::default()),
            Err(PlayoffError::NotEnoughFranchises { found: 1 })
        );
    }

    #[test]
    fn the_bracket_refuses_to_play_past_the_final() {
        let ids = ["a", "b", "c", "d"];
        let sides: Vec<Side> = ids.iter().map(|id| side(id)).collect();
        let mut bracket = PlayoffBracket::new(&table(&ids)).expect("bracket");
        let config = ModifierConfig::default();
        for _ in 0..PLAYOFF_MATCHES {
            bracket
                .play_next("lobby-end", &sides, &config)
                .expect("match plays");
        }
        assert_eq!(bracket.next_round(), None);
        assert_eq!(
            bracket.play_next("lobby-end", &sides, &config).map(|_| ()),
            Err(PlayoffError::BracketComplete)
        );
    }
}
