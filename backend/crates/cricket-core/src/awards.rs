//! Season and match awards (docs/game-design.md sections 7 and 8).
//!
//! Every award is computed from the stored match summaries and the squads, so it can be
//! recomputed at any point in the season. Each ranking breaks its ties on a fixed key (a player
//! or guest ID), so the same season always names the same winners.

use std::cmp::Ordering;
use std::collections::{BTreeMap, HashMap};

use serde::{Deserialize, Serialize};

use crate::fantasy::{self, SquadRole};
use crate::lobby::SquadEntry;
use crate::model::Category;
use crate::performance::PlayerPerformance;
use crate::simulator::MatchOutcome;
use crate::standings::TeamRecord;

/// The first and second place on one award.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Podium<T> {
    /// The winner, or `None` until someone has earned the award.
    pub winner: Option<T>,
    /// The runner-up, or `None` until there is one.
    pub runner_up: Option<T>,
}

/// A player's season line on an individual award screen.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeasonLine {
    /// The player.
    pub player_id: String,
    /// The franchise the player first appeared for this season.
    pub franchise_id: String,
    /// Matches in which the player batted.
    pub innings: u32,
    /// Runs scored.
    pub runs: u32,
    /// Wickets taken.
    pub wickets: u32,
    /// Runs conceded while bowling.
    pub runs_conceded: u32,
    /// Fantasy points before any multiplier.
    pub fantasy_points: u32,
}

/// An owner's season line on the Most Valuable Player screen.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OwnerLine {
    /// The owner.
    pub guest_id: String,
    /// The owner's franchise.
    pub franchise_id: String,
    /// Fantasy points with the captain and vice-captain multipliers, in hundredths.
    pub points_hundredths: u64,
}

/// One player's average effect on a franchise's fair-play rating.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerEffect {
    /// The player.
    pub player_id: String,
    /// The average of the player's match scores minus the maximum, so 0 or below.
    pub average_effect: f64,
}

/// A franchise's Fair Play screen.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FairPlayFranchise {
    /// The franchise.
    pub franchise_id: String,
    /// The season standing: the average of its match ratings, from 0 to 10.
    pub standing: f64,
    /// Up to two players who pulled the rating down most.
    pub lowering: Vec<PlayerEffect>,
    /// Up to two players who held the rating up most.
    pub lifting: Vec<PlayerEffect>,
}

/// The Fair Play award and every franchise that has played.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FairPlayAward {
    /// The best season standing, or `None` if no franchise has played.
    pub winner: Option<String>,
    /// Every franchise that has played, in league table order.
    pub franchises: Vec<FairPlayFranchise>,
}

/// The Man of the Match in one match.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManOfTheMatch {
    /// The round the match was played in.
    pub round: u32,
    /// The home franchise.
    pub home_id: String,
    /// The away franchise.
    pub away_id: String,
    /// The player.
    pub player_id: String,
    /// The franchise the player represented.
    pub franchise_id: String,
}

/// Every award for a season so far.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeasonAwards {
    /// Most runs. Ties go to the lower player ID.
    pub orange_cap: Podium<SeasonLine>,
    /// Most wickets, then fewer runs conceded.
    pub purple_cap: Podium<SeasonLine>,
    /// Highest season fantasy points with multipliers.
    pub most_valuable: Podium<OwnerLine>,
    /// Highest fantasy points among uncapped players.
    pub emerging: Podium<SeasonLine>,
    /// The best season fair-play standing.
    pub fair_play: FairPlayAward,
    /// One entry per played match, in play order.
    pub man_of_the_match: Vec<ManOfTheMatch>,
}

/// The season totals one player has built up, before awards pick from them.
#[derive(Debug, Clone, PartialEq, Eq)]
struct Totals {
    player_id: String,
    franchise_id: String,
    innings: u32,
    runs: u32,
    wickets: u32,
    runs_conceded: u32,
    balls_faced: u32,
    balls_bowled: u32,
    fantasy_points: u32,
}

