//! Turns an HTTP request into a validated {@link Operation}. Nothing here touches storage, so
//! every rule is tested on the host.
//!
//! Input is checked before any Durable Object is called. A bad code, guest ID, name or body
//! gets a 400 with the field that failed, in the same shape the frontend's zod checks use.

use cricket_core::seed::{GameRng, seed_from};
use serde::de::DeserializeOwned;

use crate::api::{
    BidBody, ClaimBody, CreateLobbyBody, GuestBody, JoinBody, SetXiBody, SubstituteBody,
};
use crate::errors::ApiError;
use crate::operation::Operation;

/// Length of a lobby code (`lobbyCodeSchema`).
pub const LOBBY_CODE_LENGTH: usize = 6;
/// Longest guest ID accepted.
pub const MAX_GUEST_ID_LENGTH: usize = 64;
/// Longest display name accepted, after trimming (`displayNameSchema`).
pub const MAX_DISPLAY_NAME_LENGTH: usize = 24;
/// Longest lobby name accepted, after trimming.
pub const MAX_LOBBY_NAME_LENGTH: usize = 40;
/// Longest player ID accepted.
pub const MAX_PLAYER_ID_LENGTH: usize = 64;
/// Most player IDs accepted in one request. The core rejects any count but 11, so this only
/// bounds the body size.
pub const MAX_PLAYER_IDS: usize = 32;

/// The characters a lobby code is made of.
const CODE_ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/// A parsed request.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Routed {
    /// `POST /api/lobbies`. The code is chosen by the entry Worker, which retries when a code is taken.
    Create {
        /// The validated lobby name.
        name: String,
        /// The creator's guest ID.
        guest_id: String,
        /// The creator's name.
        display_name: String,
    },
    /// Any request for an existing lobby.
    Lobby {
        /// The normalised lobby code, which is also the Durable Object's name.
        code: String,
        /// The validated action.
        operation: Operation,
    },
}

/// Parses one request.
///
/// @param method - The HTTP method, `GET` or `POST`.
/// @param path - The URL path.
/// @param query - The query string, without the `?`.
/// @param body - The request body, empty when there is none.
/// @returns The parsed request.
/// @throws Returns a 404 {@link ApiError} for an unknown route, and a 400 for invalid input.
pub fn parse(
    method: &str,
    path: &str,
    query: Option<&str>,
    body: &str,
) -> Result<Routed, ApiError> {
    let segments: Vec<&str> = path.split('/').filter(|part| !part.is_empty()).collect();
    match (method, segments.as_slice()) {
        ("POST", ["api", "lobbies"]) => {
            let input: CreateLobbyBody = parse_body(body)?;
            Ok(Routed::Create {
                name: lobby_name(&input.name)?,
                guest_id: guest_id(&input.guest_id)?,
                display_name: display_name(&input.display_name)?,
            })
        }
        ("GET", ["api", "lobbies", code]) => lobby(code, Operation::GetLobby),
        ("POST", ["api", "lobbies", code, "join"]) => {
            let input: JoinBody = parse_body(body)?;
            lobby(
                code,
                Operation::Join {
                    guest_id: guest_id(&input.guest_id)?,
                    display_name: display_name(&input.display_name)?,
                },
            )
        }
        ("POST", ["api", "lobbies", code, "franchise"]) => {
            let input: ClaimBody = parse_body(body)?;
            lobby(
                code,
                Operation::ClaimFranchise {
                    guest_id: guest_id(&input.guest_id)?,
                    franchise_id: franchise_id(&input.franchise_id)?,
                },
            )
        }
        ("POST", ["api", "lobbies", code, "auction", "start"]) => {
            let input: GuestBody = parse_body(body)?;
            lobby(
                code,
                Operation::StartAuction {
                    guest_id: guest_id(&input.guest_id)?,
                },
            )
        }
        ("GET", ["api", "lobbies", code, "auction"]) => lobby(code, Operation::GetAuction),
        ("POST", ["api", "lobbies", code, "auction", "bids"]) => {
            let input: BidBody = parse_body(body)?;
            if input.amount_lakhs == 0 {
                return Err(invalid("amountLakhs"));
            }
            lobby(
                code,
                Operation::PlaceBid {
                    guest_id: guest_id(&input.guest_id)?,
                    amount_lakhs: input.amount_lakhs,
                },
            )
        }
        ("GET", ["api", "lobbies", code, "squad"]) => {
            let guest = query_value(query, "guestId").ok_or_else(|| invalid("guestId"))?;
            lobby(
                code,
                Operation::GetSquad {
                    guest_id: guest_id(&guest)?,
                },
            )
        }
        ("POST", ["api", "lobbies", code, "squad", "xi"]) => {
            let input: SetXiBody = parse_body(body)?;
            lobby(
                code,
                Operation::SetStartingXi {
                    guest_id: guest_id(&input.guest_id)?,
                    player_ids: player_ids(&input.player_ids)?,
                    captain_id: player_id(&input.captain_id)?,
                    vice_captain_id: player_id(&input.vice_captain_id)?,
                },
            )
        }
        ("POST", ["api", "lobbies", code, "squad", "substitution"]) => {
            let input: SubstituteBody = parse_body(body)?;
            lobby(
                code,
                Operation::Substitute {
                    guest_id: guest_id(&input.guest_id)?,
                    out_player_id: player_id(&input.out_player_id)?,
                    in_player_id: player_id(&input.in_player_id)?,
                },
            )
        }
        ("GET", ["api", "lobbies", code, "league"]) => lobby(code, Operation::GetLeague),
        ("GET", ["api", "lobbies", code, "standings"]) => lobby(code, Operation::GetStandings),
        ("GET", ["api", "lobbies", code, "matches", segment]) => lobby(
            code,
            Operation::GetMatch {
                match_id: match_id(segment)?,
            },
        ),
        ("POST", ["api", "lobbies", code, "league", "advance"]) => {
            let input: GuestBody = parse_body(body)?;
            lobby(
                code,
                Operation::AdvanceRound {
                    guest_id: guest_id(&input.guest_id)?,
                },
            )
        }
        ("GET", ["api", "lobbies", code, "playoffs"]) => lobby(code, Operation::GetPlayoffs),
        ("GET", ["api", "lobbies", code, "awards"]) => lobby(code, Operation::GetAwards),
        _ => Err(ApiError::new(404, "NotFoundError")),
    }
}

