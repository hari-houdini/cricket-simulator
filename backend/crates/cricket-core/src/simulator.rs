//! Seeded ball-by-ball match simulation (docs/game-design.md sections 6 and 9, ADR 0003).
//!
//! Every outcome is drawn from a generator seeded by lobby and match, so every guest sees
//! the same scores. Probabilities are integer weights out of 1000 so no float rounding can
//! differ between platforms.

use crate::model::{Ball, Innings, Player, WicketKind};
use crate::seed::{GameRng, seed_from};

/// Overs in a league or playoff innings (GLOSSARY.md, Over; game-design section 1, T20).
pub const OVERS_PER_INNINGS: u32 = 20;
/// Legal deliveries in an over.
pub const BALLS_PER_OVER: u32 = 6;
/// Wickets that end a super over.
pub const SUPER_OVER_WICKETS: u32 = 2;
/// Batters used in a super over.
pub const SUPER_OVER_BATTERS: usize = 3;
/// Wickets that end a regular innings: all ten batters are out.
pub const INNINGS_WICKETS: u32 = 10;

/// Tunable parameters for the ball model. Base weights follow docs/game-design.md section
/// 6.1. The rating and context modifiers are placeholders to be tuned, not design
/// decisions. All weights are out of 1000.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ModifierConfig {
    /// Dot balls out of 1000 (about 5%).
    pub base_dot: u32,
    /// Single runs out of 1000 (the 1-run share of the ~70% normal bucket).
    pub base_single: u32,
    /// Double runs out of 1000.
    pub base_double: u32,
    /// Triple runs out of 1000.
    pub base_triple: u32,
    /// Fours out of 1000 (about 15% of the ~20% boundary bucket).
    pub base_four: u32,
    /// Sixes out of 1000 (about 5% of the ~20% boundary bucket).
    pub base_six: u32,
    /// Wickets out of 1000 (about 5%).
    pub base_wicket: u32,
    /// A rating gap of this many points moves one wicket-weight point. Placeholder.
    pub rating_wicket_divisor: i32,
    /// A rating gap of this many points moves one four-weight point. Placeholder.
    pub rating_boundary_divisor: i32,
    /// Extra four weight during the powerplay (overs 1 to 6). Placeholder.
    pub powerplay_boundary_bonus: i32,
    /// Extra wicket weight during the death overs (overs 16 to 20). Placeholder.
    pub death_wicket_bonus: i32,
}

impl Default for ModifierConfig {
    /// The base table from docs/game-design.md section 6.1, with placeholder modifiers.
    fn default() -> Self {
        Self {
            base_dot: 50,
            base_single: 550,
            base_double: 130,
            base_triple: 20,
            base_four: 150,
            base_six: 50,
            base_wicket: 50,
            rating_wicket_divisor: 10,
            rating_boundary_divisor: 5,
            powerplay_boundary_bonus: 20,
            death_wicket_bonus: 10,
        }
    }
}

/// The result of one delivery before it is written into a {@link Ball}.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BallOutcome {
    /// Runs off the bat, 0 to 6.
    Runs(u32),
    /// The batter was dismissed.
    Wicket(WicketKind),
}

/// One side in a match: a franchise and its starting XI in batting order.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Side {
    /// The franchise.
    pub franchise_id: String,
    /// The 11 players in batting order. The XI must already be validated (see `squad`).
    pub xi: Vec<Player>,
}

impl Side {
    /// Returns the bowling options in this XI, in the order they are picked to bowl.
    ///
    /// @returns Every bowler and bowling all-rounder in the XI.
    pub fn bowling_options(&self) -> Vec<&Player> {
        self.xi
            .iter()
            .filter(|player| player.role.is_bowling_option())
            .collect()
    }
}

/// A fair-play score for one starting-XI player in one match (GLOSSARY.md, Match score).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlayerFairPlay {
    /// The player.
    pub player_id: String,
    /// The franchise they played for.
    pub franchise_id: String,
    /// The score in tenths of a point, 0 to 100. 100 is a clean match.
    pub score_tenths: u32,
}

/// Whether a match is part of the league or the playoffs.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MatchKind {
    /// A league match. A level score is a tie and both sides get one point.
    League,
    /// A playoff match. A level score is settled by super overs.
    Playoff,
}

