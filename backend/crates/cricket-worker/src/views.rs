//! Projections from the lobby's state to the wire types in `api`. Nothing here changes the
//! lobby. Each projection checks the phase the frontend expects, and refuses with the same
//! error the mock throws when the data is not there yet.

use std::collections::HashMap;

use cricket_core::auction::{Auction, LotOutcome, next_bid};
use cricket_core::awards::{self, FairPlayAward, Podium};
use cricket_core::lobby::{Lobby, Phase};
use cricket_core::match_simulator::MatchOutcome;
use cricket_core::performance::FallOfWicket;
use cricket_core::playoffs::{PLAYOFF_MATCHES, QUALIFIER_1_ROUND};
use cricket_core::standings::FranchiseRecord;

use crate::api::{
    AuctionDto, AwardsDto, BidLogDto, FairPlayDto, FairPlayFranchiseDto, FairPlayLineDto,
    FixtureDto, HighBidDto, KeyMomentDto, LeagueDto, LobbyDto, LotDto, ManOfTheMatchDto, MatchDto,
    MatchScoreDto, OwnerAwardLineDto, OwnerDto, PairDto, PlayerAwardLineDto, PlayoffResultDto,
    PlayoffSlotDto, PlayoffsDto, PurseDto, SoldDto, SquadDto, StandingDto, StartingXiDto,
};
use crate::errors::ApiError;

/// The lobby as `lobbySchema` describes it.
///
/// @param lobby - The lobby.
/// @returns The lobby DTO.
pub fn lobby(lobby: &Lobby) -> LobbyDto {
    let phase = match lobby.phase() {
        Phase::Waiting | Phase::Auction => "auction",
        Phase::League => "league",
        Phase::Playoffs => "playoffs",
        Phase::Complete => "complete",
    };
    let auction_status = match lobby.auction() {
        None => "waiting",
        Some(auction) if auction.is_complete() => "complete",
        Some(_) => "running",
    };
    LobbyDto {
        id: lobby.id.clone(),
        code: lobby.id.clone(),
        name: lobby.name.clone(),
        phase: phase.to_string(),
        auction_status: auction_status.to_string(),
        round: lobby.round(),
        owners: lobby
            .members()
            .iter()
            .map(|member| OwnerDto {
                guest_id: member.guest_id.clone(),
                display_name: member.display_name.clone(),
                franchise_id: lobby
                    .claims()
                    .iter()
                    .find(|claim| claim.guest_id == member.guest_id)
                    .map(|claim| claim.franchise_id.clone()),
            })
            .collect(),
        seed_version: lobby.seed_version.clone(),
    }
}

/// The auction as `auctionSchema` describes it.
///
/// @param lobby - The lobby.
/// @returns The auction DTO.
/// @throws Returns a 409 `AuctionNotStartedError` before the owner starts the auction.
pub fn auction(lobby: &Lobby) -> Result<AuctionDto, ApiError> {
    let auction = lobby
        .auction()
        .ok_or_else(|| ApiError::new(409, "AuctionNotStartedError"))?;
    let names = Names::of(lobby);
    Ok(AuctionDto {
        lobby_code: lobby.id.clone(),
        status: if auction.is_complete() {
            "complete"
        } else {
            "running"
        }
        .to_string(),
        lot: lot(auction, &names),
        remaining: auction.remaining() as u32,
        sold: auction
            .outcomes()
            .iter()
            .filter_map(|outcome| match outcome {
                LotOutcome::Sold {
                    guest_id,
                    player,
                    price,
                    ..
                } => Some(SoldDto {
                    player: player.clone(),
                    guest_id: guest_id.clone(),
                    display_name: names.guest(guest_id),
                    amount_lakhs: *price,
                }),
                LotOutcome::Unsold { .. } => None,
            })
            .collect(),
        unsold: auction.unsold().to_vec(),
        log: auction
            .bid_log()
            .iter()
            .map(|entry| BidLogDto {
                sequence: entry.sequence,
                player_name: entry.player_name.clone(),
                guest_id: entry.guest_id.clone(),
                display_name: names.guest(&entry.guest_id),
                amount_lakhs: entry.amount,
                at: entry.at_ms,
            })
            .collect(),
        purses: auction
            .owners()
            .iter()
            .map(|owner| PurseDto {
                guest_id: owner.guest_id.clone(),
                display_name: names.guest(&owner.guest_id),
                purse_lakhs: owner.purse_remaining,
                squad: owner.squad.clone(),
            })
            .collect(),
    })
}

