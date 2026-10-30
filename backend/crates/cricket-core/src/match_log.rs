//! The key moments of a playoff match, replayed from its seed (GLOSSARY.md, Match log; ADR 0007).
//!
//! A finished match keeps only its summary (ADR 0006). Its deliveries are regenerated from the
//! same seed, with the starting XIs the match was played with, so the log is the same every time
//! it is read. Nothing here changes a result: the replay's outcome is checked against the stored
//! one in the tests.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use crate::match_simulator::{
    MatchKind, MatchOutcome, ModifierConfig, OVERS_PER_INNINGS, PlayedMatch, SUPER_OVER_BATTERS,
    Side, play_match,
};
use crate::models::{Innings, WicketKind};
use crate::performance::catchers;

/// A batting milestone a batter or a pair brings up.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Milestone {
    /// Thirty runs.
    Thirty,
    /// Fifty runs.
    Fifty,
    /// One hundred runs.
    Hundred,
}

impl Milestone {
    /// Every milestone, lowest first.
    const ALL: [Milestone; 3] = [Milestone::Thirty, Milestone::Fifty, Milestone::Hundred];

    /// The runs that bring the milestone up.
    ///
    /// @returns 30, 50 or 100.
    pub fn runs(self) -> u32 {
        match self {
            Milestone::Thirty => 30,
            Milestone::Fifty => 50,
            Milestone::Hundred => 100,
        }
    }
}

/// One key moment, in the order it happened. Over and ball are one-based, as a scorecard shows
/// them, so the 4th ball of the 5th over is `over: 5, ball: 4`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum MatchEvent {
    /// The toss. The toss winner bats first in this model.
    Toss {
        /// The franchise that won the toss.
        winner_franchise_id: String,
    },
    /// An innings begins.
    InningsStart {
        /// One-based innings number within the match, counting super overs.
        innings: u32,
        /// Whether this is a super-over innings.
        super_over: bool,
        /// The franchise batting.
        batting_franchise_id: String,
        /// The franchise bowling.
        bowling_franchise_id: String,
        /// The two batters who open, in batting order.
        openers: [String; 2],
        /// The bowler who bowls the first over.
        opening_bowler_id: String,
    },
    /// A batter brings up a thirty, fifty or hundred.
    Milestone {
        /// The innings.
        innings: u32,
        /// The over.
        over: u32,
        /// The ball within the over.
        ball: u32,
        /// The batter.
        batter_id: String,
        /// The milestone.
        milestone: Milestone,
    },
    /// Two batters bring up a fifty or hundred partnership. Thirties are not reported for pairs.
    Partnership {
        /// The innings.
        innings: u32,
        /// The over.
        over: u32,
        /// The ball within the over.
        ball: u32,
        /// The two batters at the crease.
        batter_ids: [String; 2],
        /// Fifty or hundred.
        milestone: Milestone,
    },
    /// A batter is dismissed.
    Wicket {
        /// The innings.
        innings: u32,
        /// The over.
        over: u32,
        /// The ball within the over.
        ball: u32,
        /// The batter dismissed.
        batter_id: String,
        /// The bowler. Run-outs are recorded against the bowler's ball but not credited to them.
        bowler_id: String,
        /// How the batter was dismissed.
        kind: WicketKind,
        /// The catcher, set only for a catch.
        fielder_id: Option<String>,
        /// The batting side's runs after the ball.
        runs: u32,
        /// The batting side's wickets after the ball.
        wickets: u32,
    },
    /// A bowler takes his fourth wicket in an innings. Run-outs do not count.
    FourWickets {
        /// The innings.
        innings: u32,
        /// The over.
        over: u32,
        /// The ball within the over.
        ball: u32,
        /// The bowler.
        bowler_id: String,
    },
    /// The first ball of the last over of a regular innings, with the score so far.
    FinalOver {
        /// The innings.
        innings: u32,
        /// The batting side's runs before the over.
        runs: u32,
        /// The batting side's wickets before the over.
        wickets: u32,
        /// The runs needed to win, in a chase.
        target: Option<u32>,
    },
    /// An innings ends.
    InningsEnd {
        /// The innings.
        innings: u32,
        /// The franchise that batted.
        batting_franchise_id: String,
        /// The total runs.
        runs: u32,
        /// The wickets lost.
        wickets: u32,
        /// Legal deliveries bowled. 120 is a full 20 overs.
        legal_balls: u32,
    },
    /// The result of the match.
    Result {
        /// The winner, which is always set in the playoffs.
        winner_franchise_id: Option<String>,
    },
}

