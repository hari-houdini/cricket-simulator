//! Season awards in phase 1: Orange Cap, Purple Cap and Fair Play (docs/game-design.md section 8).
//!
//! Man of the Match, Most Valuable Player and Emerging Player wait for the fantasy-points
//! formula and the uncapped definition (phase 3).

use std::cmp::Ordering;
use std::collections::BTreeMap;

use crate::model::WicketKind;
use crate::simulator::MatchOutcome;
use crate::standings::TeamRecord;

/// One player's season figures, built from every ball they faced or bowled.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlayerTotals {
    /// The player.
    pub player_id: String,
    /// The franchise they played for.
    pub franchise_id: String,
    /// Runs scored off the bat.
    pub runs: u32,
    /// Balls faced.
    pub balls_faced: u32,
    /// Wickets taken. Run-outs are not credited to the bowler.
    pub wickets: u32,
    /// Runs conceded while bowling.
    pub runs_conceded: u32,
    /// Balls bowled.
    pub balls_bowled: u32,
}

/// A franchise's season fair-play standing (GLOSSARY.md, Season fair-play standing).
///
/// The standing is the average of its match ratings. Each match rating is an integer in
/// tenths, so the average is kept as a sum and a count and compared without floats.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FairPlayStanding {
    /// The franchise.
    pub franchise_id: String,
    /// Sum of the franchise's match ratings, in tenths.
    pub rating_sum: u64,
    /// Matches the franchise has played.
    pub matches: u32,
}

/// Adds up every player's figures across the matches.
///
/// @param matches - The matches to count. Pass the whole season, league and playoffs.
/// @returns One entry per player who faced or bowled a ball, ordered by player ID.
pub fn player_totals(matches: &[MatchOutcome]) -> Vec<PlayerTotals> {
    let mut totals: BTreeMap<String, PlayerTotals> = BTreeMap::new();
    for outcome in matches {
        for innings in &outcome.innings {
            for ball in &innings.balls {
                let batter = entry(&mut totals, &ball.batter_id, &innings.batting_franchise_id);
                batter.runs += ball.runs;
                batter.balls_faced += 1;

                let bowler = entry(&mut totals, &ball.bowler_id, &innings.bowling_franchise_id);
                bowler.runs_conceded += ball.runs;
                bowler.balls_bowled += 1;
                if matches!(ball.wicket, Some(kind) if kind != WicketKind::RunOut) {
                    bowler.wickets += 1;
                }
            }
        }
    }
    totals.into_values().collect()
}

/// Finds or creates a player's totals entry.
///
/// @param totals - The totals being built.
/// @param player_id - The player.
/// @param franchise_id - The franchise to record if the entry is new.
/// @returns The mutable entry for the player.
fn entry<'a>(
    totals: &'a mut BTreeMap<String, PlayerTotals>,
    player_id: &str,
    franchise_id: &str,
) -> &'a mut PlayerTotals {
    totals
        .entry(player_id.to_string())
        .or_insert_with(|| PlayerTotals {
            player_id: player_id.to_string(),
            franchise_id: franchise_id.to_string(),
            runs: 0,
            balls_faced: 0,
            wickets: 0,
            runs_conceded: 0,
            balls_bowled: 0,
        })
}

/// Ranks batters for the Orange Cap: most runs first.
///
/// Ties go to the player with the lower ID, so the ranking is always the same. The first
/// entry is the winner and the second is the runner-up.
///
/// @param totals - Season totals from {@link player_totals}.
/// @returns Batters who faced at least one ball, best first.
pub fn orange_cap_ranking(totals: &[PlayerTotals]) -> Vec<&PlayerTotals> {
    let mut ranked: Vec<&PlayerTotals> = totals
        .iter()
        .filter(|player| player.balls_faced > 0)
        .collect();
    ranked.sort_by(|a, b| {
        b.runs
            .cmp(&a.runs)
            .then_with(|| a.player_id.cmp(&b.player_id))
    });
    ranked
}

/// Ranks bowlers for the Purple Cap: most wickets first, then fewer runs conceded.
///
/// Ties after that go to the lower player ID.
///
/// @param totals - Season totals from {@link player_totals}.
/// @returns Bowlers who bowled at least one ball, best first.
pub fn purple_cap_ranking(totals: &[PlayerTotals]) -> Vec<&PlayerTotals> {
    let mut ranked: Vec<&PlayerTotals> = totals
        .iter()
        .filter(|player| player.balls_bowled > 0)
        .collect();
    ranked.sort_by(|a, b| {
        b.wickets
            .cmp(&a.wickets)
            .then_with(|| a.runs_conceded.cmp(&b.runs_conceded))
            .then_with(|| a.player_id.cmp(&b.player_id))
    });
    ranked
}

/// Builds each franchise's season fair-play standing from the match fair-play scores.
///
/// A match rating is the floor of the average starting-XI score, in tenths. The table order
/// is kept, so franchises tied on rating keep their league order.
///
/// @param table - The league table, best first. Its order is the tie-break.
/// @param matches - The matches to count.
/// @returns One standing per franchise in table order.
pub fn fair_play_standings(
    table: &[TeamRecord],
    matches: &[MatchOutcome],
) -> Vec<FairPlayStanding> {
    let mut standings: Vec<FairPlayStanding> = table
        .iter()
        .map(|record| FairPlayStanding {
            franchise_id: record.franchise_id.clone(),
            rating_sum: 0,
            matches: 0,
        })
        .collect();

    for outcome in matches {
        for standing in standings.iter_mut() {
            let scores: Vec<u32> = outcome
                .fair_play
                .iter()
                .filter(|score| score.franchise_id == standing.franchise_id)
                .map(|score| score.score_tenths)
                .collect();
            if scores.is_empty() {
                continue;
            }
            let rating = scores.iter().sum::<u32>() / scores.len() as u32;
            standing.rating_sum += u64::from(rating);
            standing.matches += 1;
        }
    }
    standings.sort_by(compare_standings);
    standings
}