/// Everything a finished match produced.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MatchOutcome {
    /// Match identifier within the lobby, such as `r03-csk-mi`.
    pub id: String,
    /// Round the match was played in.
    pub round: u32,
    /// Home franchise.
    pub home_id: String,
    /// Away franchise.
    pub away_id: String,
    /// The franchise that won the toss.
    pub toss_winner_id: String,
    /// The franchise that batted first.
    pub batting_first_id: String,
    /// Regular innings, then any super-over innings.
    pub innings: Vec<Innings>,
    /// The winner, or `None` for a league tie.
    pub winner_id: Option<String>,
    /// Fair-play scores for every starting-XI player.
    pub fair_play: Vec<PlayerFairPlay>,
}

/// The settings for one innings.
struct InningsPlan<'a> {
    batting_franchise_id: &'a str,
    bowling_franchise_id: &'a str,
    batters: &'a [Player],
    bowlers: &'a [&'a Player],
    overs: u32,
    max_wickets: u32,
    /// Runs to reach to win the chase, or `None` for the first innings.
    target: Option<u32>,
}

/// The integer weights for one delivery, out of 1000.
struct BallWeights {
    dot: u32,
    single: u32,
    double: u32,
    triple: u32,
    four: u32,
    six: u32,
    wicket: u32,
}

/// Works out the weights for one delivery from the two players and the match state.
///
/// Weights for wickets and fours move with the rating gap and the over. The single weight
/// absorbs the difference, so the weights always total 1000.
///
/// @param batter - The batter facing the delivery.
/// @param bowler - The bowler delivering it.
/// @param over - Zero-based over number.
/// @param config - The ball model parameters.
/// @returns The weights for this delivery.
fn ball_weights(
    batter: &Player,
    bowler: &Player,
    over: u32,
    config: &ModifierConfig,
) -> BallWeights {
    let edge = i32::from(batter.batting) - i32::from(bowler.bowling);

    let mut wicket = config.base_wicket as i32 - edge / config.rating_wicket_divisor;
    if over >= 15 {
        wicket += config.death_wicket_bonus;
    }
    let wicket = wicket.clamp(0, 200);

    let mut four = config.base_four as i32 + edge / config.rating_boundary_divisor;
    if over < 6 {
        four += config.powerplay_boundary_bonus;
    }
    let four = four.clamp(0, 300);

    let shift = (wicket - config.base_wicket as i32) + (four - config.base_four as i32);
    let single = config.base_single as i32 - shift;

    BallWeights {
        dot: config.base_dot,
        single: single.max(0) as u32,
        double: config.base_double,
        triple: config.base_triple,
        four: four as u32,
        six: config.base_six,
        wicket: wicket as u32,
    }
}

/// Draws one delivery's outcome from the weights.
///
/// @param rng - The match generator.
/// @param weights - The weights for this delivery, summing to 1000.
/// @returns The runs or the dismissal.
fn sample_outcome(rng: &mut GameRng, weights: &BallWeights) -> BallOutcome {
    let mut roll = rng.below(1000);
    let buckets = [
        (weights.dot, BallOutcome::Runs(0)),
        (weights.single, BallOutcome::Runs(1)),
        (weights.double, BallOutcome::Runs(2)),
        (weights.triple, BallOutcome::Runs(3)),
        (weights.four, BallOutcome::Runs(4)),
        (weights.six, BallOutcome::Runs(6)),
    ];
    for (weight, outcome) in buckets {
        if roll < weight {
            return outcome;
        }
        roll -= weight;
    }
    // The wicket bucket is whatever is left of the roll, which is the wicket weight
    // because the weights total 1000 (checked in the tests).
    debug_assert!(roll < weights.wicket, "weights must total 1000");
    BallOutcome::Wicket(sample_wicket_kind(rng))
}

/// Picks how a batter was dismissed (docs/game-design.md section 6.1).
///
/// @param rng - The match generator.
/// @returns Caught 60%, LBW 15%, bowled 5%, run-out 10%, other 10%.
fn sample_wicket_kind(rng: &mut GameRng) -> WicketKind {
    match rng.below(100) {
        0..60 => WicketKind::Caught,
        60..75 => WicketKind::Lbw,
        75..80 => WicketKind::Bowled,
        80..90 => WicketKind::RunOut,
        _ => WicketKind::Other,
    }
}

