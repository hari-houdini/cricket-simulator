//! System squads and the strongest legal XI (GLOSSARY.md, System squad; docs/game-design.md
//! sections 2 and 4).
//!
//! A franchise with no owner is filled automatically, so every season has all 10 franchises. The
//! same selection gives an owner who saved no XI their default XI.

use crate::models::{Player, Role};
use crate::squad::{MIN_BOWLING_OPTIONS, SQUAD_SIZE, XI_SIZE};

/// Why a system squad cannot be filled from the pool.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SystemSquadError {
    /// No wicket-keeper is left in the pool.
    NoWicketKeeper { franchise_id: String },
    /// Fewer than four bowling options are left in the pool.
    NotEnoughBowlingOptions { franchise_id: String, found: usize },
    /// Fewer than 15 players are left in the pool.
    NotEnoughPlayers { franchise_id: String, found: usize },
}

/// A player's overall strength for ordering. Each rating is 0 to 100, so the sum is 0 to 300.
///
/// @param player - The player to rate.
/// @returns The sum of the batting, bowling and fielding ratings.
fn overall(player: &Player) -> u32 {
    u32::from(player.batting) + u32::from(player.bowling) + u32::from(player.fielding)
}

/// Picks the strongest legal starting XI from a squad.
///
/// The XI has exactly one wicket-keeper, the best four bowling options, and the six strongest
/// remaining non-keepers. It is returned in batting order (best batter first).
///
/// @param squad - The squad to pick from.
/// @returns The 11 player IDs in batting order, or `None` if the squad has no keeper, fewer
///   than four bowling options, or too few non-keepers to make up 11.
pub fn strongest_legal_xi(squad: &[Player]) -> Option<Vec<String>> {
    let keeper = best_by(
        squad
            .iter()
            .filter(|player| player.role == Role::WicketKeeper),
        overall,
    )?;
    let bowlers = top_by(
        squad
            .iter()
            .filter(|player| player.role.is_bowling_option()),
        MIN_BOWLING_OPTIONS,
        |player| u32::from(player.bowling),
    );
    if bowlers.len() < MIN_BOWLING_OPTIONS {
        return None;
    }

    let mut chosen: Vec<&Player> = Vec::with_capacity(XI_SIZE);
    chosen.push(keeper);
    chosen.extend(bowlers);
    let rest_needed = XI_SIZE - chosen.len();
    let rest = top_by(
        squad.iter().filter(|player| {
            player.role != Role::WicketKeeper && !chosen.iter().any(|picked| picked.id == player.id)
        }),
        rest_needed,
        overall,
    );
    if rest.len() < rest_needed {
        return None;
    }
    chosen.extend(rest);

    chosen.sort_by(|a, b| {
        u32::from(b.batting)
            .cmp(&u32::from(a.batting))
            .then_with(|| a.id.cmp(&b.id))
    });
    Some(chosen.into_iter().map(|player| player.id.clone()).collect())
}

/// Fills a system squad from the pool: the strongest keeper, four bowling options, then the ten
/// strongest remaining non-keepers. Players picked are removed from `pool`.
///
/// Picking the keeper and bowlers first guarantees the squad can always form a legal XI.
///
/// @param franchise_id - The franchise with no owner.
/// @param pool - The players still available. Players picked for this squad are removed.
/// @returns The 15 players, in pick order.
/// @throws Returns a {@link SystemSquadError} if the pool cannot supply a legal squad.
pub fn fill_system_squad(
    franchise_id: &str,
    pool: &mut Vec<Player>,
) -> Result<Vec<Player>, SystemSquadError> {
    let keeper_index = best_index(
        pool.iter()
            .enumerate()
            .filter(|(_, player)| player.role == Role::WicketKeeper),
        overall,
    )
    .ok_or_else(|| SystemSquadError::NoWicketKeeper {
        franchise_id: franchise_id.to_string(),
    })?;
    let mut picked = vec![pool.remove(keeper_index)];

    let bowler_indices = top_indices(
        pool.iter()
            .enumerate()
            .filter(|(_, player)| player.role.is_bowling_option()),
        MIN_BOWLING_OPTIONS,
        |player| u32::from(player.bowling),
    );
    if bowler_indices.len() < MIN_BOWLING_OPTIONS {
        return Err(SystemSquadError::NotEnoughBowlingOptions {
            franchise_id: franchise_id.to_string(),
            found: bowler_indices.len(),
        });
    }
    let mut bowler_indices = bowler_indices;
    bowler_indices.sort_unstable_by(|a, b| b.cmp(a));
    for index in bowler_indices {
        picked.push(pool.remove(index));
    }

    let rest_needed = SQUAD_SIZE - picked.len();
    let rest_indices = top_indices(
        pool.iter()
            .enumerate()
            .filter(|(_, player)| player.role != Role::WicketKeeper),
        rest_needed,
        overall,
    );
    if rest_indices.len() < rest_needed {
        return Err(SystemSquadError::NotEnoughPlayers {
            franchise_id: franchise_id.to_string(),
            found: picked.len() + rest_indices.len(),
        });
    }
    let mut rest_indices = rest_indices;
    rest_indices.sort_unstable_by(|a, b| b.cmp(a));
    for index in rest_indices {
        picked.push(pool.remove(index));
    }
    Ok(picked)
}

