//! The league table: points, then net run rate (GLOSSARY.md, Standings and Points).

use crate::match_simulator::{BALLS_PER_OVER, INNINGS_WICKETS, MatchOutcome, OVERS_PER_INNINGS};
use crate::models::InningsSummary;

/// Points for a win (GLOSSARY.md, Points).
pub const WIN_POINTS: u32 = 2;
/// Points for a tie.
pub const TIE_POINTS: u32 = 1;

/// One franchise's league record.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FranchiseRecord {
    /// The franchise.
    pub franchise_id: String,
    /// Matches played.
    pub played: u32,
    /// Matches won.
    pub won: u32,
    /// Matches lost.
    pub lost: u32,
    /// Matches tied.
    pub tied: u32,
    /// League points.
    pub points: u32,
    /// Runs scored while batting.
    pub runs_for: u32,
    /// Balls faced while batting. An all-out innings counts the full quota of balls.
    pub balls_faced: u32,
    /// Runs conceded while bowling.
    pub runs_against: u32,
    /// Balls bowled. An all-out innings counts the full quota of balls.
    pub balls_bowled: u32,
}

impl FranchiseRecord {
    /// Creates an empty record for a franchise.
    ///
    /// @param franchise_id - The franchise.
    /// @returns A record with no matches played.
    pub fn new(franchise_id: &str) -> Self {
        Self {
            franchise_id: franchise_id.to_string(),
            played: 0,
            won: 0,
            lost: 0,
            tied: 0,
            points: 0,
            runs_for: 0,
            balls_faced: 0,
            runs_against: 0,
            balls_bowled: 0,
        }
    }

    /// Net run rate: runs per over scored minus runs per over conceded (GLOSSARY.md, Net run rate).
    ///
    /// @returns The net run rate, or 0.0 when a side has not batted or bowled.
    pub fn net_run_rate(&self) -> f64 {
        if self.balls_faced == 0 || self.balls_bowled == 0 {
            return 0.0;
        }
        let per_over = f64::from(BALLS_PER_OVER);
        f64::from(self.runs_for) * per_over / f64::from(self.balls_faced)
            - f64::from(self.runs_against) * per_over / f64::from(self.balls_bowled)
    }
}

/// The balls an innings counts for net run rate. An all-out innings counts the full overs.
///
/// @param innings - The innings to measure.
/// @returns The balls to use for the run rate.
fn balls_for_run_rate(innings: &InningsSummary) -> u32 {
    if innings.total_wickets >= INNINGS_WICKETS {
        OVERS_PER_INNINGS * BALLS_PER_OVER
    } else {
        innings.legal_balls
    }
}

/// Builds the league table from the league matches.
///
/// The table is sorted by points, then net run rate, then franchise ID so the order is
/// always the same.
///
/// @param franchise_ids - Every franchise in the lobby, so franchises with no result still appear.
/// @param matches - The league matches. Playoff matches must not be included.
/// @returns The table, best first.
pub fn league_table(franchise_ids: &[String], matches: &[MatchOutcome]) -> Vec<FranchiseRecord> {
    let mut table: Vec<FranchiseRecord> = franchise_ids
        .iter()
        .map(|id| FranchiseRecord::new(id))
        .collect();

    for outcome in matches {
        for innings in &outcome.innings {
            let balls = balls_for_run_rate(innings);
            credit(&mut table, &innings.batting_franchise_id, |record| {
                record.runs_for += innings.total_runs;
                record.balls_faced += balls;
            });
            credit(&mut table, &innings.bowling_franchise_id, |record| {
                record.runs_against += innings.total_runs;
                record.balls_bowled += balls;
            });
        }

        let home = outcome.home_id.as_str();
        let away = outcome.away_id.as_str();
        for id in [home, away] {
            credit(&mut table, id, |record| record.played += 1);
        }
        match outcome.winner_id.as_deref() {
            Some(winner) => {
                let loser = if winner == home { away } else { home };
                credit(&mut table, winner, |record| {
                    record.won += 1;
                    record.points += WIN_POINTS;
                });
                credit(&mut table, loser, |record| record.lost += 1);
            }
            None => {
                for id in [home, away] {
                    credit(&mut table, id, |record| {
                        record.tied += 1;
                        record.points += TIE_POINTS;
                    });
                }
            }
        }
    }

    table.sort_by(|a, b| {
        b.points
            .cmp(&a.points)
            .then_with(|| b.net_run_rate().total_cmp(&a.net_run_rate()))
            .then_with(|| a.franchise_id.cmp(&b.franchise_id))
    });
    table
}

/// Applies `change` to the record for `franchise_id`, if it is in the table.
///
/// @param table - The table being built.
/// @param franchise_id - The franchise to update.
/// @param change - The update to apply.
fn credit(
    table: &mut [FranchiseRecord],
    franchise_id: &str,
    change: impl FnOnce(&mut FranchiseRecord),
) {
    if let Some(record) = table
        .iter_mut()
        .find(|record| record.franchise_id == franchise_id)
    {
        change(record);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Builds a finished league match with the given totals and winner, without simulating balls.
    fn result(
        home: &str,
        away: &str,
        home_runs: u32,
        away_runs: u32,
        winner: Option<&str>,
    ) -> MatchOutcome {
        let innings = |batting: &str, bowling: &str, runs: u32| InningsSummary {
            batting_franchise_id: batting.to_string(),
            bowling_franchise_id: bowling.to_string(),
            total_runs: runs,
            total_wickets: 5,
            legal_balls: 120,
        };
        MatchOutcome {
            id: format!("{home}-{away}"),
            round: 1,
            home_id: home.to_string(),
            away_id: away.to_string(),
            toss_winner_id: home.to_string(),
            batting_first_id: home.to_string(),
            innings: vec![
                innings(home, away, home_runs),
                innings(away, home, away_runs),
            ],
            winner_id: winner.map(str::to_string),
            fair_play: Vec::new(),
            performances: Vec::new(),
            fall_of_wickets: Vec::new(),
        }
    }

    fn ids(list: &[&str]) -> Vec<String> {
        list.iter().map(|id| id.to_string()).collect()
    }

    #[test]
    fn a_win_is_two_points_and_a_tie_is_one_each() {
        let franchises = ids(&["a", "b", "c"]);
        let matches = vec![
            result("a", "b", 150, 120, Some("a")),
            result("b", "c", 100, 100, None),
        ];
        let table = league_table(&franchises, &matches);
        let points = |id: &str| {
            table
                .iter()
                .find(|record| record.franchise_id == id)
                .map(|record| record.points)
        };
        assert_eq!(points("a"), Some(2));
        assert_eq!(points("b"), Some(1));
        assert_eq!(points("c"), Some(1));
    }

    #[test]
    fn the_table_is_sorted_by_points_then_net_run_rate() {
        let franchises = ids(&["a", "b", "c"]);
        // a and b both win once. a has the better margin so it leads on net run rate.
        let matches = vec![
            result("a", "c", 200, 80, Some("a")),
            result("b", "c", 150, 140, Some("b")),
        ];
        let table = league_table(&franchises, &matches);
        let order: Vec<&str> = table
            .iter()
            .map(|record| record.franchise_id.as_str())
            .collect();
        assert_eq!(order, vec!["a", "b", "c"]);
        assert!(table[0].net_run_rate() > table[1].net_run_rate());
    }

    #[test]
    fn franchises_with_no_result_still_appear() {
        let table = league_table(&ids(&["a", "b"]), &[]);
        assert_eq!(table.len(), 2);
        assert!(
            table
                .iter()
                .all(|record| record.played == 0 && record.net_run_rate() == 0.0)
        );
    }
}
