//! The per-lobby league schedule (docs/game-design.md section 5, Q16 decision).
//!
//! The IPL template in `data/seeds/ipl-schedule.v1.json` fixes which pairs meet in each
//! round. Each lobby shuffles the order of the rounds and the home and away sides, so every
//! lobby gets a different season while each franchise still plays once per round.

use std::collections::{BTreeMap, HashSet};

use serde::{Deserialize, Serialize};

use crate::seed::{GameRng, seed_from};

/// Rounds in the league phase (docs/game-design.md section 5).
pub const LEAGUE_ROUNDS: usize = 14;

/// One league fixture, as written in the seed template.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Fixture {
    /// The round the template places the fixture in.
    pub round: u32,
    /// The home franchise.
    pub home_franchise_id: String,
    /// The away franchise.
    pub away_franchise_id: String,
}

/// Why a template cannot be turned into a lobby schedule.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ScheduleError {
    /// The template does not have 14 league rounds.
    WrongRoundCount { found: usize },
    /// A franchise plays twice in one round, so the round cannot be shuffled safely.
    FranchisePlaysTwice { round: u32, franchise_id: String },
}

/// Builds a lobby's league schedule from the template.
///
/// Rounds are kept whole, so every franchise still plays once in each round. The rounds are
/// shuffled and renumbered 1 to 14. Each fixture's home and away sides are flipped with a
/// seeded coin toss. The seed comes from the lobby ID.
///
/// @param template - The league fixtures from the seed file.
/// @param lobby_id - The lobby the schedule belongs to.
/// @returns The fixtures in play order, with rounds 1 to 14.
/// @throws Returns a {@link ScheduleError} if the template is not 14 valid rounds.
pub fn lobby_schedule(template: &[Fixture], lobby_id: &str) -> Result<Vec<Fixture>, ScheduleError> {
    let mut rounds: BTreeMap<u32, Vec<Fixture>> = BTreeMap::new();
    for fixture in template {
        rounds
            .entry(fixture.round)
            .or_default()
            .push(fixture.clone());
    }
    if rounds.len() != LEAGUE_ROUNDS {
        return Err(ScheduleError::WrongRoundCount {
            found: rounds.len(),
        });
    }
    for (round, fixtures) in &rounds {
        let mut seen = HashSet::new();
        for fixture in fixtures {
            for franchise_id in [&fixture.home_franchise_id, &fixture.away_franchise_id] {
                if !seen.insert(franchise_id.as_str()) {
                    return Err(ScheduleError::FranchisePlaysTwice {
                        round: *round,
                        franchise_id: franchise_id.clone(),
                    });
                }
            }
        }
    }

    let mut groups: Vec<Vec<Fixture>> = rounds.into_values().collect();
    let mut rng = GameRng::from_seed(seed_from(&["schedule", lobby_id]));
    rng.shuffle(&mut groups);

    let mut schedule = Vec::with_capacity(template.len());
    for (index, group) in groups.into_iter().enumerate() {
        for mut fixture in group {
            if rng.below(2) == 0 {
                std::mem::swap(
                    &mut fixture.home_franchise_id,
                    &mut fixture.away_franchise_id,
                );
            }
            fixture.round = index as u32 + 1;
            schedule.push(fixture);
        }
    }
    Ok(schedule)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;

    const TEMPLATE: &str = include_str!("../../../../data/seeds/ipl-schedule.v1.json");

    #[derive(Deserialize)]
    struct Template {
        league: Vec<Fixture>,
    }

    fn template() -> Vec<Fixture> {
        serde_json::from_str::<Template>(TEMPLATE)
            .expect("template parses")
            .league
    }

    fn unordered_pairs(fixtures: &[Fixture]) -> BTreeMap<(String, String), usize> {
        let mut counts = BTreeMap::new();
        for fixture in fixtures {
            let mut pair = [
                fixture.home_franchise_id.clone(),
                fixture.away_franchise_id.clone(),
            ];
            pair.sort();
            *counts
                .entry((pair[0].clone(), pair[1].clone()))
                .or_insert(0) += 1;
        }
        counts
    }

    #[test]
    fn the_schedule_keeps_all_seventy_fixtures_and_pairs() {
        let fixtures = template();
        let schedule = lobby_schedule(&fixtures, "lobby-1").expect("valid template");
        assert_eq!(schedule.len(), 70);
        assert_eq!(unordered_pairs(&schedule), unordered_pairs(&fixtures));
    }

    #[test]
    fn every_franchise_plays_once_in_each_round() {
        let schedule = lobby_schedule(&template(), "lobby-1").expect("valid template");
        for round in 1..=14 {
            let mut seen = HashSet::new();
            for fixture in schedule.iter().filter(|fixture| fixture.round == round) {
                assert!(seen.insert(fixture.home_franchise_id.clone()));
                assert!(seen.insert(fixture.away_franchise_id.clone()));
            }
            assert_eq!(
                seen.len(),
                10,
                "round {round} should cover all ten franchises"
            );
        }
    }

    #[test]
    fn each_franchise_plays_fourteen_matches() {
        let schedule = lobby_schedule(&template(), "lobby-1").expect("valid template");
        let mut counts: BTreeMap<String, usize> = BTreeMap::new();
        for fixture in &schedule {
            *counts.entry(fixture.home_franchise_id.clone()).or_insert(0) += 1;
            *counts.entry(fixture.away_franchise_id.clone()).or_insert(0) += 1;
        }
        assert!(counts.values().all(|count| *count == 14));
        assert_eq!(counts.len(), 10);
    }

    #[test]
    fn the_same_lobby_gets_the_same_schedule() {
        let fixtures = template();
        assert_eq!(
            lobby_schedule(&fixtures, "lobby-1"),
            lobby_schedule(&fixtures, "lobby-1")
        );
    }

    #[test]
    fn a_different_lobby_gets_a_different_schedule() {
        let fixtures = template();
        assert_ne!(
            lobby_schedule(&fixtures, "lobby-1").expect("valid"),
            lobby_schedule(&fixtures, "lobby-2").expect("valid")
        );
    }

    #[test]
    fn a_template_without_fourteen_rounds_is_refused() {
        let fixtures: Vec<Fixture> = template()
            .into_iter()
            .filter(|fixture| fixture.round <= 13)
            .collect();
        assert_eq!(
            lobby_schedule(&fixtures, "lobby-1"),
            Err(ScheduleError::WrongRoundCount { found: 13 })
        );
    }
}