/// Plays out one innings ball by ball.
///
/// Strike rotates on odd runs and at the end of each over. A dismissed batter is replaced
/// by the next in the batting order. The innings ends when the overs run out, the batters
/// are all out, or the chase target is reached.
///
/// @param rng - The match generator.
/// @param plan - The innings settings.
/// @param config - The ball model parameters.
/// @returns The completed innings.
fn play_innings(rng: &mut GameRng, plan: &InningsPlan<'_>, config: &ModifierConfig) -> Innings {
    let all_out_at = plan
        .max_wickets
        .min(plan.batters.len().saturating_sub(1) as u32);
    let max_legal = plan.overs * BALLS_PER_OVER;

    let mut striker = 0usize;
    let mut non_striker = 1usize;
    let mut next_in = 2usize;
    let mut balls: Vec<Ball> = Vec::new();
    let mut total_runs = 0u32;
    let mut wickets = 0u32;

    while (balls.len() as u32) < max_legal && wickets < all_out_at {
        if plan.target.is_some_and(|target| total_runs >= target) {
            break;
        }
        let legal = balls.len() as u32;
        let over = legal / BALLS_PER_OVER;
        let bowler = plan.bowlers[over as usize % plan.bowlers.len()];
        let batter = &plan.batters[striker];

        let weights = ball_weights(batter, bowler, over, config);
        let outcome = sample_outcome(rng, &weights);

        match outcome {
            BallOutcome::Runs(runs) => {
                total_runs += runs;
                balls.push(Ball {
                    over,
                    ball: legal % BALLS_PER_OVER + 1,
                    bowler_id: bowler.id.clone(),
                    batter_id: batter.id.clone(),
                    runs,
                    wicket: None,
                });
                if runs % 2 == 1 {
                    std::mem::swap(&mut striker, &mut non_striker);
                }
            }
            BallOutcome::Wicket(kind) => {
                wickets += 1;
                balls.push(Ball {
                    over,
                    ball: legal % BALLS_PER_OVER + 1,
                    bowler_id: bowler.id.clone(),
                    batter_id: batter.id.clone(),
                    runs: 0,
                    wicket: Some(kind),
                });
                if wickets < all_out_at {
                    striker = next_in;
                    next_in += 1;
                }
            }
        }

        if (balls.len() as u32).is_multiple_of(BALLS_PER_OVER) {
            std::mem::swap(&mut striker, &mut non_striker);
        }
    }

    let legal_balls = balls.len() as u32;
    Innings {
        batting_franchise_id: plan.batting_franchise_id.to_string(),
        bowling_franchise_id: plan.bowling_franchise_id.to_string(),
        balls,
        total_runs,
        total_wickets: wickets,
        legal_balls,
    }
}

/// Plays one innings for a side batting against the other side's bowling options.
///
/// @param rng - The match generator.
/// @param batting - The side batting.
/// @param bowling - The side bowling.
/// @param overs - Overs available.
/// @param max_wickets - Wickets that end the innings.
/// @param target - Runs to chase, or `None` for the first innings.
/// @param config - The ball model parameters.
/// @returns The completed innings.
fn play_side_innings(
    rng: &mut GameRng,
    batting: &Side,
    bowling: &Side,
    overs: u32,
    max_wickets: u32,
    target: Option<u32>,
    config: &ModifierConfig,
) -> Innings {
    let bowlers = bowling.bowling_options();
    let batters = if overs == OVERS_PER_INNINGS {
        &batting.xi[..]
    } else {
        &batting.xi[..SUPER_OVER_BATTERS.min(batting.xi.len())]
    };
    let plan = InningsPlan {
        batting_franchise_id: &batting.franchise_id,
        bowling_franchise_id: &bowling.franchise_id,
        batters,
        bowlers: &bowlers,
        overs,
        max_wickets,
        target,
    };
    play_innings(rng, &plan, config)
}