/// A played match with the key moments replayed from its seed.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MatchReplay {
    /// The match, as the stored outcome has it.
    pub outcome: MatchOutcome,
    /// The key moments, in order, from the toss to the result.
    pub events: Vec<MatchEvent>,
}

/// Replays a match from its seed and lists its key moments.
///
/// @param lobby_id - The lobby the match belongs to. Part of the seed.
/// @param match_id - The match identifier. Part of the seed.
/// @param round - The round the match is played in.
/// @param home - The home side, with the XI it played.
/// @param away - The away side, with the XI it played.
/// @param kind - League or playoff.
/// @param config - The ball model parameters the match was played with.
/// @returns The match and its key moments.
pub fn replay_match(
    lobby_id: &str,
    match_id: &str,
    round: u32,
    home: &Side,
    away: &Side,
    kind: MatchKind,
    config: &ModifierConfig,
) -> MatchReplay {
    let PlayedMatch { outcome, innings } =
        play_match(lobby_id, match_id, round, home, away, kind, config);
    let mut draws = catchers(lobby_id, match_id, [home, away], &innings).into_iter();
    let mut events = vec![MatchEvent::Toss {
        winner_franchise_id: outcome.toss_winner_id.clone(),
    }];

    // Innings come in pairs: the two regular innings, then one pair per super over.
    for (pair_index, pair) in innings.chunks(2).enumerate() {
        for (side_index, plan) in pair.iter().enumerate() {
            let Some(batting) = [home, away]
                .into_iter()
                .find(|side| side.franchise_id == plan.batting_franchise_id)
            else {
                continue;
            };
            let target = match (side_index, pair.first()) {
                (1, Some(first)) => Some(first.total_runs + 1),
                _ => None,
            };
            let innings_number = (pair_index * 2 + side_index + 1) as u32;
            innings_events(
                innings_number,
                pair_index >= 1,
                plan,
                batting,
                target,
                &mut draws,
                &mut events,
            );
        }
    }
    events.push(MatchEvent::Result {
        winner_franchise_id: outcome.winner_id.clone(),
    });
    MatchReplay { outcome, events }
}