/// The open lot, with the minimum next bid the UI may offer.
///
/// @param auction - The auction.
/// @param names - Guest names.
/// @returns The lot, or `None` between lots.
fn lot(auction: &Auction, names: &Names) -> Option<LotDto> {
    let open = auction.current_lot()?;
    Some(LotDto {
        player: open.player.clone(),
        high_bid: open.leader.as_ref().map(|bid| HighBidDto {
            guest_id: bid.guest_id.clone(),
            display_name: names.guest(&bid.guest_id),
            amount_lakhs: bid.amount,
        }),
        minimum_bid_lakhs: next_bid(
            open.leader.as_ref().map(|bid| bid.amount),
            open.player.base_price,
        ),
        ends_at: open.deadline_ms,
    })
}

/// One owner's squad as `squadSchema` describes it.
///
/// @param lobby - The lobby.
/// @param guest_id - The owner.
/// @returns The squad DTO.
/// @throws Returns a 409 `SquadNotReadyError` before the auction ends, and a 403 `NotAnOwnerError` for a guest with no squad.
pub fn squad(lobby: &Lobby, guest_id: &str) -> Result<SquadDto, ApiError> {
    if lobby.squads().is_empty() {
        return Err(ApiError::new(409, "SquadNotReadyError"));
    }
    let entry = lobby
        .squads()
        .iter()
        .find(|entry| entry.owner_guest_id.as_deref() == Some(guest_id))
        .ok_or_else(|| ApiError::new(403, "NotAnOwnerError"))?;
    Ok(SquadDto {
        guest_id: guest_id.to_string(),
        players: entry.players.clone(),
        starting_xi: entry.starting_xi.as_ref().map(|xi| StartingXiDto {
            player_ids: xi.player_ids.clone(),
            captain_id: xi.captain_id.clone(),
            vice_captain_id: xi.vice_captain_id.clone(),
        }),
        locked: !lobby.league().is_empty(),
        substitution_used: entry.substitution_used,
    })
}

/// The league as `leagueSchema` describes it.
///
/// @param lobby - The lobby.
/// @returns The league DTO.
/// @throws Returns a 409 `LeagueNotStartedError` until the auction has ended.
pub fn league(lobby: &Lobby) -> Result<LeagueDto, ApiError> {
    if lobby.schedule().is_empty() {
        return Err(ApiError::new(409, "LeagueNotStartedError"));
    }
    let fixtures = lobby
        .schedule()
        .iter()
        .map(|fixture| FixtureDto {
            round: fixture.round,
            home_franchise_id: fixture.home_franchise_id.clone(),
            away_franchise_id: fixture.away_franchise_id.clone(),
            result: lobby
                .league()
                .iter()
                .find(|played| {
                    played.round == fixture.round
                        && played.home_id == fixture.home_franchise_id
                        && played.away_id == fixture.away_franchise_id
                })
                .map(score),
        })
        .collect();
    Ok(LeagueDto {
        round: lobby.round(),
        fixtures,
        standings: lobby.table().iter().map(standing).collect(),
        league_complete: matches!(lobby.phase(), Phase::Playoffs | Phase::Complete),
    })
}

/// One table row as `standingSchema` describes it.
///
/// @param record - The franchise's record.
/// @returns The standing DTO.
fn standing(record: &FranchiseRecord) -> StandingDto {
    StandingDto {
        franchise_id: record.franchise_id.clone(),
        played: record.played,
        won: record.won,
        tied: record.tied,
        lost: record.lost,
        points: record.points,
        runs_for: record.runs_for,
        runs_against: record.runs_against,
        net_run_rate: record.net_run_rate(),
    }
}

