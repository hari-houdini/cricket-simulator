//! Per-player match lines, built from the balls of a finished match (GLOSSARY.md, Match).
//!
//! The simulator records who batted and bowled each ball but not who took a catch. A catch is
//! drawn here from the bowling side's XI on its own seeded stream, so the ball outcomes of a
//! match do not change when catches are added.

use serde::{Deserialize, Serialize};

use crate::match_simulator::Side;
use crate::models::{Innings, WicketKind};
use crate::seed::{GameRng, seed_from};

/// One starting-XI player's line in one match, the input to fantasy points and awards.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerPerformance {
    /// The player.
    pub player_id: String,
    /// The franchise the player represented in this match.
    pub franchise_id: String,
    /// One-based batting position in the XI.
    pub batting_position: u32,
    /// Whether the player faced a ball.
    pub batted: bool,
    /// Runs scored off the bat.
    pub runs: u32,
    /// Balls faced.
    pub balls_faced: u32,
    /// Fours and sixes hit.
    pub boundaries: u32,
    /// Wickets taken. Run-outs are not credited to the bowler.
    pub wickets: u32,
    /// Catches taken.
    pub catches: u32,
    /// Runs conceded while bowling.
    pub runs_conceded: u32,
    /// Balls bowled.
    pub balls_bowled: u32,
}

/// One wicket in a match, in the order it fell within its innings.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FallOfWicket {
    /// One-based innings number within the match, counting super overs.
    pub innings: u32,
    /// The wicket number within the innings, starting at 1.
    pub wicket_number: u32,
    /// The franchise that lost the wicket.
    pub batting_franchise_id: String,
}

/// Draws the catcher for every wicket, in the order the wickets fell across all innings.
///
/// A wicket has a catcher only when it is a catch and the bowling side has a fielder to take it.
/// The draws use their own seeded stream, so the same match always gives the same catchers and
/// a replay can name them (see {@link crate::match_log}).
///
/// @param lobby_id - The lobby the match belongs to. Part of the catch seed.
/// @param match_id - The match identifier. Part of the catch seed.
/// @param sides - The two sides.
/// @param innings - Every innings played, including super overs.
/// @returns One entry per wicket: the catcher's player ID, or `None` if there was no catch.
pub fn catchers(
    lobby_id: &str,
    match_id: &str,
    sides: [&Side; 2],
    innings: &[Innings],
) -> Vec<Option<String>> {
    let mut rng = GameRng::from_seed(seed_from(&["catch", lobby_id, match_id]));
    let mut catchers = Vec::new();
    for plan in innings {
        let fielders = sides
            .iter()
            .find(|side| side.franchise_id == plan.bowling_franchise_id)
            .map(|side| side.xi.as_slice())
            .unwrap_or_default();
        for ball in &plan.balls {
            if let Some(kind) = ball.wicket {
                let catcher = (kind == WicketKind::Caught && !fielders.is_empty()).then(|| {
                    fielders[rng.below(fielders.len() as u32) as usize]
                        .id
                        .clone()
                });
                catchers.push(catcher);
            }
        }
    }
    catchers
}

/// Builds every starting-XI player's line and the fall of wickets for a match.
///
/// @param lobby_id - The lobby the match belongs to. Part of the catch seed.
/// @param match_id - The match identifier. Part of the catch seed.
/// @param sides - The two sides.
/// @param innings - Every innings played, including super overs.
/// @returns One line per XI player, in side order, and the fall of wickets.
pub fn tally(
    lobby_id: &str,
    match_id: &str,
    sides: [&Side; 2],
    innings: &[Innings],
) -> (Vec<PlayerPerformance>, Vec<FallOfWicket>) {
    let mut catchers = catchers(lobby_id, match_id, sides, innings).into_iter();
    let mut rows: Vec<PlayerPerformance> = sides
        .iter()
        .flat_map(|side| {
            side.xi
                .iter()
                .enumerate()
                .map(|(index, player)| PlayerPerformance {
                    player_id: player.id.clone(),
                    franchise_id: side.franchise_id.clone(),
                    batting_position: index as u32 + 1,
                    batted: false,
                    runs: 0,
                    balls_faced: 0,
                    boundaries: 0,
                    wickets: 0,
                    catches: 0,
                    runs_conceded: 0,
                    balls_bowled: 0,
                })
        })
        .collect();
    let mut fall_of_wickets = Vec::new();

    for (index, plan) in innings.iter().enumerate() {
        let mut wicket_number = 0;
        for ball in &plan.balls {
            let batter = find_row(&mut rows, &ball.batter_id);
            batter.batted = true;
            batter.runs += ball.runs;
            batter.balls_faced += 1;
            if matches!(ball.runs, 4 | 6) {
                batter.boundaries += 1;
            }

            let bowler = find_row(&mut rows, &ball.bowler_id);
            bowler.runs_conceded += ball.runs;
            bowler.balls_bowled += 1;

            if let Some(kind) = ball.wicket {
                wicket_number += 1;
                fall_of_wickets.push(FallOfWicket {
                    innings: index as u32 + 1,
                    wicket_number,
                    batting_franchise_id: plan.batting_franchise_id.clone(),
                });
                if kind != WicketKind::RunOut {
                    find_row(&mut rows, &ball.bowler_id).wickets += 1;
                }
                // `catchers` holds one entry per wicket, in the same order, so each wicket
                // takes the next one.
                if let Some(Some(catcher_id)) = catchers.next() {
                    find_row(&mut rows, &catcher_id).catches += 1;
                }
            }
        }
    }
    (rows, fall_of_wickets)
}