/// Adds up every player's season from the performances in the matches, in first-appearance order.
///
/// @param matches - Every played match.
/// @returns One totals entry per player who appeared.
fn season_totals(matches: &[MatchOutcome]) -> Vec<Totals> {
    let mut order: Vec<String> = Vec::new();
    let mut totals: HashMap<String, Totals> = HashMap::new();
    for performance in matches.iter().flat_map(|outcome| &outcome.performances) {
        let entry = totals
            .entry(performance.player_id.clone())
            .or_insert_with(|| {
                order.push(performance.player_id.clone());
                Totals {
                    player_id: performance.player_id.clone(),
                    franchise_id: performance.franchise_id.clone(),
                    innings: 0,
                    runs: 0,
                    wickets: 0,
                    runs_conceded: 0,
                    balls_faced: 0,
                    balls_bowled: 0,
                    fantasy_points: 0,
                }
            });
        add_performance(entry, performance);
    }
    order.iter().filter_map(|id| totals.remove(id)).collect()
}

/// Adds one match line to a player's season totals.
///
/// @param entry - The season totals being built.
/// @param performance - One match line for the same player.
fn add_performance(entry: &mut Totals, performance: &PlayerPerformance) {
    entry.innings += u32::from(performance.batted);
    entry.runs += performance.runs;
    entry.wickets += performance.wickets;
    entry.runs_conceded += performance.runs_conceded;
    entry.balls_faced += performance.balls_faced;
    entry.balls_bowled += performance.balls_bowled;
    entry.fantasy_points += fantasy::points(performance);
}

/// Converts season totals into the award line shown on the screen.
///
/// @param totals - The player's season totals.
/// @returns The line.
fn season_line(totals: &Totals) -> SeasonLine {
    SeasonLine {
        player_id: totals.player_id.clone(),
        franchise_id: totals.franchise_id.clone(),
        innings: totals.innings,
        runs: totals.runs,
        wickets: totals.wickets,
        runs_conceded: totals.runs_conceded,
        fantasy_points: totals.fantasy_points,
    }
}

/// Takes the first two places in a ranking.
///
/// @param items - Everything to rank.
/// @param compare - Ordering where `Less` ranks first.
/// @returns The winner and runner-up.
fn podium<T: Clone>(items: &[T], compare: impl Fn(&T, &T) -> Ordering) -> Podium<T> {
    let mut ranked = items.to_vec();
    ranked.sort_by(compare);
    Podium {
        winner: ranked.first().cloned(),
        runner_up: ranked.get(1).cloned(),
    }
}

/// Picks the Man of the Match: most fantasy points, then the higher `runs + 20 × wickets`, then
/// the earlier batting position, then the lower player ID.
///
/// @param matches - Every played match.
/// @returns One entry per match, in the order given.
pub fn man_of_the_match(matches: &[MatchOutcome]) -> Vec<ManOfTheMatch> {
    matches
        .iter()
        .filter_map(|outcome| {
            let best = outcome.performances.iter().min_by(|left, right| {
                fantasy::points(right)
                    .cmp(&fantasy::points(left))
                    .then_with(|| impact(right).cmp(&impact(left)))
                    .then_with(|| left.batting_position.cmp(&right.batting_position))
                    .then_with(|| left.player_id.cmp(&right.player_id))
            })?;
            Some(ManOfTheMatch {
                round: outcome.round,
                home_id: outcome.home_id.clone(),
                away_id: outcome.away_id.clone(),
                player_id: best.player_id.clone(),
                franchise_id: best.franchise_id.clone(),
            })
        })
        .collect()
}

/// The Man of the Match tie-break weight, `runs + 20 × wickets`.
///
/// @param performance - One match line.
/// @returns The weight.
fn impact(performance: &PlayerPerformance) -> u32 {
    performance.runs + fantasy::POINTS_PER_WICKET * performance.wickets
}

