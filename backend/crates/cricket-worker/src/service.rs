//! The lobby service: one command in, one state change and a list of events out.
//!
//! This module is plain Rust with no Cloudflare types, so the whole season can be tested on
//! the host. The Durable Object in `durable.rs` loads the lobby, calls {@link apply}, saves
//! the result, sends the events, and sets the next alarm. Nothing here reads a clock: the
//! caller passes `now_ms`.

use cricket_core::auction::LotOutcome;
use cricket_core::lobby::{Lobby, LobbyError, Phase};
use cricket_core::model::{Franchise, Player};
use cricket_core::schedule::Fixture;
use cricket_core::seed_data::{parse_franchises, parse_players, parse_schedule};
use cricket_core::simulator::{MatchOutcome, ModifierConfig};
use serde::{Deserialize, Serialize};

/// Time between league rounds and playoff matches, in milliseconds.
///
/// `docs/game-design.md` section 6 asks for league matches in 1 to 2 seconds. Each step plays a
/// whole round, so this is a round interval, not a per-match one. It is tunable.
pub const ROUND_INTERVAL_MS: u64 = 2_000;

/// The seed data a lobby is created from. It is parsed once and shared by every command.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Seeds {
    /// Seed version recorded on the lobby (GLOSSARY.md, Seed file).
    pub seed_version: String,
    /// The 10 franchise IDs.
    pub franchise_ids: Vec<String>,
    /// The player pool.
    pub players: Vec<Player>,
    /// The league template.
    pub template: Vec<Fixture>,
}

impl Seeds {
    /// Parses the three seed files.
    ///
    /// @param players_json - Contents of `players.v1.json`.
    /// @param franchises_json - Contents of `franchises.v1.json`.
    /// @param schedule_json - Contents of `ipl-schedule.v1.json`.
    /// @returns The parsed seeds. The players' seed version is used for the lobby.
    /// @throws Returns a `serde_json::Error` if any file does not match its shape.
    pub fn parse(
        players_json: &str,
        franchises_json: &str,
        schedule_json: &str,
    ) -> Result<Self, serde_json::Error> {
        let players = parse_players(players_json)?;
        let franchises: Vec<Franchise> = parse_franchises(franchises_json)?.franchises;
        let schedule = parse_schedule(schedule_json)?;
        Ok(Self {
            seed_version: players.seed_version,
            franchise_ids: franchises
                .into_iter()
                .map(|franchise| franchise.id)
                .collect(),
            players: players.players,
            template: schedule.league,
        })
    }
}

/// A request to change a lobby. This is the internal command set; phase 3 exposes it as HTTP.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum Command {
    /// A guest claims a franchise.
    ClaimFranchise {
        guest_id: String,
        franchise_id: String,
    },
    /// A guest connects or disconnects.
    SetConnected { guest_id: String, connected: bool },
    /// The owners start the auction.
    StartAuction,
    /// An owner bids on the open lot.
    PlaceBid { guest_id: String, amount: u32 },
    /// An owner passes on the open lot.
    PassLot { guest_id: String },
    /// An owner sets their starting XI.
    SetStartingXi {
        guest_id: String,
        player_ids: Vec<String>,
        captain_id: String,
        vice_captain_id: String,
    },
    /// Everyone is ready and the league starts.
    StartLeague,
    /// The alarm fired. The lobby advances its clock, or its season, depending on the phase.
    Alarm,
}

/// Something that happened, sent to every connected guest.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum LobbyEvent {
    /// The lobby moved to another phase.
    PhaseChanged { phase: Phase },
    /// A lot closed, as a sale or as unsold.
    LotClosed { outcome: LotOutcome },
    /// Matches were played in one step of the season.
    MatchesPlayed { matches: Vec<MatchOutcome> },
}

/// What a command produced.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Outcome {
    /// Events to send, in order.
    pub events: Vec<LobbyEvent>,
    /// When the next alarm should fire, in milliseconds, or `None` when the lobby needs no more
    /// time-driven steps.
    pub next_wake_ms: Option<u64>,
}

/// Creates a lobby from the seeds.
///
/// @param id - The lobby identifier.
/// @param seeds - The parsed seed data.
/// @returns A lobby in the waiting phase.
pub fn create_lobby(id: &str, seeds: &Seeds) -> Lobby {
    Lobby::new(id, &seeds.seed_version, seeds.franchise_ids.clone())
}

