//! Plays a whole season: the league from the lobby schedule, then the playoffs
//! (GLOSSARY.md, Season).

use crate::playoffs::{PlayoffError, PlayoffResult, run_playoffs};
use crate::schedule::Fixture;
use crate::simulator::{MatchKind, MatchOutcome, ModifierConfig, Side, simulate_match};
use crate::standings::{TeamRecord, league_table};

/// The complete result of a season.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SeasonResult {
    /// Every league match, in play order.
    pub league: Vec<MatchOutcome>,
    /// The final league table, best first.
    pub table: Vec<TeamRecord>,
    /// The playoff bracket and champion.
    pub playoffs: PlayoffResult,
}

/// Why a season cannot be played.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SeasonError {
    /// A fixture names a franchise with no side.
    UnknownFranchise(String),
    /// The playoffs could not be run.
    Playoffs(PlayoffError),
}

impl From<PlayoffError> for SeasonError {
    /// Wraps a playoff error.
    ///
    /// @param error - The playoff error.
    /// @returns The season error that carries it.
    fn from(error: PlayoffError) -> Self {
        SeasonError::Playoffs(error)
    }
}

/// Plays the league in schedule order, builds the table, then plays the playoffs.
///
/// Each league match is seeded from the lobby and its match identifier, so the season is
/// reproducible for a given schedule and seed data.
///
/// @param lobby_id - The lobby the season belongs to.
/// @param franchise_ids - Every franchise in the lobby.
/// @param schedule - The lobby's league schedule (see {@link crate::schedule::lobby_schedule}).
/// @param sides - The starting XI for each franchise.
/// @param config - The ball model parameters.
/// @returns The league matches, the final table and the playoffs.
/// @throws Returns a {@link SeasonError} if a fixture or playoff side is missing.
pub fn play_season(
    lobby_id: &str,
    franchise_ids: &[String],
    schedule: &[Fixture],
    sides: &[Side],
    config: &ModifierConfig,
) -> Result<SeasonResult, SeasonError> {
    let side_for = |franchise_id: &str| {
        sides
            .iter()
            .find(|side| side.franchise_id == franchise_id)
            .ok_or_else(|| SeasonError::UnknownFranchise(franchise_id.to_string()))
    };

    let mut league = Vec::with_capacity(schedule.len());
    for fixture in schedule {
        let home = side_for(&fixture.home_franchise_id)?;
        let away = side_for(&fixture.away_franchise_id)?;
        let match_id = format!(
            "r{:02}-{}-{}",
            fixture.round, fixture.home_franchise_id, fixture.away_franchise_id
        );
        league.push(simulate_match(
            lobby_id,
            &match_id,
            fixture.round,
            home,
            away,
            MatchKind::League,
            config,
        ));
    }

    let table = league_table(franchise_ids, &league);
    let playoffs = run_playoffs(lobby_id, &table, sides, config)?;
    Ok(SeasonResult {
        league,
        table,
        playoffs,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::Player;
    use crate::model::Role;
    use crate::schedule::lobby_schedule;
    use crate::seed_data::{parse_franchises, parse_players, parse_schedule};

    const PLAYERS: &str = include_str!("../../../../data/seeds/players.v1.json");
    const FRANCHISES: &str = include_str!("../../../../data/seeds/franchises.v1.json");
    const SCHEDULE: &str = include_str!("../../../../data/seeds/ipl-schedule.v1.json");

    /// Builds an 11-player XI for each franchise from the seed, in batting order.
    ///
    /// The XI is not checked against the squad rules here. The test only needs playable
    /// sides, and `squad` tests cover the rules.
    fn sides_from_seed() -> (Vec<String>, Vec<Side>) {
        let franchises = parse_franchises(FRANCHISES)
            .expect("franchises parse")
            .franchises;
        let players: Vec<Player> = parse_players(PLAYERS).expect("players parse").players;
        let ids: Vec<String> = franchises
            .iter()
            .map(|franchise| franchise.id.clone())
            .collect();
        let sides = ids
            .iter()
            .map(|id| {
                let mut xi: Vec<Player> = players
                    .iter()
                    .filter(|player| player.franchise_id.as_deref() == Some(id.as_str()))
                    .take(11)
                    .cloned()
                    .collect();
                // Make sure there is always a keeper and some bowling options.
                if xi.iter().all(|player| player.role != Role::WicketKeeper) {
                    xi[4].role = Role::WicketKeeper;
                }
                Side {
                    franchise_id: id.clone(),
                    xi,
                }
            })
            .collect();
        (ids, sides)
    }

    #[test]
    fn a_full_season_plays_seventy_league_matches_and_a_champion() {
        let (ids, sides) = sides_from_seed();
        let template = parse_schedule(SCHEDULE).expect("schedule parses").league;
        let schedule = lobby_schedule(&template, "lobby-season").expect("valid template");
        let season = play_season(
            "lobby-season",
            &ids,
            &schedule,
            &sides,
            &ModifierConfig::default(),
        )
        .expect("season plays");

        assert_eq!(season.league.len(), 70);
        assert_eq!(season.table.len(), 10);
        assert!(season.table.iter().all(|record| record.played == 14));
        assert_eq!(season.playoffs.matches.len(), 4);
        let top_four: Vec<&str> = season
            .table
            .iter()
            .take(4)
            .map(|record| record.franchise_id.as_str())
            .collect();
        assert!(top_four.contains(&season.playoffs.champion_id.as_str()));
    }

    #[test]
    fn the_same_season_plays_out_the_same_way() {
        let (ids, sides) = sides_from_seed();
        let template = parse_schedule(SCHEDULE).expect("schedule parses").league;
        let schedule = lobby_schedule(&template, "lobby-repeat").expect("valid template");
        let first = play_season(
            "lobby-repeat",
            &ids,
            &schedule,
            &sides,
            &ModifierConfig::default(),
        );
        let second = play_season(
            "lobby-repeat",
            &ids,
            &schedule,
            &sides,
            &ModifierConfig::default(),
        );
        assert_eq!(first, second);
    }
}