/// Scores each starting-XI player's fair play for the match.
///
/// Each player's score is 10 minus their trouble rating times a seeded factor between 0.5
/// and 1.5, clamped to 0 to 10 (docs/game-design.md section 9). The score is kept in tenths
/// so it stays an integer.
///
/// @param lobby_id - The lobby the match belongs to.
/// @param match_id - The match identifier.
/// @param sides - The home and away sides.
/// @returns One score per starting-XI player.
fn score_fair_play(lobby_id: &str, match_id: &str, sides: [&Side; 2]) -> Vec<PlayerFairPlay> {
    let mut rng = GameRng::from_seed(seed_from(&["fair-play", lobby_id, match_id]));
    let mut scores = Vec::new();
    for side in sides {
        for player in &side.xi {
            // Factor in tenths: 0.5 is 5, 1.5 is 15.
            let factor = 5 + rng.below(11);
            let penalty = i64::from(player.trouble_rating) * i64::from(factor);
            let score = (100 - penalty).clamp(0, 100) as u32;
            scores.push(PlayerFairPlay {
                player_id: player.id.clone(),
                franchise_id: side.franchise_id.clone(),
                score_tenths: score,
            });
        }
    }
    scores
}

/// Simulates one match from start to finish.
///
/// The toss winner bats first. A league tie is recorded as a draw. A playoff tie is settled
/// by super overs until one side wins.
///
/// @param lobby_id - The lobby the match belongs to. Part of the seed.
/// @param match_id - The match identifier. Part of the seed.
/// @param round - The round the match is played in.
/// @param home - The home side.
/// @param away - The away side.
/// @param kind - League or playoff.
/// @param config - The ball model parameters.
/// @returns The completed match, including every innings and the fair-play scores.
pub fn simulate_match(
    lobby_id: &str,
    match_id: &str,
    round: u32,
    home: &Side,
    away: &Side,
    kind: MatchKind,
    config: &ModifierConfig,
) -> MatchOutcome {
    let mut rng = GameRng::from_seed(seed_from(&["match", lobby_id, match_id]));

    let home_wins_toss = rng.below(2) == 0;
    let (toss_winner, toss_loser) = if home_wins_toss {
        (home, away)
    } else {
        (away, home)
    };
    // The toss winner always bats first in this model.
    let (first, second) = (toss_winner, toss_loser);

    let first_innings = play_side_innings(
        &mut rng,
        first,
        second,
        OVERS_PER_INNINGS,
        INNINGS_WICKETS,
        None,
        config,
    );
    let chase_target = first_innings.total_runs + 1;
    let second_innings = play_side_innings(
        &mut rng,
        second,
        first,
        OVERS_PER_INNINGS,
        INNINGS_WICKETS,
        Some(chase_target),
        config,
    );

    let first_total = first_innings.total_runs;
    let second_total = second_innings.total_runs;
    let mut innings = vec![first_innings, second_innings];

    let winner_id = if second_total >= chase_target {
        Some(second.franchise_id.clone())
    } else if first_total > second_total {
        Some(first.franchise_id.clone())
    } else if kind == MatchKind::League {
        None
    } else {
        Some(settle_super_overs(
            &mut rng,
            first,
            second,
            &mut innings,
            config,
        ))
    };

    MatchOutcome {
        id: match_id.to_string(),
        round,
        home_id: home.franchise_id.clone(),
        away_id: away.franchise_id.clone(),
        toss_winner_id: toss_winner.franchise_id.clone(),
        batting_first_id: first.franchise_id.clone(),
        innings,
        winner_id,
        fair_play: score_fair_play(lobby_id, match_id, [home, away]),
    }
}