/// Lists the key moments of one innings, from its start to its end.
///
/// @param number - The innings number within the match.
/// @param super_over - Whether the innings is a super over.
/// @param plan - The innings with its deliveries.
/// @param batting - The side batting, for its batting order.
/// @param target - The runs to chase, or `None` for the first innings of a pair.
/// @param catchers - The catcher for each wicket in the match, consumed in order.
/// @param events - The log, extended in place.
fn innings_events(
    number: u32,
    super_over: bool,
    plan: &Innings,
    batting: &Side,
    target: Option<u32>,
    catchers: &mut impl Iterator<Item = Option<String>>,
    events: &mut Vec<MatchEvent>,
) {
    let order = if super_over {
        SUPER_OVER_BATTERS.min(batting.xi.len())
    } else {
        batting.xi.len()
    };
    let batters: Vec<&str> = batting.xi[..order]
        .iter()
        .map(|player| player.id.as_str())
        .collect();
    let (Some(first_ball), [first_batter, second_batter, ..]) =
        (plan.balls.first(), batters.as_slice())
    else {
        return;
    };

    events.push(MatchEvent::InningsStart {
        innings: number,
        super_over,
        batting_franchise_id: plan.batting_franchise_id.clone(),
        bowling_franchise_id: plan.bowling_franchise_id.clone(),
        openers: [first_batter.to_string(), second_batter.to_string()],
        opening_bowler_id: first_ball.bowler_id.clone(),
    });

    // The two batters at the crease. A dismissed batter is replaced in the same slot by the next
    // one in the batting order, as the simulator does.
    let mut at_crease = [first_batter.to_string(), second_batter.to_string()];
    let mut next_in = 2;
    let mut partnership = 0;
    let mut runs = 0;
    let mut wickets = 0;
    let mut batter_runs: BTreeMap<&str, u32> = BTreeMap::new();
    let mut bowler_wickets: BTreeMap<&str, u32> = BTreeMap::new();

    for ball in &plan.balls {
        let over = ball.over + 1;
        if !super_over && over == OVERS_PER_INNINGS && ball.ball == 1 {
            events.push(MatchEvent::FinalOver {
                innings: number,
                runs,
                wickets,
                target,
            });
        }

        let batter = ball.batter_id.as_str();
        let before = batter_runs.get(batter).copied().unwrap_or(0);
        let after = before + ball.runs;
        batter_runs.insert(batter, after);
        for milestone in Milestone::ALL {
            if crosses(before, after, milestone.runs()) {
                events.push(MatchEvent::Milestone {
                    innings: number,
                    over,
                    ball: ball.ball,
                    batter_id: batter.to_string(),
                    milestone,
                });
            }
        }

        let partnership_before = partnership;
        partnership += ball.runs;
        for milestone in [Milestone::Fifty, Milestone::Hundred] {
            if crosses(partnership_before, partnership, milestone.runs()) {
                events.push(MatchEvent::Partnership {
                    innings: number,
                    over,
                    ball: ball.ball,
                    batter_ids: at_crease.clone(),
                    milestone,
                });
            }
        }
        runs += ball.runs;

        if let Some(kind) = ball.wicket {
            wickets += 1;
            events.push(MatchEvent::Wicket {
                innings: number,
                over,
                ball: ball.ball,
                batter_id: batter.to_string(),
                bowler_id: ball.bowler_id.clone(),
                kind,
                fielder_id: catchers.next().flatten(),
                runs,
                wickets,
            });
            if kind != WicketKind::RunOut {
                let taken = bowler_wickets.entry(ball.bowler_id.as_str()).or_insert(0);
                *taken += 1;
                if *taken == 4 {
                    events.push(MatchEvent::FourWickets {
                        innings: number,
                        over,
                        ball: ball.ball,
                        bowler_id: ball.bowler_id.clone(),
                    });
                }
            }
            partnership = 0;
            if let Some(next) = batters.get(next_in) {
                if let Some(slot) = at_crease.iter_mut().find(|id| id.as_str() == batter) {
                    *slot = next.to_string();
                }
                next_in += 1;
            }
        }
    }

    events.push(MatchEvent::InningsEnd {
        innings: number,
        batting_franchise_id: plan.batting_franchise_id.clone(),
        runs,
        wickets,
        legal_balls: plan.legal_balls,
    });
}