/// The score of a match as `matchScoreSchema` describes it. Only the two regular innings count.
///
/// @param outcome - The match.
/// @returns The score.
pub fn score(outcome: &MatchOutcome) -> MatchScoreDto {
    let regular = &outcome.innings[..outcome.innings.len().min(2)];
    let for_side = |franchise: &str| {
        regular
            .iter()
            .find(|innings| innings.batting_franchise_id == franchise)
            .map_or((0, 0), |innings| {
                (innings.total_runs, innings.total_wickets)
            })
    };
    let (home_runs, home_wickets) = for_side(&outcome.home_id);
    let (away_runs, away_wickets) = for_side(&outcome.away_id);
    MatchScoreDto {
        home_runs,
        home_wickets,
        away_runs,
        away_wickets,
        winner_franchise_id: outcome.winner_id.clone(),
    }
}

/// The league table, best first, as `standingsSchema` describes it.
///
/// @param lobby - The lobby.
/// @returns One row per franchise.
/// @throws Returns a 409 `LeagueNotStartedError` until the auction has ended.
pub fn standings(lobby: &Lobby) -> Result<Vec<StandingDto>, ApiError> {
    if lobby.schedule().is_empty() {
        return Err(ApiError::new(409, "LeagueNotStartedError"));
    }
    Ok(lobby.table().iter().map(standing).collect())
}

/// One played league match, as `matchSchema` describes it. Its ID is the one the frontend and the
/// mock use, so a match read in one mode can be read in the other.
///
/// @param lobby - The lobby.
/// @param match_id - The match ID, such as `r03-csk-mi`.
/// @returns The match DTO.
/// @throws Returns a 409 `LeagueNotStartedError` before the auction ends, and a 404
///   `MatchNotFoundError` when no played league match has the ID.
pub fn played_match(lobby: &Lobby, match_id: &str) -> Result<MatchDto, ApiError> {
    if lobby.schedule().is_empty() {
        return Err(ApiError::new(409, "LeagueNotStartedError"));
    }
    let outcome = lobby
        .league()
        .iter()
        .find(|played| played.id == match_id)
        .ok_or_else(|| ApiError::new(404, "MatchNotFoundError"))?;
    Ok(MatchDto {
        id: outcome.id.clone(),
        round: outcome.round,
        home_franchise_id: outcome.home_id.clone(),
        away_franchise_id: outcome.away_id.clone(),
        result: score(outcome),
    })
}

/// The playoff bracket as `playoffsSchema` describes it. Franchises are `null` until they are known.
///
/// @param lobby - The lobby.
/// @returns The bracket DTO.
/// @throws Returns a 409 `AuctionNotStartedError` before the auction starts.
pub fn playoffs(lobby: &Lobby) -> Result<PlayoffsDto, ApiError> {
    if lobby.auction().is_none() {
        return Err(ApiError::new(409, "AuctionNotStartedError"));
    }
    let table = lobby.table();
    let seed = |position: usize| {
        table
            .get(position)
            .map(|record| record.franchise_id.clone())
    };
    let played: &[MatchOutcome] = lobby.bracket().map_or(&[], |bracket| bracket.matches());
    let winner = |index: usize| played.get(index).and_then(|m| m.winner_id.clone());
    let loser = |index: usize| {
        played.get(index).and_then(|m| {
            let won = m.winner_id.as_deref()?;
            Some(if won == m.home_id {
                m.away_id.clone()
            } else {
                m.home_id.clone()
            })
        })
    };
    // Known from the table once the bracket exists. Later slots depend on earlier results.
    let has_bracket = lobby.bracket().is_some();
    let franchises = [
        (
            has_bracket.then(|| seed(0)).flatten(),
            has_bracket.then(|| seed(1)).flatten(),
        ),
        (
            has_bracket.then(|| seed(2)).flatten(),
            has_bracket.then(|| seed(3)).flatten(),
        ),
        (loser(0), winner(1)),
        (winner(0), winner(2)),
    ];
    const SLOTS: [&str; PLAYOFF_MATCHES] = ["qualifier-1", "eliminator", "qualifier-2", "final"];
    let matches = SLOTS
        .iter()
        .enumerate()
        .map(|(index, slot)| {
            let (home, away) = franchises[index].clone();
            PlayoffSlotDto {
                slot: slot.to_string(),
                round: QUALIFIER_1_ROUND + index as u32,
                home_franchise_id: home,
                away_franchise_id: away,
                result: played.get(index).map(playoff_result),
            }
        })
        .collect();
    Ok(PlayoffsDto {
        matches,
        champion: lobby.champion().map(str::to_string),
    })
}