/// Returns the best item by a key. Ties go to the earlier item.
///
/// @param items - The candidates.
/// @param key - The score; higher is better.
/// @returns The best candidate, or `None` if there are none.
fn best_by<'a, I, F>(items: I, key: F) -> Option<&'a Player>
where
    I: Iterator<Item = &'a Player>,
    F: Fn(&Player) -> u32,
{
    items.max_by(|a, b| key(a).cmp(&key(b)).then_with(|| b.id.cmp(&a.id)))
}

/// Returns the top `count` items by a key, best first. Ties keep the lower ID first.
///
/// @param items - The candidates.
/// @param count - How many to return.
/// @param key - The score; higher is better.
/// @returns Up to `count` candidates.
fn top_by<'a, I, F>(items: I, count: usize, key: F) -> Vec<&'a Player>
where
    I: Iterator<Item = &'a Player>,
    F: Fn(&Player) -> u32,
{
    let mut ranked: Vec<&Player> = items.collect();
    ranked.sort_by(|a, b| key(b).cmp(&key(a)).then_with(|| a.id.cmp(&b.id)));
    ranked.truncate(count);
    ranked
}

/// Returns the index of the best item by a key, from indexed candidates.
///
/// @param items - Candidates paired with their index in the pool.
/// @param key - The score; higher is better.
/// @returns The pool index of the best candidate, or `None` if there are none.
fn best_index<'a, I, F>(items: I, key: F) -> Option<usize>
where
    I: Iterator<Item = (usize, &'a Player)>,
    F: Fn(&Player) -> u32,
{
    items
        .max_by(|(_, a), (_, b)| key(a).cmp(&key(b)).then_with(|| b.id.cmp(&a.id)))
        .map(|(index, _)| index)
}

/// Returns the pool indices of the top `count` items by a key, best first.
///
/// @param items - Candidates paired with their index in the pool.
/// @param count - How many to return.
/// @param key - The score; higher is better.
/// @returns Up to `count` pool indices.
fn top_indices<'a, I, F>(items: I, count: usize, key: F) -> Vec<usize>
where
    I: Iterator<Item = (usize, &'a Player)>,
    F: Fn(&Player) -> u32,
{
    let mut ranked: Vec<(usize, &Player)> = items.collect();
    ranked.sort_by(|(_, a), (_, b)| key(b).cmp(&key(a)).then_with(|| a.id.cmp(&b.id)));
    ranked.truncate(count);
    ranked.into_iter().map(|(index, _)| index).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Category;
    use crate::squad::SQUAD_SIZE;
    use crate::squad::validate_starting_xi;

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

    fn mixed_pool(size: usize) -> Vec<Player> {
        let roles = [
            Role::Batter,
            Role::Bowler,
            Role::AllRounder,
            Role::Batter,
            Role::WicketKeeper,
            Role::Bowler,
        ];
        (0..size)
            .map(|index| {
                player(
                    &format!("p{index:03}"),
                    roles[index % roles.len()],
                    (index % 90) as u8 + 10,
                )
            })
            .collect()
    }

    #[test]
    fn the_strongest_xi_is_legal_and_has_eleven_players() {
        let squad: Vec<Player> = mixed_pool(15);
        let ids = strongest_legal_xi(&squad).expect("a legal XI exists");
        assert_eq!(ids.len(), XI_SIZE);
        validate_starting_xi(&squad, &ids, &ids[0], &ids[1])
            .expect("the XI passes the squad rules");
    }

    #[test]
    fn no_xi_without_a_wicket_keeper() {
        let squad: Vec<Player> = mixed_pool(15)
            .into_iter()
            .filter(|player| player.role != Role::WicketKeeper)
            .collect();
        assert_eq!(strongest_legal_xi(&squad), None);
    }

    #[test]
    fn no_xi_with_too_few_bowling_options() {
        let squad: Vec<Player> = (0..15)
            .map(|index| match index {
                0 => player("wk", Role::WicketKeeper, 50),
                1..=3 => player(&format!("b{index}"), Role::Bowler, 50),
                _ => player(&format!("bat{index}"), Role::Batter, 50),
            })
            .collect();
        assert_eq!(strongest_legal_xi(&squad), None);
    }

    #[test]
    fn a_filled_system_squad_is_fifteen_distinct_players_with_a_legal_xi() {
        let mut pool = mixed_pool(300);
        let squad = fill_system_squad("csk", &mut pool).expect("squad fills");
        assert_eq!(squad.len(), SQUAD_SIZE);
        let mut ids: Vec<&str> = squad.iter().map(|player| player.id.as_str()).collect();
        ids.sort_unstable();
        ids.dedup();
        assert_eq!(ids.len(), SQUAD_SIZE);
        assert!(strongest_legal_xi(&squad).is_some());
    }

    #[test]
    fn filled_players_leave_the_pool() {
        let mut pool = mixed_pool(300);
        let squad = fill_system_squad("csk", &mut pool).expect("squad fills");
        assert_eq!(pool.len(), 300 - SQUAD_SIZE);
        assert!(
            squad
                .iter()
                .all(|picked| !pool.iter().any(|left| left.id == picked.id))
        );
    }

    #[test]
    fn a_pool_without_a_keeper_cannot_fill_a_squad() {
        let mut pool: Vec<Player> = mixed_pool(300)
            .into_iter()
            .filter(|player| player.role != Role::WicketKeeper)
            .collect();
        assert_eq!(
            fill_system_squad("csk", &mut pool),
            Err(SystemSquadError::NoWicketKeeper {
                franchise_id: "csk".to_string()
            })
        );
    }
}