/// Finds a player's line. Every player who bats or bowls is in the XI, so the row exists.
///
/// @param rows - The lines for the match.
/// @param player_id - The player.
/// @returns The player's mutable line.
/// @throws Panics if the player is not in either XI, which the lobby prevents by validating the XI.
fn find_row<'a>(rows: &'a mut [PlayerPerformance], player_id: &str) -> &'a mut PlayerPerformance {
    rows.iter_mut()
        .find(|row| row.player_id == player_id)
        .expect("every ball is bowled and faced by a player in the XI")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Ball, Category, Player, Role};

    fn player(id: &str, role: Role) -> Player {
        Player {
            id: id.to_string(),
            name: id.to_string(),
            franchise_id: None,
            role,
            category: Category::Capped,
            retired: false,
            batting: 50,
            bowling: 50,
            fielding: 50,
            base_price: 100,
            trouble_rating: 0,
        }
    }

    fn side(franchise: &str, prefix: &str) -> Side {
        Side {
            franchise_id: franchise.to_string(),
            xi: (0..11)
                .map(|index| {
                    let role = match index {
                        0 => Role::WicketKeeper,
                        1..=4 => Role::Bowler,
                        _ => Role::Batter,
                    };
                    player(&format!("{prefix}{index}"), role)
                })
                .collect(),
        }
    }

    fn ball(batter: &str, bowler: &str, runs: u32, wicket: Option<WicketKind>) -> Ball {
        Ball {
            over: 0,
            ball: 1,
            bowler_id: bowler.to_string(),
            batter_id: batter.to_string(),
            runs,
            wicket,
        }
    }

    fn innings(batting: &str, bowling: &str, balls: Vec<Ball>) -> Innings {
        let total_runs = balls.iter().map(|ball| ball.runs).sum();
        let total_wickets = balls.iter().filter(|ball| ball.wicket.is_some()).count() as u32;
        let legal_balls = balls.len() as u32;
        Innings {
            batting_franchise_id: batting.to_string(),
            bowling_franchise_id: bowling.to_string(),
            balls,
            total_runs,
            total_wickets,
            legal_balls,
        }
    }

    #[test]
    fn a_line_records_runs_boundaries_wickets_and_runs_conceded() {
        let home = side("h", "h");
        let away = side("a", "a");
        let plan = vec![innings(
            "h",
            "a",
            vec![
                ball("h0", "a1", 4, None),
                ball("h0", "a1", 6, None),
                ball("h1", "a2", 0, Some(WicketKind::Bowled)),
                ball("h2", "a1", 0, Some(WicketKind::RunOut)),
            ],
        )];
        let (rows, fallen) = tally("lobby", "match", [&home, &away], &plan);

        let batter = rows.iter().find(|row| row.player_id == "h0").expect("row");
        assert_eq!(
            (batter.runs, batter.boundaries, batter.balls_faced),
            (10, 2, 2)
        );
        assert!(batter.batted);
        assert_eq!(batter.batting_position, 1);

        let bowler = rows.iter().find(|row| row.player_id == "a1").expect("row");
        assert_eq!((bowler.wickets, bowler.runs_conceded), (0, 10));
        assert_eq!(bowler.balls_bowled, 3, "the run-out ball is bowled too");

        let other = rows.iter().find(|row| row.player_id == "a2").expect("row");
        assert_eq!(other.wickets, 1);

        assert_eq!(fallen.len(), 2);
        assert_eq!(fallen[1].wicket_number, 2);
        assert_eq!(fallen[0].batting_franchise_id, "h");
    }

    #[test]
    fn a_caught_dismissal_gives_a_catch_to_a_fielder_on_the_bowling_side() {
        let home = side("h", "h");
        let away = side("a", "a");
        let plan = vec![innings(
            "h",
            "a",
            vec![ball("h0", "a1", 0, Some(WicketKind::Caught))],
        )];
        let (rows, _) = tally("lobby", "match", [&home, &away], &plan);
        let catches: u32 = rows.iter().map(|row| row.catches).sum();
        assert_eq!(catches, 1);
        assert!(
            rows.iter()
                .filter(|row| row.catches > 0)
                .all(|row| row.franchise_id == "a")
        );
    }

    #[test]
    fn the_same_match_draws_the_same_catches() {
        let home = side("h", "h");
        let away = side("a", "a");
        let plan = vec![innings(
            "h",
            "a",
            vec![
                ball("h0", "a1", 0, Some(WicketKind::Caught)),
                ball("h1", "a2", 0, Some(WicketKind::Caught)),
            ],
        )];
        assert_eq!(
            tally("lobby", "match", [&home, &away], &plan),
            tally("lobby", "match", [&home, &away], &plan)
        );
    }
}