/// Works out the Most Valuable Player ranking. Owners with no points are left out.
///
/// @param matches - Every played match.
/// @param squads - The squads, with each owner's captain and vice-captain.
/// @returns The owners with points, best first.
fn most_valuable(matches: &[MatchOutcome], squads: &[SquadEntry]) -> Vec<OwnerLine> {
    let mut lines = Vec::new();
    for entry in squads {
        let Some(guest_id) = entry.owner_guest_id.as_ref() else {
            continue;
        };
        let leadership = entry.starting_xi.as_ref();
        let role_of = |player_id: &str| match leadership {
            Some(xi) if xi.captain_id == player_id => SquadRole::Captain,
            Some(xi) if xi.vice_captain_id == player_id => SquadRole::ViceCaptain,
            _ => SquadRole::Other,
        };
        let points_hundredths: u64 = matches
            .iter()
            .flat_map(|outcome| &outcome.performances)
            .filter(|row| row.franchise_id == entry.franchise_id)
            .map(|row| {
                u64::from(fantasy::points(row))
                    * u64::from(fantasy::multiplier_hundredths(role_of(&row.player_id)))
            })
            .sum();
        if points_hundredths > 0 {
            lines.push(OwnerLine {
                guest_id: guest_id.clone(),
                franchise_id: entry.franchise_id.clone(),
                points_hundredths,
            });
        }
    }
    lines.sort_by(|left, right| {
        right
            .points_hundredths
            .cmp(&left.points_hundredths)
            .then_with(|| left.guest_id.cmp(&right.guest_id))
    });
    lines
}

/// Builds the Fair Play award from the match scores.
///
/// A match rating is the floor of a team's mean score, in tenths. A franchise's standing is the
/// mean of its match ratings. Each player's average effect is their mean score minus the maximum.
///
/// @param table - The league table, best first. Its order breaks standing ties.
/// @param matches - Every played match.
/// @returns The Fair Play award.
pub fn fair_play(table: &[TeamRecord], matches: &[MatchOutcome]) -> FairPlayAward {
    let mut ratings: BTreeMap<&str, (u64, u32)> = BTreeMap::new();
    let mut players: BTreeMap<&str, (u64, u32, &str)> = BTreeMap::new();
    for outcome in matches {
        let mut per_team: BTreeMap<&str, (u32, u32)> = BTreeMap::new();
        for score in &outcome.fair_play {
            let team = per_team
                .entry(score.franchise_id.as_str())
                .or_insert((0, 0));
            team.0 += score.score_tenths;
            team.1 += 1;
            let player = players.entry(score.player_id.as_str()).or_insert((
                0,
                0,
                score.franchise_id.as_str(),
            ));
            player.0 += u64::from(score.score_tenths);
            player.1 += 1;
        }
        for (franchise, (sum, count)) in per_team {
            let rating = sum / count;
            let entry = ratings.entry(franchise).or_insert((0, 0));
            entry.0 += u64::from(rating);
            entry.1 += 1;
        }
    }

    let franchises: Vec<FairPlayFranchise> = table
        .iter()
        .filter_map(|record| {
            let &(rating_sum, rated) = ratings.get(record.franchise_id.as_str())?;
            let effects: Vec<(&str, u64, u32)> = players
                .iter()
                .filter(|(_, (_, _, franchise))| *franchise == record.franchise_id)
                .map(|(player, (sum, count, _))| (*player, *sum, *count))
                .collect();
            Some(FairPlayFranchise {
                franchise_id: record.franchise_id.clone(),
                standing: rating_sum as f64 / f64::from(rated) / 10.0,
                lowering: lowest_effects(&effects),
                lifting: highest_effects(&effects),
            })
        })
        .collect();

    let winner = franchises
        .iter()
        .fold(None::<&FairPlayFranchise>, |best, candidate| match best {
            Some(current) if current.standing >= candidate.standing => Some(current),
            _ => Some(candidate),
        })
        .map(|franchise| franchise.franchise_id.clone());
    FairPlayAward { winner, franchises }
}

/// The two players who pulled a franchise's rating down most. Only players below the maximum count.
///
/// @param effects - Each player's (id, score sum in tenths, match count).
/// @returns Up to two players, lowest average first.
fn lowest_effects(effects: &[(&str, u64, u32)]) -> Vec<PlayerEffect> {
    let mut below: Vec<&(&str, u64, u32)> = effects
        .iter()
        .filter(|(_, sum, count)| *sum < 100 * u64::from(*count))
        .collect();
    below.sort_by(|left, right| compare_average(left, right).then_with(|| left.0.cmp(right.0)));
    below.into_iter().take(2).map(effect_line).collect()
}