/// Applies one command to a lobby.
///
/// @param lobby - The lobby to change. Updated in place when the command succeeds.
/// @param command - The command to apply.
/// @param now_ms - The current time, in milliseconds since the epoch.
/// @param seeds - The seed data, used by `StartAuction` and `StartLeague`.
/// @param config - The ball model parameters, used when the season advances.
/// @returns The events and the next alarm time.
/// @throws Returns a {@link LobbyError} if the lobby refuses the command. The lobby is left as it was.
pub fn apply(
    lobby: &mut Lobby,
    command: Command,
    now_ms: u64,
    seeds: &Seeds,
    config: &ModifierConfig,
) -> Result<Outcome, LobbyError> {
    // Work on a copy so a refused command leaves the stored lobby untouched.
    let mut next = lobby.clone();
    let before = next.phase();
    let mut events = Vec::new();

    match command {
        Command::ClaimFranchise {
            guest_id,
            franchise_id,
        } => {
            next.claim_franchise(&guest_id, &franchise_id)?;
        }
        Command::SetConnected {
            guest_id,
            connected,
        } => {
            events.extend(lot_events(next.set_connected(&guest_id, connected)?));
        }
        Command::StartAuction => {
            events.extend(lot_events(
                next.start_auction(seeds.players.clone(), now_ms)?,
            ));
        }
        Command::PlaceBid { guest_id, amount } => {
            next.place_bid(&guest_id, amount, now_ms)?;
        }
        Command::PassLot { guest_id } => {
            events.extend(lot_events(next.pass_lot(&guest_id, now_ms)?));
        }
        Command::SetStartingXi {
            guest_id,
            player_ids,
            captain_id,
            vice_captain_id,
        } => {
            next.set_starting_xi(&guest_id, player_ids, &captain_id, &vice_captain_id)?;
        }
        Command::StartLeague => {
            next.start_league(&seeds.template)?;
        }
        Command::Alarm => match next.phase() {
            Phase::Auction => events.extend(lot_events(next.tick(now_ms)?)),
            Phase::League | Phase::Playoffs => {
                let matches = next.advance(config)?;
                events.push(LobbyEvent::MatchesPlayed { matches });
            }
            Phase::Waiting | Phase::Complete => {}
        },
    }

    if next.phase() != before {
        events.insert(
            0,
            LobbyEvent::PhaseChanged {
                phase: next.phase(),
            },
        );
    }
    let next_wake_ms = next_wake(&next, now_ms);
    *lobby = next;
    Ok(Outcome {
        events,
        next_wake_ms,
    })
}

/// Turns closed lots into events.
///
/// @param outcomes - The lots closed by one command.
/// @returns One `LotClosed` event per lot.
fn lot_events(outcomes: Vec<LotOutcome>) -> Vec<LobbyEvent> {
    outcomes
        .into_iter()
        .map(|outcome| LobbyEvent::LotClosed { outcome })
        .collect()
}

