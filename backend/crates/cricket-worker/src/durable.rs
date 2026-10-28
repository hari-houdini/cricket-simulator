//! The Cloudflare shell: one Durable Object per lobby, and the entry Worker that routes to it.
//!
//! Each command follows the same steps. Load the lobby from storage, apply the command with
//! `service::apply`, save the result, and set the next alarm. A refused command is returned as
//! a 409 and nothing is saved. Storage holds the lobby as one JSON string, which avoids the
//! `u64` to JavaScript number edge cases of structured storage.

use cricket_core::lobby::Lobby;
use cricket_core::simulator::ModifierConfig;
use worker::*;

use crate::service::{self, Command, Outcome, Seeds};

const PLAYERS_JSON: &str = include_str!("../../../../data/seeds/players.v1.json");
const FRANCHISES_JSON: &str = include_str!("../../../../data/seeds/franchises.v1.json");
const SCHEDULE_JSON: &str = include_str!("../../../../data/seeds/ipl-schedule.v1.json");

/// The Durable Object binding name in `wrangler.toml`.
const LOBBY_BINDING: &str = "LOBBY";
/// The storage key holding the lobby JSON.
const STORAGE_KEY: &str = "lobby";
/// The header the entry Worker uses to pass the lobby identifier to the object.
const LOBBY_ID_HEADER: &str = "x-lobby-id";

/// Converts any message into a Worker error.
///
/// @param message - What went wrong.
/// @returns A Worker error carrying the message.
fn fail(message: impl ToString) -> Error {
    Error::RustError(message.to_string())
}

/// Parses the embedded seed files. They are compiled in, so this cannot fail at runtime; the
/// host tests parse the same files.
///
/// @returns The parsed seeds.
fn embedded_seeds() -> Seeds {
    Seeds::parse(PLAYERS_JSON, FRANCHISES_JSON, SCHEDULE_JSON)
        .expect("embedded seed files are valid")
}

/// One lobby. The object is single-writer, so commands for a lobby never interleave.
#[durable_object]
pub struct LobbyObject {
    state: State,
    seeds: Seeds,
}

impl LobbyObject {
    /// Loads the stored lobby, or creates it when the object has never seen a command.
    ///
    /// @param lobby_id - The lobby identifier from the request.
    /// @returns The lobby.
    /// @throws Returns a Worker error if the stored JSON cannot be read.
    async fn load(&self, lobby_id: &str) -> Result<Lobby> {
        match self.state.storage().get::<String>(STORAGE_KEY).await? {
            Some(json) => serde_json::from_str(&json).map_err(fail),
            None => Ok(service::create_lobby(lobby_id, &self.seeds)),
        }
    }

    /// Saves the lobby and sets the alarm for its next step.
    ///
    /// @param lobby - The lobby to save.
    /// @param outcome - The command's outcome, which says when to wake.
    /// @param now_ms - The current time, used to turn the wake time into a delay.
    /// @returns `Ok(())` once storage and the alarm are updated.
    async fn persist(&self, lobby: &Lobby, outcome: &Outcome, now_ms: u64) -> Result<()> {
        let storage = self.state.storage();
        storage
            .put_raw(STORAGE_KEY, serde_json::to_string(lobby).map_err(fail)?)
            .await?;
        match outcome.next_wake_ms {
            // `set_alarm` takes a delay in milliseconds from now, not an absolute time.
            Some(at_ms) => {
                storage
                    .set_alarm(at_ms.saturating_sub(now_ms) as i64)
                    .await?
            }
            None => storage.delete_alarm().await?,
        }
        Ok(())
    }
}

impl DurableObject for LobbyObject {
    fn new(state: State, _env: Env) -> Self {
        Self {
            state,
            seeds: embedded_seeds(),
        }
    }

    async fn fetch(&self, mut req: Request) -> Result<Response> {
        let lobby_id = match req.headers().get(LOBBY_ID_HEADER)? {
            Some(id) => id,
            None => return Response::error("missing lobby id", 400),
        };
        let command: Command = match req.json().await {
            Ok(command) => command,
            Err(_) => return Response::error("invalid command", 400),
        };

        let now_ms = Date::now().as_millis();
        let mut lobby = self.load(&lobby_id).await?;
        match service::apply(
            &mut lobby,
            command,
            now_ms,
            &self.seeds,
            &ModifierConfig::default(),
        ) {
            Ok(outcome) => {
                self.persist(&lobby, &outcome, now_ms).await?;
                Response::from_json(&outcome)
            }
            Err(error) => Response::error(format!("{error:?}"), 409),
        }
    }

    async fn alarm(&self) -> Result<Response> {
        let Some(json) = self.state.storage().get::<String>(STORAGE_KEY).await? else {
            return Response::ok("");
        };
        let mut lobby: Lobby = serde_json::from_str(&json).map_err(fail)?;
        let now_ms = Date::now().as_millis();
        let outcome = service::apply(
            &mut lobby,
            Command::Alarm,
            now_ms,
            &self.seeds,
            &ModifierConfig::default(),
        )
        .map_err(|error| fail(format!("{error:?}")))?;
        self.persist(&lobby, &outcome, now_ms).await?;
        Response::ok("")
    }
}

/// Reports whether a lobby ID is safe to use as a Durable Object name and a URL segment.
///
/// @param id - The identifier from the URL.
/// @returns `true` for 1 to 64 lowercase letters, digits and hyphens.
fn is_valid_lobby_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 64
        && id
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
}

/// The entry Worker. For phase 2 it exposes one internal route, `POST /lobbies/{id}/commands`,
/// which forwards to the lobby's Durable Object. Phase 3 replaces it with the public HTTP API.
///
/// @param req - The incoming request.
/// @param env - Bindings, including the lobby Durable Object namespace.
/// @param _ctx - The execution context, unused.
/// @returns The object's response, or a 400/404 for a bad route or identifier.
#[event(fetch)]
async fn fetch(mut req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let url = req.url()?;
    let segments: Vec<String> = url
        .path()
        .trim_matches('/')
        .split('/')
        .map(str::to_string)
        .collect();

    let lobby_id = match (req.method(), segments.as_slice()) {
        (Method::Post, [root, id, action]) if root == "lobbies" && action == "commands" => {
            id.clone()
        }
        _ => return Response::error("not found", 404),
    };
    if !is_valid_lobby_id(&lobby_id) {
        return Response::error("invalid lobby id", 400);
    }

    let body = req.text().await?;
    let headers = Headers::new();
    headers.set("content-type", "application/json")?;
    headers.set(LOBBY_ID_HEADER, &lobby_id)?;
    let mut init = RequestInit::new();
    init.with_method(Method::Post)
        .with_headers(headers)
        .with_body(Some(body.into()));
    let forwarded = Request::new_with_init(url.as_str(), &init)?;

    let stub = env
        .durable_object(LOBBY_BINDING)?
        .id_from_name(&lobby_id)?
        .get_stub()?;
    stub.fetch_with_request(forwarded).await
}