/// Plays super overs until one side scores more, appending each innings to `innings`.
///
/// @param rng - The match generator.
/// @param first - The side that batted first in the match.
/// @param second - The side that batted second in the match.
/// @param innings - The innings so far, extended in place with the super overs.
/// @param config - The ball model parameters.
/// @returns The franchise that won the super over.
fn settle_super_overs(
    rng: &mut GameRng,
    first: &Side,
    second: &Side,
    innings: &mut Vec<Innings>,
    config: &ModifierConfig,
) -> String {
    loop {
        let first_over = play_side_innings(rng, first, second, 1, SUPER_OVER_WICKETS, None, config);
        let target = first_over.total_runs + 1;
        let second_over = play_side_innings(
            rng,
            second,
            first,
            1,
            SUPER_OVER_WICKETS,
            Some(target),
            config,
        );
        let (first_runs, second_runs) = (first_over.total_runs, second_over.total_runs);
        innings.push(first_over);
        innings.push(second_over);
        if second_runs > first_runs {
            return second.franchise_id.clone();
        }
        if first_runs > second_runs {
            return first.franchise_id.clone();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::{Category, Role};

    fn player(id: &str, role: Role, rating: u8, trouble: u8) -> Player {
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
            trouble_rating: trouble,
        }
    }

    /// An 11-player XI in batting order with the four bowling options and one keeper.
    fn xi(prefix: &str, rating: u8, trouble: u8) -> Vec<Player> {
        vec![
            player(&format!("{prefix}-1"), Role::Batter, rating, trouble),
            player(&format!("{prefix}-2"), Role::Batter, rating, trouble),
            player(&format!("{prefix}-3"), Role::Batter, rating, trouble),
            player(&format!("{prefix}-4"), Role::AllRounder, rating, trouble),
            player(&format!("{prefix}-5"), Role::WicketKeeper, rating, trouble),
            player(&format!("{prefix}-6"), Role::AllRounder, rating, trouble),
            player(&format!("{prefix}-7"), Role::Bowler, rating, trouble),
            player(&format!("{prefix}-8"), Role::Bowler, rating, trouble),
            player(&format!("{prefix}-9"), Role::Bowler, rating, trouble),
            player(&format!("{prefix}-10"), Role::Bowler, rating, trouble),
            player(&format!("{prefix}-11"), Role::Batter, rating, trouble),
        ]
    }

    fn side(franchise: &str, prefix: &str, rating: u8) -> Side {
        Side {
            franchise_id: franchise.to_string(),
            xi: xi(prefix, rating, 0),
        }
    }

    #[test]
    fn weights_always_total_one_thousand() {
        let config = ModifierConfig::default();
        let batter = player("b", Role::Batter, 100, 0);
        let bowler = player("w", Role::Bowler, 0, 0);
        for (edge_batter, edge_bowler, over) in
            [(0u8, 100u8, 0u32), (100, 0, 19), (50, 50, 10), (0, 0, 17)]
        {
            let mut batter = batter.clone();
            batter.batting = edge_batter;
            let mut bowler = bowler.clone();
            bowler.bowling = edge_bowler;
            let w = ball_weights(&batter, &bowler, over, &config);
            let total = w.dot + w.single + w.double + w.triple + w.four + w.six + w.wicket;
            assert_eq!(
                total, 1000,
                "weights for batter {edge_batter}, bowler {edge_bowler}, over {over}"
            );
        }
    }

    #[test]
    fn long_run_outcome_rates_match_the_base_table() {
        // Equal ratings and middle overs, so no modifier applies and only the base table is tested.
        let config = ModifierConfig::default();
        let batter = player("b", Role::Batter, 50, 0);
        let bowler = player("w", Role::Bowler, 50, 0);
        let weights = ball_weights(&batter, &bowler, 8, &config);
        let mut rng = GameRng::from_seed(seed_from(&["rates"]));
        let trials = 200_000u32;
        let (mut dots, mut boundaries, mut wickets, mut normal) = (0u32, 0u32, 0u32, 0u32);
        for _ in 0..trials {
            match sample_outcome(&mut rng, &weights) {
                BallOutcome::Runs(0) => dots += 1,
                BallOutcome::Runs(4 | 6) => boundaries += 1,
                BallOutcome::Runs(_) => normal += 1,
                BallOutcome::Wicket(_) => wickets += 1,
            }
        }
        let rate = |count: u32| f64::from(count) / f64::from(trials);
        assert!((rate(dots) - 0.05).abs() < 0.01, "dots {}", rate(dots));
        assert!(
            (rate(boundaries) - 0.20).abs() < 0.01,
            "boundaries {}",
            rate(boundaries)
        );
        assert!(
            (rate(wickets) - 0.05).abs() < 0.01,
            "wickets {}",
            rate(wickets)
        );
        assert!(
            (rate(normal) - 0.70).abs() < 0.01,
            "normal {}",
            rate(normal)
        );
    }

    #[test]
    fn an_innings_scores_match_its_balls() {
        let config = ModifierConfig::default();
        let batting = side("a", "a", 60);
        let bowling = side("b", "b", 60);
        let mut rng = GameRng::from_seed(seed_from(&["innings"]));
        let innings = play_side_innings(
            &mut rng,
            &batting,
            &bowling,
            OVERS_PER_INNINGS,
            INNINGS_WICKETS,
            None,
            &config,
        );
        let runs: u32 = innings.balls.iter().map(|ball| ball.runs).sum();
        let wickets = innings
            .balls
            .iter()
            .filter(|ball| ball.wicket.is_some())
            .count() as u32;
        assert_eq!(innings.total_runs, runs);
        assert_eq!(innings.total_wickets, wickets);
        assert_eq!(innings.legal_balls as usize, innings.balls.len());
        assert!(innings.legal_balls <= OVERS_PER_INNINGS * BALLS_PER_OVER);
    }

    #[test]
    fn a_chase_stops_once_the_target_is_reached() {
        let config = ModifierConfig::default();
        let batting = side("a", "a", 90);
        let bowling = side("b", "b", 10);
        let mut rng = GameRng::from_seed(seed_from(&["chase"]));
        let innings = play_side_innings(
            &mut rng,
            &batting,
            &bowling,
            OVERS_PER_INNINGS,
            INNINGS_WICKETS,
            Some(10),
            &config,
        );
        assert!(innings.total_runs >= 10);
        assert!(innings.legal_balls < OVERS_PER_INNINGS * BALLS_PER_OVER);
    }

    #[test]
    fn the_same_match_gives_the_same_result() {
        let config = ModifierConfig::default();
        let home = side("home", "h", 60);
        let away = side("away", "a", 60);
        let first = simulate_match(
            "lobby-1",
            "r01-home-away",
            1,
            &home,
            &away,
            MatchKind::League,
            &config,
        );
        let again = simulate_match(
            "lobby-1",
            "r01-home-away",
            1,
            &home,
            &away,
            MatchKind::League,
            &config,
        );
        assert_eq!(first, again);
    }

    #[test]
    fn a_different_match_gives_a_different_result() {
        let config = ModifierConfig::default();
        let home = side("home", "h", 60);
        let away = side("away", "a", 60);
        let first = simulate_match(
            "lobby-1",
            "r01-home-away",
            1,
            &home,
            &away,
            MatchKind::League,
            &config,
        );
        let other = simulate_match(
            "lobby-1",
            "r02-home-away",
            2,
            &home,
            &away,
            MatchKind::League,
            &config,
        );
        assert_ne!(first.innings, other.innings);
    }

    #[test]
    fn a_league_match_can_end_level() {
        // Identical sides with a shared seed may tie. The winner must then be None.
        let config = ModifierConfig::default();
        let home = side("home", "h", 60);
        let away = side("away", "a", 60);
        let outcome = simulate_match(
            "lobby-tie",
            "r01",
            1,
            &home,
            &away,
            MatchKind::League,
            &config,
        );
        let level = outcome.innings[0].total_runs == outcome.innings[1].total_runs;
        if level {
            assert_eq!(outcome.winner_id, None);
        }
        assert!(outcome.winner_id.is_some() || level);
    }

    #[test]
    fn a_playoff_always_has_a_winner_and_super_overs_when_level() {
        let config = ModifierConfig::default();
        let home = side("home", "h", 60);
        let away = side("away", "a", 60);
        for match_id in ["po-1", "po-2", "po-3", "po-4", "po-5"] {
            let outcome = simulate_match(
                "lobby-po",
                match_id,
                15,
                &home,
                &away,
                MatchKind::Playoff,
                &config,
            );
            assert!(outcome.winner_id.is_some(), "{match_id} has no winner");
            if outcome.innings.len() > 2 {
                assert_eq!(outcome.innings.len() % 2, 0);
            }
        }
    }

    #[test]
    fn fair_play_is_scored_for_every_starting_xi_player() {
        let config = ModifierConfig::default();
        let home = Side {
            franchise_id: "home".to_string(),
            xi: xi("h", 60, 10),
        };
        let away = Side {
            franchise_id: "away".to_string(),
            xi: xi("a", 60, 0),
        };
        let outcome = simulate_match(
            "lobby-fp",
            "r01",
            1,
            &home,
            &away,
            MatchKind::League,
            &config,
        );
        assert_eq!(outcome.fair_play.len(), 22);
        assert!(
            outcome
                .fair_play
                .iter()
                .all(|score| score.score_tenths <= 100)
        );
        // A clean player (trouble 0) always scores a full 100.
        assert!(
            outcome
                .fair_play
                .iter()
                .filter(|score| score.franchise_id == "away")
                .all(|score| score.score_tenths == 100)
        );
    }
}