/// A played playoff match as `playoffResultSchema` describes it.
///
/// @param outcome - The match.
/// @returns The result DTO.
fn playoff_result(outcome: &MatchOutcome) -> PlayoffResultDto {
    let mut key_moments: Vec<KeyMomentDto> = outcome
        .fall_of_wickets
        .iter()
        .filter(|fallen| fallen.innings <= 2)
        .map(wicket_moment)
        .collect();
    key_moments.push(KeyMomentDto::Result {
        winner_franchise_id: outcome.winner_id.clone(),
    });
    PlayoffResultDto {
        home_franchise_id: outcome.home_id.clone(),
        away_franchise_id: outcome.away_id.clone(),
        winner_franchise_id: outcome.winner_id.clone().unwrap_or_default(),
        super_over: outcome.innings.len() > 2,
        score: score(outcome),
        key_moments,
    }
}

/// A wicket as a key moment.
///
/// @param fallen - The wicket.
/// @returns The key moment.
fn wicket_moment(fallen: &FallOfWicket) -> KeyMomentDto {
    KeyMomentDto::Wicket {
        innings: fallen.innings,
        wicket_number: fallen.wicket_number,
        batting_franchise_id: fallen.batting_franchise_id.clone(),
    }
}

/// The awards as `awardsSchema` describes them.
///
/// @param lobby - The lobby.
/// @returns The awards DTO.
/// @throws Returns a 409 `AuctionNotStartedError` before the auction starts.
pub fn awards(lobby: &Lobby) -> Result<AwardsDto, ApiError> {
    if lobby.auction().is_none() {
        return Err(ApiError::new(409, "AuctionNotStartedError"));
    }
    let names = Names::of(lobby);
    let season = awards::season_awards(&lobby.played_matches(), &lobby.table(), lobby.squads());
    Ok(AwardsDto {
        season_complete: lobby.phase() == Phase::Complete,
        orange_cap: pair(season.orange_cap, |line| player_line(line, &names)),
        purple_cap: pair(season.purple_cap, |line| player_line(line, &names)),
        most_valuable: pair(season.most_valuable, |line| OwnerAwardLineDto {
            display_name: names.guest(&line.guest_id),
            guest_id: line.guest_id,
            franchise_id: line.franchise_id,
            fantasy_points: line.points_hundredths as f64 / 100.0,
        }),
        emerging: pair(season.emerging, |line| player_line(line, &names)),
        fair_play: fair_play(season.fair_play, &names),
        man_of_the_match: season
            .man_of_the_match
            .into_iter()
            .map(|pick| ManOfTheMatchDto {
                round: pick.round,
                home_franchise_id: pick.home_id,
                away_franchise_id: pick.away_id,
                name: names.player(&pick.player_id),
                player_id: pick.player_id,
                franchise_id: pick.franchise_id,
            })
            .collect(),
    })
}

/// Converts a podium, converting each place.
///
/// @param podium - The core podium.
/// @param convert - Converts one place.
/// @returns The wire pair.
fn pair<T, U>(podium: Podium<T>, convert: impl Fn(T) -> U) -> PairDto<U> {
    PairDto {
        winner: podium.winner.map(&convert),
        runner_up: podium.runner_up.map(&convert),
    }
}