/// Generates a candidate lobby code. The entry Worker tries again with a new attempt number if
/// the code is already taken.
///
/// @param now_ms - The time of the request, which varies the code between requests.
/// @param attempt - The attempt number, starting at 0.
/// @returns A six-character code of capitals and digits.
pub fn generate_code(now_ms: u64, attempt: u32) -> String {
    let mut rng = GameRng::from_seed(seed_from(&[
        "lobby-code",
        &now_ms.to_string(),
        &attempt.to_string(),
    ]));
    (0..LOBBY_CODE_LENGTH)
        .map(|_| CODE_ALPHABET[rng.below(CODE_ALPHABET.len() as u32) as usize] as char)
        .collect()
}

/// Builds a lobby route after checking the code.
///
/// @param code - The code from the path.
/// @param operation - The action on the lobby.
/// @returns The routed request.
/// @throws Returns a 400 {@link ApiError} if the code is malformed.
fn lobby(code: &str, operation: Operation) -> Result<Routed, ApiError> {
    Ok(Routed::Lobby {
        code: lobby_code(code)?,
        operation,
    })
}

/// Normalises and checks a lobby code. Input is case-insensitive.
///
/// @param raw - The code as typed.
/// @returns The code in capitals.
/// @throws Returns a 400 {@link ApiError} if it is not six letters or digits.
pub fn lobby_code(raw: &str) -> Result<String, ApiError> {
    let code = raw.to_ascii_uppercase();
    let valid =
        code.len() == LOBBY_CODE_LENGTH && code.bytes().all(|byte| CODE_ALPHABET.contains(&byte));
    if valid {
        Ok(code)
    } else {
        Err(invalid("code"))
    }
}

/// Checks a guest ID: 1 to 64 letters, digits, hyphens or underscores.
///
/// @param raw - The guest ID.
/// @returns The guest ID.
/// @throws Returns a 400 {@link ApiError} otherwise.
pub fn guest_id(raw: &str) -> Result<String, ApiError> {
    let valid = (1..=MAX_GUEST_ID_LENGTH).contains(&raw.len())
        && raw
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-' || byte == b'_');
    if valid {
        Ok(raw.to_string())
    } else {
        Err(invalid("guestId"))
    }
}

/// Trims and checks a display name: 1 to 24 characters.
///
/// @param raw - The name as typed.
/// @returns The trimmed name.
/// @throws Returns a 400 {@link ApiError} otherwise.
pub fn display_name(raw: &str) -> Result<String, ApiError> {
    bounded_text(raw, MAX_DISPLAY_NAME_LENGTH, "displayName")
}