/// The two players who held a franchise's rating up most.
///
/// @param effects - Each player's (id, score sum in tenths, match count).
/// @returns Up to two players, highest average first.
fn highest_effects(effects: &[(&str, u64, u32)]) -> Vec<PlayerEffect> {
    let mut all: Vec<&(&str, u64, u32)> = effects.iter().collect();
    all.sort_by(|left, right| compare_average(right, left).then_with(|| left.0.cmp(right.0)));
    all.into_iter().take(2).map(effect_line).collect()
}

/// Compares two players' average scores by cross-multiplying, so no floats are needed.
///
/// @param left - A player's (id, sum, count).
/// @param right - Another player's.
/// @returns `Less` when `left` has the lower average.
fn compare_average(left: &(&str, u64, u32), right: &(&str, u64, u32)) -> Ordering {
    (left.1 * u64::from(right.2)).cmp(&(right.1 * u64::from(left.2)))
}

/// Converts a player's totals into their average effect for the screen.
///
/// @param entry - The player's (id, sum, count).
/// @returns The effect, from tenths of a point back to points.
fn effect_line(entry: &(&str, u64, u32)) -> PlayerEffect {
    PlayerEffect {
        player_id: entry.0.to_string(),
        average_effect: entry.1 as f64 / f64::from(entry.2) / 10.0 - 10.0,
    }
}

/// Builds every season award from the played matches, the table and the squads.
///
/// The Emerging Player award covers only uncapped players. The age and appearance limits in
/// docs/game-design.md section 8.1 are not applied yet (open items 2 and 3).
///
/// @param matches - Every played match, league then playoffs.
/// @param table - The league table, best first.
/// @param squads - The squads, with each owner's captain and vice-captain.
/// @returns Every award for the season so far.
pub fn season_awards(
    matches: &[MatchOutcome],
    table: &[TeamRecord],
    squads: &[SquadEntry],
) -> SeasonAwards {
    let totals = season_totals(matches);
    let categories: HashMap<&str, Category> = squads
        .iter()
        .flat_map(|entry| &entry.players)
        .map(|player| (player.id.as_str(), player.category))
        .collect();

    let batters: Vec<Totals> = totals
        .iter()
        .filter(|entry| entry.balls_faced > 0)
        .cloned()
        .collect();
    let bowlers: Vec<Totals> = totals
        .iter()
        .filter(|entry| entry.balls_bowled > 0)
        .cloned()
        .collect();
    let uncapped: Vec<Totals> = totals
        .iter()
        .filter(|entry| categories.get(entry.player_id.as_str()) == Some(&Category::Uncapped))
        .cloned()
        .collect();

    let orange_cap = podium(&batters, |left, right| {
        right
            .runs
            .cmp(&left.runs)
            .then_with(|| left.player_id.cmp(&right.player_id))
    });
    let purple_cap = podium(&bowlers, |left, right| {
        right
            .wickets
            .cmp(&left.wickets)
            .then_with(|| left.runs_conceded.cmp(&right.runs_conceded))
            .then_with(|| left.player_id.cmp(&right.player_id))
    });
    let emerging = podium(&uncapped, |left, right| {
        right
            .fantasy_points
            .cmp(&left.fantasy_points)
            .then_with(|| left.player_id.cmp(&right.player_id))
    });

    let owners = most_valuable(matches, squads);

    SeasonAwards {
        orange_cap: map_podium(orange_cap, |entry| season_line(&entry)),
        purple_cap: map_podium(purple_cap, |entry| season_line(&entry)),
        most_valuable: Podium {
            winner: owners.first().cloned(),
            runner_up: owners.get(1).cloned(),
        },
        emerging: map_podium(emerging, |entry| season_line(&entry)),
        fair_play: fair_play(table, matches),
        man_of_the_match: man_of_the_match(matches),
    }
}

