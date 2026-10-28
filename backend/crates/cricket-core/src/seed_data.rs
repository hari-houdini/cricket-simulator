//! Parsers for the versioned seed files in `data/seeds/`.
//!
//! The core takes seed data as text and never reads files (ADR 0005). The Worker reads
//! `data/seeds/` and passes the contents here.

use serde::Deserialize;

use crate::model::{Franchise, Player};
use crate::schedule::Fixture;

/// The contents of `players.v1.json`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayersFile {
    /// Seed version, recorded on every lobby created from it.
    pub seed_version: String,
    /// The player pool.
    pub players: Vec<Player>,
}

/// The contents of `franchises.v1.json`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FranchisesFile {
    /// Seed version, recorded on every lobby created from it.
    pub seed_version: String,
    /// The 10 franchises.
    pub franchises: Vec<Franchise>,
}

/// The league part of `ipl-schedule.v1.json`. The playoff slots are not read here because
/// the playoff format is fixed in `playoffs`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleFile {
    /// Seed version, recorded on every lobby created from it.
    pub seed_version: String,
    /// The 70 league fixtures, in template order.
    pub league: Vec<Fixture>,
}

/// Parses `players.v1.json`.
///
/// @param json - The file contents.
/// @returns The parsed player pool.
/// @throws Returns a `serde_json::Error` if the JSON does not match the seed shape.
pub fn parse_players(json: &str) -> Result<PlayersFile, serde_json::Error> {
    serde_json::from_str(json)
}

/// Parses `franchises.v1.json`.
///
/// @param json - The file contents.
/// @returns The parsed franchises.
/// @throws Returns a `serde_json::Error` if the JSON does not match the seed shape.
pub fn parse_franchises(json: &str) -> Result<FranchisesFile, serde_json::Error> {
    serde_json::from_str(json)
}

/// Parses `ipl-schedule.v1.json`.
///
/// @param json - The file contents.
/// @returns The parsed league template.
/// @throws Returns a `serde_json::Error` if the JSON does not match the seed shape.
pub fn parse_schedule(json: &str) -> Result<ScheduleFile, serde_json::Error> {
    serde_json::from_str(json)
}

#[cfg(test)]
mod tests {
    use super::*;

    const PLAYERS: &str = include_str!("../../../../data/seeds/players.v1.json");
    const FRANCHISES: &str = include_str!("../../../../data/seeds/franchises.v1.json");
    const SCHEDULE: &str = include_str!("../../../../data/seeds/ipl-schedule.v1.json");

    #[test]
    fn the_players_seed_parses_with_three_hundred_players() {
        let file = parse_players(PLAYERS).expect("players seed parses");
        assert_eq!(file.players.len(), 300);
        assert!(!file.seed_version.is_empty());
    }

    #[test]
    fn the_franchises_seed_parses_with_ten_franchises() {
        let file = parse_franchises(FRANCHISES).expect("franchises seed parses");
        assert_eq!(file.franchises.len(), 10);
    }

    #[test]
    fn the_schedule_seed_parses_with_seventy_league_fixtures() {
        let file = parse_schedule(SCHEDULE).expect("schedule seed parses");
        assert_eq!(file.league.len(), 70);
    }
}
