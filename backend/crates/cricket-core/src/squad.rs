//! Squad and starting XI rules (docs/game-design.md section 4).

use crate::model::{Lakhs, Player, Role};

/// Players drafted by each owner (GLOSSARY.md, Squad).
pub const SQUAD_SIZE: usize = 15;
/// Players in the starting XI (GLOSSARY.md, Starting XI).
pub const XI_SIZE: usize = 11;
/// Each owner's purse at the start of the auction, ₹100cr in lakhs.
pub const PURSE_LAKHS: Lakhs = 10_000;
/// Minimum bowlers and bowling all-rounders in a starting XI.
pub const MIN_BOWLING_OPTIONS: usize = 4;

/// Why a squad or starting XI breaks a rule.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SquadError {
    /// The squad does not have exactly 15 distinct players.
    WrongSquadSize { found: usize },
    /// The same player appears twice.
    DuplicatePlayer(String),
    /// The squad costs more than the purse.
    OverPurse { spent: Lakhs },
    /// The starting XI does not have 11 players.
    WrongXiSize { found: usize },
    /// A starting XI player is not in the squad.
    NotInSquad(String),
    /// The starting XI does not have exactly one wicket-keeper.
    WicketKeeperCount { found: usize },
    /// The starting XI has fewer than 4 bowling options.
    NotEnoughBowlingOptions { found: usize },
    /// The captain or vice-captain is not in the starting XI, or they are the same player.
    InvalidLeadership,
}

/// Checks that a squad has 15 distinct players and fits within the purse.
///
/// @param players - The drafted players.
/// @returns `Ok(())` when the squad is legal.
/// @throws Returns a {@link SquadError} when the size, duplicates or spend break the rules.
pub fn validate_squad(players: &[Player]) -> Result<(), SquadError> {
    if players.len() != SQUAD_SIZE {
        return Err(SquadError::WrongSquadSize {
            found: players.len(),
        });
    }
    for (index, player) in players.iter().enumerate() {
        if players[..index]
            .iter()
            .any(|earlier| earlier.id == player.id)
        {
            return Err(SquadError::DuplicatePlayer(player.id.clone()));
        }
    }
    let spent = total_spent(players);
    if spent > PURSE_LAKHS {
        return Err(SquadError::OverPurse { spent });
    }
    Ok(())
}

/// Adds up the base-price cost of a set of players.
///
/// @param players - The players to total.
/// @returns The sum of their base prices in lakhs.
pub fn total_spent(players: &[Player]) -> Lakhs {
    players.iter().map(|player| player.base_price).sum()
}