/// A season player line with the player's name.
///
/// @param line - The core line.
/// @param names - Player and guest names.
/// @returns The wire line.
fn player_line(line: cricket_core::awards::SeasonLine, names: &Names) -> PlayerAwardLineDto {
    PlayerAwardLineDto {
        name: names.player(&line.player_id),
        player_id: line.player_id,
        franchise_id: line.franchise_id,
        innings: line.innings,
        runs: line.runs,
        wickets: line.wickets,
        runs_conceded: line.runs_conceded,
        fantasy_points: line.fantasy_points,
    }
}

/// The Fair Play award as `fairPlaySchema` describes it.
///
/// @param award - The core award.
/// @param names - Player names.
/// @returns The wire award.
fn fair_play(award: FairPlayAward, names: &Names) -> FairPlayDto {
    FairPlayDto {
        winner_franchise_id: award.winner,
        franchises: award
            .franchises
            .into_iter()
            .map(|franchise| FairPlayFranchiseDto {
                franchise_id: franchise.franchise_id,
                standing: franchise.standing,
                lowering: effect_lines(franchise.lowering, names),
                lifting: effect_lines(franchise.lifting, names),
            })
            .collect(),
    }
}

/// Converts a column of player effects.
///
/// @param effects - The core effects.
/// @param names - Player names.
/// @returns The wire lines.
fn effect_lines(effects: Vec<awards::PlayerEffect>, names: &Names) -> Vec<FairPlayLineDto> {
    effects
        .into_iter()
        .map(|effect| FairPlayLineDto {
            name: names.player(&effect.player_id),
            player_id: effect.player_id,
            average_effect: effect.average_effect,
        })
        .collect()
}

/// Lookups from IDs to the names the UI shows.
struct Names {
    guests: HashMap<String, String>,
    players: HashMap<String, String>,
}

impl Names {
    /// Collects every guest and player name in the lobby.
    ///
    /// @param lobby - The lobby.
    /// @returns The lookups.
    fn of(lobby: &Lobby) -> Self {
        Self {
            guests: lobby
                .members()
                .iter()
                .map(|member| (member.guest_id.clone(), member.display_name.clone()))
                .collect(),
            players: lobby
                .squads()
                .iter()
                .flat_map(|entry| &entry.players)
                .map(|player| (player.id.clone(), player.name.clone()))
                .collect(),
        }
    }

    /// A guest's display name, or the guest ID if the guest left no name.
    ///
    /// @param guest_id - The guest.
    /// @returns The name.
    fn guest(&self, guest_id: &str) -> String {
        self.guests
            .get(guest_id)
            .cloned()
            .unwrap_or_else(|| guest_id.to_string())
    }

    /// A player's name, or the player ID if the player is not in a squad.
    ///
    /// @param player_id - The player.
    /// @returns The name.
    fn player(&self, player_id: &str) -> String {
        self.players
            .get(player_id)
            .cloned()
            .unwrap_or_else(|| player_id.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_lobby_in_the_waiting_room_reports_the_auction_phase_and_waiting_status() {
        let lobby = Lobby::new("ABC123", "Test", "1.1.0", Vec::new(), Vec::new());
        let dto = self::lobby(&lobby);
        assert_eq!(dto.phase, "auction");
        assert_eq!(dto.auction_status, "waiting");
        assert_eq!(dto.round, 0);
    }

    #[test]
    fn reads_before_the_auction_are_refused_with_the_frontend_error_names() {
        let lobby = Lobby::new("ABC123", "Test", "1.1.0", Vec::new(), Vec::new());
        assert_eq!(auction(&lobby).unwrap_err().name, "AuctionNotStartedError");
        assert_eq!(league(&lobby).unwrap_err().name, "LeagueNotStartedError");
        assert_eq!(playoffs(&lobby).unwrap_err().name, "AuctionNotStartedError");
        assert_eq!(squad(&lobby, "g").unwrap_err().name, "SquadNotReadyError");
    }
}