/// Trims and checks a lobby name: 1 to 40 characters.
///
/// @param raw - The name as typed.
/// @returns The trimmed name.
/// @throws Returns a 400 {@link ApiError} otherwise.
pub fn lobby_name(raw: &str) -> Result<String, ApiError> {
    bounded_text(raw, MAX_LOBBY_NAME_LENGTH, "name")
}

/// Checks a franchise ID: lowercase letters only, such as `csk`. The core checks it exists.
///
/// @param raw - The franchise ID.
/// @returns The franchise ID.
/// @throws Returns a 400 {@link ApiError} otherwise.
pub fn franchise_id(raw: &str) -> Result<String, ApiError> {
    if !raw.is_empty() && raw.bytes().all(|byte| byte.is_ascii_lowercase()) {
        Ok(raw.to_string())
    } else {
        Err(invalid("franchiseId"))
    }
}

/// Checks a player ID: lowercase words separated by hyphens, such as `virat-kohli`.
///
/// @param raw - The player ID.
/// @returns The player ID.
/// @throws Returns a 400 {@link ApiError} otherwise.
pub fn player_id(raw: &str) -> Result<String, ApiError> {
    let words_valid = !raw.is_empty()
        && raw.split('-').all(|word| {
            !word.is_empty()
                && word
                    .bytes()
                    .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit())
        });
    if words_valid && raw.len() <= MAX_PLAYER_ID_LENGTH {
        Ok(raw.to_string())
    } else {
        Err(invalid("playerId"))
    }
}

/// Checks a list of player IDs.
///
/// @param raw - The IDs as sent.
/// @returns The IDs.
/// @throws Returns a 400 {@link ApiError} if the list is too long or an ID is malformed.
fn player_ids(raw: &[String]) -> Result<Vec<String>, ApiError> {
    if raw.len() > MAX_PLAYER_IDS {
        return Err(invalid("playerIds"));
    }
    raw.iter().map(|id| player_id(id)).collect()
}

/// Trims text and checks its length in characters.
///
/// @param raw - The text as sent.
/// @param max - The most characters allowed.
/// @param field - The field name for the error.
/// @returns The trimmed text.
/// @throws Returns a 400 {@link ApiError} if it is empty or too long.
fn bounded_text(raw: &str, max: usize, field: &'static str) -> Result<String, ApiError> {
    let trimmed = raw.trim();
    let length = trimmed.chars().count();
    if (1..=max).contains(&length) {
        Ok(trimmed.to_string())
    } else {
        Err(invalid(field))
    }
}

/// Parses a JSON body.
///
/// @param body - The body as text.
/// @returns The parsed body.
/// @throws Returns a 400 {@link ApiError} if it is not the expected JSON.
fn parse_body<T: DeserializeOwned>(body: &str) -> Result<T, ApiError> {
    serde_json::from_str(body).map_err(|_| invalid("body"))
}

/// Reads one value from a query string. Values are used as sent, so only plain characters pass
/// the guest ID check that follows.
///
/// @param query - The query string, if any.
/// @param key - The parameter to find.
/// @returns The value, or `None` if it is absent.
fn query_value(query: Option<&str>, key: &str) -> Option<String> {
    query?
        .split('&')
        .filter_map(|pair| pair.split_once('='))
        .find(|(name, _)| *name == key)
        .map(|(_, value)| value.to_string())
}

/// The 400 for a field that failed its check.
///
/// @param field - The field that failed.
/// @returns The refusal.
fn invalid(field: &'static str) -> ApiError {
    ApiError::because(400, "InvalidInputError", field)
}