/// Checks a starting XI against the rules in `docs/game-design.md` section 4.
///
/// @param squad - The owner's squad.
/// @param xi_ids - The 11 player IDs in the starting XI.
/// @param captain_id - The captain, who must be in the XI.
/// @param vice_captain_id - The vice-captain, who must be in the XI and differ from the captain.
/// @returns `Ok(())` when the XI is legal.
/// @throws Returns a {@link SquadError} for the first rule that fails.
pub fn validate_starting_xi(
    squad: &[Player],
    xi_ids: &[String],
    captain_id: &str,
    vice_captain_id: &str,
) -> Result<(), SquadError> {
    if xi_ids.len() != XI_SIZE {
        return Err(SquadError::WrongXiSize {
            found: xi_ids.len(),
        });
    }
    for (index, id) in xi_ids.iter().enumerate() {
        if xi_ids[..index].contains(id) {
            return Err(SquadError::DuplicatePlayer(id.clone()));
        }
        if !squad.iter().any(|player| &player.id == id) {
            return Err(SquadError::NotInSquad(id.clone()));
        }
    }

    let xi: Vec<&Player> = squad
        .iter()
        .filter(|player| xi_ids.contains(&player.id))
        .collect();

    let keepers = xi
        .iter()
        .filter(|player| player.role == Role::WicketKeeper)
        .count();
    if keepers != 1 {
        return Err(SquadError::WicketKeeperCount { found: keepers });
    }

    let bowling_options = xi
        .iter()
        .filter(|player| player.role.is_bowling_option())
        .count();
    if bowling_options < MIN_BOWLING_OPTIONS {
        return Err(SquadError::NotEnoughBowlingOptions {
            found: bowling_options,
        });
    }

    let leaders_in_xi =
        xi_ids.iter().any(|id| id == captain_id) && xi_ids.iter().any(|id| id == vice_captain_id);
    if !leaders_in_xi || captain_id == vice_captain_id {
        return Err(SquadError::InvalidLeadership);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::Category;

    fn player(id: &str, role: Role, base_price: Lakhs) -> Player {
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
            base_price,
            trouble_rating: 0,
        }
    }

    /// 15 players: 1 keeper, 4 bowlers, 2 all-rounders, 8 batters.
    fn legal_squad() -> Vec<Player> {
        let mut players = vec![player("wk", Role::WicketKeeper, 100)];
        for index in 0..4 {
            players.push(player(&format!("bowler-{index}"), Role::Bowler, 100));
        }
        for index in 0..2 {
            players.push(player(&format!("ar-{index}"), Role::AllRounder, 100));
        }
        for index in 0..8 {
            players.push(player(&format!("bat-{index}"), Role::Batter, 100));
        }
        players
    }

    fn legal_xi_ids() -> Vec<String> {
        // wk, 4 bowlers, 2 all-rounders, 4 batters.
        let mut ids = vec!["wk".to_string()];
        ids.extend((0..4).map(|index| format!("bowler-{index}")));
        ids.extend((0..2).map(|index| format!("ar-{index}")));
        ids.extend((0..4).map(|index| format!("bat-{index}")));
        ids
    }

    #[test]
    fn accepts_a_legal_squad() {
        assert_eq!(validate_squad(&legal_squad()), Ok(()));
    }

    #[test]
    fn rejects_a_squad_that_is_not_fifteen() {
        let mut squad = legal_squad();
        squad.pop();
        assert_eq!(
            validate_squad(&squad),
            Err(SquadError::WrongSquadSize { found: 14 })
        );
    }

    #[test]
    fn rejects_a_duplicate_player() {
        let mut squad = legal_squad();
        squad[1] = squad[0].clone();
        assert_eq!(
            validate_squad(&squad),
            Err(SquadError::DuplicatePlayer("wk".to_string()))
        );
    }

    #[test]
    fn rejects_a_squad_over_the_purse() {
        let mut squad = legal_squad();
        squad[0].base_price = PURSE_LAKHS;
        assert_eq!(
            validate_squad(&squad),
            Err(SquadError::OverPurse {
                spent: PURSE_LAKHS + 1400
            })
        );
    }

    #[test]
    fn accepts_a_legal_xi() {
        assert_eq!(
            validate_starting_xi(&legal_squad(), &legal_xi_ids(), "bat-0", "bat-1"),
            Ok(())
        );
    }

    #[test]
    fn rejects_an_xi_without_a_wicket_keeper() {
        let mut ids = legal_xi_ids();
        ids[0] = "bat-7".to_string();
        assert_eq!(
            validate_starting_xi(&legal_squad(), &ids, "bat-0", "bat-1"),
            Err(SquadError::WicketKeeperCount { found: 0 })
        );
    }

    #[test]
    fn rejects_an_xi_with_fewer_than_four_bowling_options() {
        // Swap one bowler and both all-rounders for batters: 3 bowling options left.
        let mut ids = legal_xi_ids();
        ids[1] = "bat-6".to_string();
        ids[5] = "bat-7".to_string();
        ids[6] = "bat-5".to_string();
        assert_eq!(
            validate_starting_xi(&legal_squad(), &ids, "bat-0", "bat-1"),
            Err(SquadError::NotEnoughBowlingOptions { found: 3 })
        );
    }

    #[test]
    fn rejects_a_player_outside_the_squad() {
        let mut ids = legal_xi_ids();
        ids[10] = "stranger".to_string();
        assert_eq!(
            validate_starting_xi(&legal_squad(), &ids, "bat-0", "bat-1"),
            Err(SquadError::NotInSquad("stranger".to_string()))
        );
    }

    #[test]
    fn rejects_a_captain_outside_the_xi() {
        assert_eq!(
            validate_starting_xi(&legal_squad(), &legal_xi_ids(), "nobody", "bat-1"),
            Err(SquadError::InvalidLeadership)
        );
    }

    #[test]
    fn rejects_captain_and_vice_captain_being_the_same() {
        assert_eq!(
            validate_starting_xi(&legal_squad(), &legal_xi_ids(), "bat-0", "bat-0"),
            Err(SquadError::InvalidLeadership)
        );
    }
}