/// Maps the entries of a podium.
///
/// @param podium - The podium to convert.
/// @param convert - Converts one entry.
/// @returns The converted podium.
fn map_podium<T, U>(podium: Podium<T>, convert: impl Fn(T) -> U) -> Podium<U> {
    Podium {
        winner: podium.winner.map(&convert),
        runner_up: podium.runner_up.map(&convert),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lobby::StartingXi;
    use crate::model::Player;
    use crate::simulator::PlayerFairPlay;
    use crate::squad::SQUAD_SIZE;

    fn perf(player: &str, franchise: &str, position: u32) -> PlayerPerformance {
        PlayerPerformance {
            player_id: player.to_string(),
            franchise_id: franchise.to_string(),
            batting_position: position,
            batted: false,
            runs: 0,
            balls_faced: 0,
            boundaries: 0,
            wickets: 0,
            catches: 0,
            runs_conceded: 0,
            balls_bowled: 0,
        }
    }

    fn outcome(
        round: u32,
        performances: Vec<PlayerPerformance>,
        fair_play: Vec<PlayerFairPlay>,
    ) -> MatchOutcome {
        MatchOutcome {
            id: format!("r{round:02}"),
            round,
            home_id: "a".to_string(),
            away_id: "b".to_string(),
            toss_winner_id: "a".to_string(),
            batting_first_id: "a".to_string(),
            innings: Vec::new(),
            winner_id: None,
            fair_play,
            performances,
            fall_of_wickets: Vec::new(),
        }
    }

    fn score(player: &str, franchise: &str, tenths: u32) -> PlayerFairPlay {
        PlayerFairPlay {
            player_id: player.to_string(),
            franchise_id: franchise.to_string(),
            score_tenths: tenths,
        }
    }

    fn player(id: &str, category: Category) -> Player {
        Player {
            id: id.to_string(),
            name: id.to_string(),
            franchise_id: None,
            role: crate::model::Role::Batter,
            category,
            retired: false,
            batting: 50,
            bowling: 50,
            fielding: 50,
            base_price: 100,
            trouble_rating: 0,
        }
    }

    fn squad(
        franchise: &str,
        guest: Option<&str>,
        captain: &str,
        players: Vec<Player>,
    ) -> SquadEntry {
        assert!(players.len() <= SQUAD_SIZE);
        SquadEntry {
            franchise_id: franchise.to_string(),
            owner_guest_id: guest.map(str::to_string),
            players,
            starting_xi: Some(StartingXi {
                player_ids: vec![captain.to_string()],
                captain_id: captain.to_string(),
                vice_captain_id: captain.to_string(),
            }),
            substitution_used: false,
        }
    }

    #[test]
    fn orange_cap_goes_to_the_most_runs_and_ties_go_to_the_lower_id() {
        let mut amy = perf("amy", "a", 1);
        amy.runs = 4;
        amy.balls_faced = 2;
        let mut zed = perf("zed", "a", 2);
        zed.runs = 4;
        zed.balls_faced = 2;
        let mut kim = perf("kim", "a", 3);
        kim.runs = 6;
        kim.balls_faced = 2;
        let matches = vec![outcome(1, vec![zed, amy, kim], Vec::new())];
        let awards = season_awards(&matches, &[], &[]);
        assert_eq!(
            awards.orange_cap.winner.map(|line| line.player_id),
            Some("kim".to_string())
        );
        assert_eq!(
            awards.orange_cap.runner_up.map(|line| line.player_id),
            Some("amy".to_string())
        );
    }

    #[test]
    fn purple_cap_breaks_wicket_ties_on_fewer_runs_conceded() {
        let mut generous = perf("generous", "b", 1);
        generous.wickets = 2;
        generous.runs_conceded = 40;
        generous.balls_bowled = 12;
        let mut tight = perf("tight", "b", 2);
        tight.wickets = 2;
        tight.runs_conceded = 20;
        tight.balls_bowled = 12;
        let matches = vec![outcome(1, vec![generous, tight], Vec::new())];
        let awards = season_awards(&matches, &[], &[]);
        assert_eq!(
            awards.purple_cap.winner.map(|line| line.player_id),
            Some("tight".to_string())
        );
    }

    #[test]
    fn man_of_the_match_uses_points_then_impact_then_batting_position() {
        let mut opener = perf("opener", "a", 1);
        opener.runs = 30;
        opener.balls_faced = 20;
        let mut bowler = perf("bowler", "b", 9);
        bowler.wickets = 1;
        bowler.balls_bowled = 24;
        let mut tailender = perf("tailender", "a", 11);
        tailender.runs = 30;
        tailender.balls_faced = 20;
        let picks = man_of_the_match(&[outcome(3, vec![tailender, bowler, opener], Vec::new())]);
        // Opener and tailender tie on points and impact, so the earlier batting position wins.
        assert_eq!(picks[0].player_id, "opener");
        assert_eq!(picks[0].round, 3);
    }

    #[test]
    fn fair_play_ranks_the_cleaner_franchise_and_names_two_lowering_players() {
        let table = vec![TeamRecord::new("a"), TeamRecord::new("b")];
        let matches = vec![outcome(
            1,
            Vec::new(),
            vec![
                score("p1", "a", 100),
                score("p2", "a", 90),
                score("p3", "b", 60),
            ],
        )];
        let award = fair_play(&table, &matches);
        assert_eq!(award.winner.as_deref(), Some("a"));
        let b = award
            .franchises
            .iter()
            .find(|f| f.franchise_id == "b")
            .expect("b played");
        assert_eq!(b.lowering[0].player_id, "p3");
        assert!((b.lowering[0].average_effect - -4.0).abs() < 1e-9);
        let a = award
            .franchises
            .iter()
            .find(|f| f.franchise_id == "a")
            .expect("a played");
        assert_eq!(
            a.lowering.len(),
            1,
            "only the player below the maximum is named"
        );
        assert_eq!(a.lifting.len(), 2);
    }

    #[test]
    fn fair_play_ties_keep_league_table_order() {
        let table = vec![TeamRecord::new("top"), TeamRecord::new("second")];
        let matches = vec![outcome(
            1,
            Vec::new(),
            vec![score("p1", "top", 80), score("p2", "second", 80)],
        )];
        assert_eq!(fair_play(&table, &matches).winner.as_deref(), Some("top"));
    }

    #[test]
    fn a_franchise_with_no_rated_match_cannot_win_fair_play() {
        let table = vec![TeamRecord::new("a")];
        assert_eq!(fair_play(&table, &[]).winner, None);
    }

    #[test]
    fn the_captain_multiplier_lifts_the_most_valuable_player() {
        let mut captain_line = perf("captain", "a", 1);
        captain_line.runs = 10;
        captain_line.balls_faced = 8;
        let mut other_line = perf("other", "b", 1);
        other_line.runs = 12;
        other_line.balls_faced = 8;
        let matches = vec![outcome(1, vec![captain_line, other_line], Vec::new())];
        let squads = vec![
            SquadEntry {
                starting_xi: Some(StartingXi {
                    player_ids: vec!["captain".to_string()],
                    captain_id: "captain".to_string(),
                    vice_captain_id: "x".to_string(),
                }),
                ..squad(
                    "a",
                    Some("guest-a"),
                    "captain",
                    vec![player("captain", Category::Capped)],
                )
            },
            SquadEntry {
                starting_xi: Some(StartingXi {
                    player_ids: vec!["other".to_string()],
                    captain_id: "someone-else".to_string(),
                    vice_captain_id: "x".to_string(),
                }),
                ..squad(
                    "b",
                    Some("guest-b"),
                    "other",
                    vec![player("other", Category::Capped)],
                )
            },
        ];
        let awards = season_awards(&matches, &[], &squads);
        // 10 runs × 1.5 = 15 hundredths-scaled to 1500, beats 12 × 1.0 = 1200.
        assert_eq!(
            awards.most_valuable.winner.map(|line| line.guest_id),
            Some("guest-a".to_string())
        );
    }

    #[test]
    fn emerging_player_only_considers_uncapped_players() {
        let mut star = perf("star", "a", 1);
        star.runs = 80;
        star.balls_faced = 50;
        let mut prospect = perf("prospect", "a", 2);
        prospect.runs = 20;
        prospect.balls_faced = 15;
        let matches = vec![outcome(1, vec![star, prospect], Vec::new())];
        let squads = vec![squad(
            "a",
            None,
            "star",
            vec![
                player("star", Category::Marquee),
                player("prospect", Category::Uncapped),
            ],
        )];
        let awards = season_awards(&matches, &[], &squads);
        assert_eq!(
            awards.emerging.winner.map(|line| line.player_id),
            Some("prospect".to_string())
        );
        assert_eq!(awards.emerging.runner_up, None);
    }
}