/// Orders standings by average match rating, best first. A franchise with no matches ranks last.
///
/// Averages are compared by cross-multiplying sums and counts, so no floats are needed.
///
/// @param a - The first standing.
/// @param b - The second standing.
/// @returns The ordering for a stable sort.
fn compare_standings(a: &FairPlayStanding, b: &FairPlayStanding) -> Ordering {
    match (a.matches, b.matches) {
        (0, 0) => Ordering::Equal,
        (0, _) => Ordering::Greater,
        (_, 0) => Ordering::Less,
        _ => (b.rating_sum * u64::from(a.matches)).cmp(&(a.rating_sum * u64::from(b.matches))),
    }
}

/// Finds the Fair Play award winner: the franchise with the best season standing.
///
/// @param standings - Standings from {@link fair_play_standings}, best first.
/// @returns The winning franchise ID, or `None` if no franchise has a rated match.
pub fn fair_play_winner(standings: &[FairPlayStanding]) -> Option<&str> {
    standings
        .first()
        .filter(|standing| standing.matches > 0)
        .map(|standing| standing.franchise_id.as_str())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{Ball, Innings};
    use crate::simulator::PlayerFairPlay;

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

    fn outcome(innings: Vec<Innings>, fair_play: Vec<PlayerFairPlay>) -> MatchOutcome {
        MatchOutcome {
            id: "m".to_string(),
            round: 1,
            home_id: "a".to_string(),
            away_id: "b".to_string(),
            toss_winner_id: "a".to_string(),
            batting_first_id: "a".to_string(),
            innings,
            winner_id: None,
            fair_play,
        }
    }

    fn score(player: &str, franchise: &str, tenths: u32) -> PlayerFairPlay {
        PlayerFairPlay {
            player_id: player.to_string(),
            franchise_id: franchise.to_string(),
            score_tenths: tenths,
        }
    }

    #[test]
    fn run_outs_are_not_credited_to_the_bowler() {
        let matches = vec![outcome(
            vec![innings(
                "a",
                "b",
                vec![
                    ball("bat", "bowl", 0, Some(WicketKind::Caught)),
                    ball("bat2", "bowl", 0, Some(WicketKind::RunOut)),
                ],
            )],
            Vec::new(),
        )];
        let totals = player_totals(&matches);
        let bowler = totals
            .iter()
            .find(|player| player.player_id == "bowl")
            .expect("bowler counted");
        assert_eq!(bowler.wickets, 1);
        assert_eq!(bowler.balls_bowled, 2);
    }

    #[test]
    fn orange_cap_goes_to_the_most_runs_and_ties_go_to_the_lower_id() {
        let matches = vec![outcome(
            vec![innings(
                "a",
                "b",
                vec![
                    ball("zed", "bowl", 4, None),
                    ball("amy", "bowl", 4, None),
                    ball("kim", "bowl", 6, None),
                ],
            )],
            Vec::new(),
        )];
        let totals = player_totals(&matches);
        let ranking = orange_cap_ranking(&totals);
        let order: Vec<&str> = ranking
            .iter()
            .map(|player| player.player_id.as_str())
            .collect();
        // kim has 6. amy and zed both have 4, so amy comes first on the ID tie-break.
        assert_eq!(order, vec!["kim", "amy", "zed"]);
    }

    #[test]
    fn purple_cap_breaks_wicket_ties_on_fewer_runs_conceded() {
        let matches = vec![outcome(
            vec![
                innings(
                    "a",
                    "b",
                    vec![ball("x", "generous", 6, None), ball("x", "tight", 0, None)],
                ),
                innings(
                    "b",
                    "a",
                    vec![
                        ball("y", "generous", 0, Some(WicketKind::Bowled)),
                        ball("y", "tight", 0, Some(WicketKind::Bowled)),
                    ],
                ),
            ],
            Vec::new(),
        )];
        let totals = player_totals(&matches);
        let ranking = purple_cap_ranking(&totals);
        assert_eq!(ranking[0].player_id, "tight");
        assert_eq!(ranking[1].player_id, "generous");
    }

    #[test]
    fn fair_play_averages_match_ratings_and_ranks_the_cleaner_franchise_first() {
        let table = vec![TeamRecord::new("a"), TeamRecord::new("b")];
        let matches = vec![outcome(
            Vec::new(),
            vec![
                score("p1", "a", 100),
                score("p2", "a", 90),
                score("p3", "b", 60),
            ],
        )];
        let standings = fair_play_standings(&table, &matches);
        assert_eq!(standings[0].franchise_id, "a");
        assert_eq!(fair_play_winner(&standings), Some("a"));
    }

    #[test]
    fn fair_play_ties_keep_league_table_order() {
        let table = vec![TeamRecord::new("top"), TeamRecord::new("second")];
        let matches = vec![outcome(
            Vec::new(),
            vec![score("p1", "top", 80), score("p2", "second", 80)],
        )];
        let standings = fair_play_standings(&table, &matches);
        assert_eq!(standings[0].franchise_id, "top");
    }

    #[test]
    fn a_franchise_with_no_rated_match_cannot_win_fair_play() {
        let table = vec![TeamRecord::new("a")];
        let standings = fair_play_standings(&table, &[]);
        assert_eq!(fair_play_winner(&standings), None);
    }
}