/// Reports whether a total has moved from below a mark to reaching or passing it.
///
/// @param before - The total before the ball.
/// @param after - The total after the ball.
/// @param mark - The mark, such as 50.
/// @returns `true` on the ball the mark is reached.
fn crosses(before: u32, after: u32, mark: u32) -> bool {
    before < mark && after >= mark
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Category, Player, Role};

    fn player(id: &str, role: Role, rating: u8) -> Player {
        Player {
            id: id.to_string(),
            name: id.to_string(),
            franchise_id: None,
            role,
            category: Category::Capped,
            retired: false,
            batting: rating,
            bowling: rating,
            fielding: rating,
            base_price: 100,
            trouble_rating: 0,
        }
    }

    /// An 11-player XI in batting order, with four bowling options and one keeper. Player IDs
    /// start with the franchise, so a test can tell whose batter an event names.
    fn side(franchise: &str, rating: u8) -> Side {
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
                .map(|(index, role)| player(&format!("{franchise}-{}", index + 1), *role, rating))
                .collect(),
        }
    }

    /// Replays a playoff match between two equal sides.
    ///
    /// @param match_id - The match identifier.
    /// @returns The replay.
    fn replay(match_id: &str) -> MatchReplay {
        replay_match(
            "lobby-log",
            match_id,
            15,
            &side("home", 60),
            &side("away", 60),
            MatchKind::Playoff,
            &ModifierConfig::default(),
        )
    }

    #[test]
    fn the_log_opens_with_the_toss_and_closes_with_the_result() {
        let replay = replay("po-1");
        assert_eq!(
            replay.events.first(),
            Some(&MatchEvent::Toss {
                winner_franchise_id: replay.outcome.toss_winner_id.clone(),
            })
        );
        assert_eq!(
            replay.events.last(),
            Some(&MatchEvent::Result {
                winner_franchise_id: replay.outcome.winner_id.clone(),
            })
        );
    }

    #[test]
    fn each_innings_ends_with_the_totals_the_outcome_keeps() {
        let replay = replay("po-2");
        let ends: Vec<(u32, u32)> = replay
            .events
            .iter()
            .filter_map(|event| match event {
                MatchEvent::InningsEnd { runs, wickets, .. } => Some((*runs, *wickets)),
                _ => None,
            })
            .collect();
        let totals: Vec<(u32, u32)> = replay
            .outcome
            .innings
            .iter()
            .map(|innings| (innings.total_runs, innings.total_wickets))
            .collect();
        assert_eq!(ends, totals);
    }

    #[test]
    fn replaying_a_match_gives_the_same_log() {
        assert_eq!(replay("po-3"), replay("po-3"));
    }

    #[test]
    fn every_wicket_in_the_outcome_is_in_the_log() {
        let replay = replay("po-4");
        let logged = replay
            .events
            .iter()
            .filter(|event| matches!(event, MatchEvent::Wicket { .. }))
            .count();
        assert_eq!(logged, replay.outcome.fall_of_wickets.len());
    }

    #[test]
    fn only_a_catch_names_a_fielder() {
        let replay = replay("po-5");
        for event in &replay.events {
            if let MatchEvent::Wicket {
                kind, fielder_id, ..
            } = event
            {
                assert_eq!(fielder_id.is_some(), *kind == WicketKind::Caught);
            }
        }
    }

    #[test]
    fn the_openers_are_the_first_two_of_the_batting_side() {
        let replay = replay("po-6");
        let starts: Vec<(&str, &[String; 2])> = replay
            .events
            .iter()
            .filter_map(|event| match event {
                MatchEvent::InningsStart {
                    batting_franchise_id,
                    openers,
                    ..
                } => Some((batting_franchise_id.as_str(), openers)),
                _ => None,
            })
            .collect();
        assert!(!starts.is_empty());
        for (franchise, openers) in starts {
            assert_eq!(openers[0], format!("{franchise}-1"));
            assert_eq!(openers[1], format!("{franchise}-2"));
        }
    }

    /// The milestones each batter reaches in each innings, worked out from the deliveries.
    ///
    /// @param innings - The innings of the match.
    /// @returns `(innings number, batter, milestone)`, sorted.
    fn expected_milestones(innings: &[Innings]) -> Vec<(u32, String, u32)> {
        let mut expected = Vec::new();
        for (index, plan) in innings.iter().enumerate() {
            let mut totals: BTreeMap<&str, u32> = BTreeMap::new();
            for ball in &plan.balls {
                *totals.entry(ball.batter_id.as_str()).or_insert(0) += ball.runs;
            }
            for (batter, runs) in totals {
                for milestone in Milestone::ALL {
                    if runs >= milestone.runs() {
                        expected.push((index as u32 + 1, batter.to_string(), milestone.runs()));
                    }
                }
            }
        }
        expected.sort();
        expected
    }

    #[test]
    fn every_thirty_fifty_and_hundred_is_logged_once() {
        let home = side("home", 60);
        let away = side("away", 60);
        let config = ModifierConfig::default();
        for match_id in ["m-1", "m-2", "m-3", "m-4", "m-5"] {
            let played = play_match(
                "lobby-log",
                match_id,
                15,
                &home,
                &away,
                MatchKind::Playoff,
                &config,
            );
            let replay = replay_match(
                "lobby-log",
                match_id,
                15,
                &home,
                &away,
                MatchKind::Playoff,
                &config,
            );
            let mut logged: Vec<(u32, String, u32)> = replay
                .events
                .iter()
                .filter_map(|event| match event {
                    MatchEvent::Milestone {
                        innings,
                        batter_id,
                        milestone,
                        ..
                    } => Some((*innings, batter_id.clone(), milestone.runs())),
                    _ => None,
                })
                .collect();
            logged.sort();
            assert_eq!(logged, expected_milestones(&played.innings), "{match_id}");
        }
    }

    #[test]
    fn a_partnership_is_always_between_two_different_batters() {
        for match_id in ["p-1", "p-2", "p-3"] {
            for event in replay(match_id).events {
                if let MatchEvent::Partnership { batter_ids, .. } = event {
                    assert_ne!(batter_ids[0], batter_ids[1]);
                }
            }
        }
    }
}