/// Works out when the lobby next needs to act on its own.
///
/// During the auction that is the open lot's deadline. During the season it is one round
/// interval after `now_ms`. Otherwise the lobby waits for guests.
///
/// @param lobby - The lobby after the command.
/// @param now_ms - The current time, in milliseconds.
/// @returns The alarm time, or `None`.
fn next_wake(lobby: &Lobby, now_ms: u64) -> Option<u64> {
    match lobby.phase() {
        Phase::Auction => lobby
            .auction()
            .and_then(|auction| auction.current_lot())
            .map(|lot| lot.deadline_ms.max(now_ms)),
        Phase::League | Phase::Playoffs => Some(now_ms + ROUND_INTERVAL_MS),
        Phase::Waiting | Phase::Complete => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const PLAYERS: &str = include_str!("../../../../data/seeds/players.v1.json");
    const FRANCHISES: &str = include_str!("../../../../data/seeds/franchises.v1.json");
    const SCHEDULE: &str = include_str!("../../../../data/seeds/ipl-schedule.v1.json");

    fn seeds() -> Seeds {
        Seeds::parse(PLAYERS, FRANCHISES, SCHEDULE).expect("seeds parse")
    }

    /// Runs alarms until the lobby stops asking for them, and returns every event from the run.
    fn run_alarms(lobby: &mut Lobby, seeds: &Seeds, mut now: u64) -> Vec<LobbyEvent> {
        let config = ModifierConfig::default();
        let mut events = Vec::new();
        for _ in 0..10_000 {
            let outcome = apply(lobby, Command::Alarm, now, seeds, &config).expect("alarm applies");
            events.extend(outcome.events);
            match outcome.next_wake_ms {
                Some(next) => now = next,
                None => break,
            }
        }
        events
    }

    #[test]
    fn parsing_the_seeds_gives_ten_franchises_and_the_league_template() {
        let seeds = seeds();
        assert_eq!(seeds.franchise_ids.len(), 10);
        assert_eq!(seeds.template.len(), 70);
        assert_eq!(seeds.players.len(), 300);
    }

    #[test]
    fn the_auction_alarm_follows_the_open_lot_deadline() {
        let seeds = seeds();
        let config = ModifierConfig::default();
        let mut lobby = create_lobby("lobby-alarm", &seeds);
        apply(
            &mut lobby,
            Command::ClaimFranchise {
                guest_id: "g".into(),
                franchise_id: "csk".into(),
            },
            0,
            &seeds,
            &config,
        )
        .expect("claim");
        let started = apply(&mut lobby, Command::StartAuction, 1_000, &seeds, &config)
            .expect("auction starts");
        assert_eq!(started.next_wake_ms, Some(1_000 + 5_000));
        assert!(matches!(
            started.events.first(),
            Some(LobbyEvent::PhaseChanged {
                phase: Phase::Auction
            })
        ));
    }

    #[test]
    fn a_refused_command_leaves_the_lobby_unchanged() {
        let seeds = seeds();
        let config = ModifierConfig::default();
        let mut lobby = create_lobby("lobby-refuse", &seeds);
        apply(
            &mut lobby,
            Command::ClaimFranchise {
                guest_id: "g".into(),
                franchise_id: "csk".into(),
            },
            0,
            &seeds,
            &config,
        )
        .expect("claim");
        let before = lobby.clone();
        let refused = apply(
            &mut lobby,
            Command::PlaceBid {
                guest_id: "g".into(),
                amount: 1,
            },
            0,
            &seeds,
            &config,
        );
        assert!(refused.is_err());
        assert_eq!(lobby, before);
    }

    #[test]
    fn with_no_bids_the_whole_season_runs_on_alarms_to_a_champion() {
        let seeds = seeds();
        let config = ModifierConfig::default();
        let mut lobby = create_lobby("lobby-season", &seeds);
        apply(
            &mut lobby,
            Command::ClaimFranchise {
                guest_id: "g".into(),
                franchise_id: "csk".into(),
            },
            0,
            &seeds,
            &config,
        )
        .expect("claim");
        apply(&mut lobby, Command::StartAuction, 0, &seeds, &config).expect("auction starts");

        let auction_events = run_alarms(&mut lobby, &seeds, 5_000);
        assert_eq!(lobby.phase(), Phase::Auction);
        assert!(
            auction_events
                .iter()
                .all(|event| matches!(event, LobbyEvent::LotClosed { .. }))
        );

        // Owners with no squad are removed when the pool runs out, so every franchise is a
        // system squad with an XI. The league can start straight away.
        apply(&mut lobby, Command::StartLeague, 1_000_000, &seeds, &config).expect("league starts");
        let season_events = run_alarms(&mut lobby, &seeds, 1_000_000 + ROUND_INTERVAL_MS);

        assert_eq!(lobby.phase(), Phase::Complete);
        assert!(lobby.champion().is_some());
        let played: usize = season_events
            .iter()
            .map(|event| match event {
                LobbyEvent::MatchesPlayed { matches } => matches.len(),
                _ => 0,
            })
            .sum();
        assert_eq!(played, 70 + 4);
    }

    #[test]
    fn the_wake_time_is_none_once_the_season_is_over() {
        let seeds = seeds();
        let config = ModifierConfig::default();
        let mut lobby = create_lobby("lobby-done", &seeds);
        apply(
            &mut lobby,
            Command::ClaimFranchise {
                guest_id: "g".into(),
                franchise_id: "csk".into(),
            },
            0,
            &seeds,
            &config,
        )
        .expect("claim");
        apply(&mut lobby, Command::StartAuction, 0, &seeds, &config).expect("auction starts");
        run_alarms(&mut lobby, &seeds, 5_000);
        apply(&mut lobby, Command::StartLeague, 0, &seeds, &config).expect("league starts");
        let last = run_alarms(&mut lobby, &seeds, ROUND_INTERVAL_MS);
        assert!(!last.is_empty());
        assert_eq!(lobby.phase(), Phase::Complete);
        let outcome = apply(&mut lobby, Command::Alarm, 0, &seeds, &config)
            .expect("alarm on a finished lobby");
        assert_eq!(outcome.next_wake_ms, None);
    }

    #[test]
    fn commands_round_trip_through_json_with_their_type_tag() {
        let command = Command::PlaceBid {
            guest_id: "g".into(),
            amount: 200,
        };
        let json = serde_json::to_string(&command).expect("serialises");
        assert_eq!(json, r#"{"type":"placeBid","guestId":"g","amount":200}"#);
        let back: Command = serde_json::from_str(&json).expect("parses");
        assert_eq!(back, command);
    }
}