/// Checks a match ID from the URL. It has the same shape as the frontend's `matchIdSchema`:
/// lowercase letters and digits, joined by single hyphens.
///
/// @param value - The ID segment from the path.
/// @returns The ID, unchanged.
/// @throws Returns a 400 {@link ApiError} naming `matchId` when the shape is wrong.
fn match_id(value: &str) -> Result<String, ApiError> {
    let well_formed = !value.is_empty()
        && value.split('-').all(|part| {
            !part.is_empty()
                && part
                    .bytes()
                    .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit())
        });
    if well_formed {
        Ok(value.to_string())
    } else {
        Err(invalid("matchId"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_create_request_is_routed_with_a_trimmed_name() {
        let routed = parse(
            "POST",
            "/api/lobbies",
            None,
            r#"{"name":"  Sunday XI  ","guestId":"g-1","displayName":"Asha"}"#,
        )
        .expect("routes");
        assert_eq!(
            routed,
            Routed::Create {
                name: "Sunday XI".to_string(),
                guest_id: "g-1".to_string(),
                display_name: "Asha".to_string(),
            }
        );
    }

    #[test]
    fn the_standings_and_a_match_are_routed_as_reads() {
        let standings = parse("GET", "/api/lobbies/abc123/standings", None, "").expect("routes");
        assert!(matches!(
            standings,
            Routed::Lobby {
                operation: Operation::GetStandings,
                ..
            }
        ));
        let routed =
            parse("GET", "/api/lobbies/abc123/matches/r03-csk-mi", None, "").expect("routes");
        assert_eq!(
            routed,
            Routed::Lobby {
                code: "ABC123".to_string(),
                operation: Operation::GetMatch {
                    match_id: "r03-csk-mi".to_string(),
                },
            }
        );
    }

    #[test]
    fn a_malformed_match_id_is_refused_before_the_lobby_is_read() {
        let error = parse("GET", "/api/lobbies/abc123/matches/Not-An-Id", None, "").unwrap_err();
        assert_eq!(error.reason, Some("matchId"));
    }

    #[test]
    fn lobby_codes_are_case_insensitive_and_checked() {
        assert_eq!(lobby_code("abc123").as_deref(), Ok("ABC123"));
        assert_eq!(lobby_code("ABC12").unwrap_err().reason, Some("code"));
        assert_eq!(lobby_code("ABC-12").unwrap_err().reason, Some("code"));
    }

    #[test]
    fn a_lobby_route_uses_the_upper_case_code() {
        let routed = parse("GET", "/api/lobbies/xyz789/league", None, "").expect("routes");
        assert!(matches!(
            routed,
            Routed::Lobby { ref code, operation: Operation::GetLeague } if code == "XYZ789"
        ));
    }

    #[test]
    fn the_squad_read_takes_the_guest_from_the_query() {
        let routed =
            parse("GET", "/api/lobbies/ABC123/squad", Some("guestId=g1"), "").expect("routes");
        assert!(matches!(
            routed,
            Routed::Lobby { operation: Operation::GetSquad { ref guest_id }, .. } if guest_id == "g1"
        ));
        let missing = parse("GET", "/api/lobbies/ABC123/squad", None, "").unwrap_err();
        assert_eq!(missing.status, 400);
    }

    #[test]
    fn a_bad_body_names_the_field_that_failed() {
        let error = parse(
            "POST",
            "/api/lobbies/ABC123/auction/bids",
            None,
            r#"{"guestId":"g","amountLakhs":0}"#,
        )
        .unwrap_err();
        assert_eq!(error.status, 400);
        assert_eq!(error.reason, Some("amountLakhs"));
        let not_json = parse("POST", "/api/lobbies/ABC123/join", None, "nope").unwrap_err();
        assert_eq!(not_json.reason, Some("body"));
    }

    #[test]
    fn names_are_bounded_in_characters() {
        assert!(display_name(&"x".repeat(24)).is_ok());
        assert_eq!(
            display_name(&"x".repeat(25)).unwrap_err().reason,
            Some("displayName")
        );
        assert_eq!(display_name("   ").unwrap_err().reason, Some("displayName"));
    }

    #[test]
    fn franchise_and_player_ids_are_checked_by_shape() {
        assert!(franchise_id("csk").is_ok());
        assert_eq!(franchise_id("CSK").unwrap_err().reason, Some("franchiseId"));
        assert!(player_id("virat-kohli").is_ok());
        assert_eq!(
            player_id("virat--kohli").unwrap_err().reason,
            Some("playerId")
        );
        assert_eq!(player_id("Virat").unwrap_err().reason, Some("playerId"));
    }

    #[test]
    fn an_unknown_route_is_a_404() {
        assert_eq!(parse("GET", "/api/nope", None, "").unwrap_err().status, 404);
        assert_eq!(
            parse("DELETE", "/api/lobbies/ABC123", None, "")
                .unwrap_err()
                .status,
            404
        );
    }

    #[test]
    fn generated_codes_are_six_capitals_or_digits_and_vary_by_attempt() {
        let first = generate_code(1_000, 0);
        assert_eq!(first.len(), LOBBY_CODE_LENGTH);
        assert!(first.bytes().all(|byte| CODE_ALPHABET.contains(&byte)));
        assert_eq!(first, generate_code(1_000, 0));
        assert_ne!(first, generate_code(1_000, 1));
    }
}
