//! The Cloudflare shell: one Durable Object per lobby, and the entry Worker that routes to it.
//!
//! The entry Worker parses and validates each HTTP request (`route`), then forwards the
//! resulting `Operation` to the lobby's object, which is named by the lobby code. The object
//! loads the lobby, runs the operation through `service::execute`, saves the lobby when it has
//! changed, and sets the auction alarm. Storage holds the lobby as one JSON string, which avoids
//! the `u64` to JavaScript number edge cases of structured storage.

use cricket_core::lobby::Lobby;
use cricket_core::simulator::ModifierConfig;
use worker::*;

use crate::cors;
use crate::errors::ApiError;
use crate::operation::Operation;
use crate::route::{self, Routed};
use crate::service::{self, Seeds};
use crate::views;

const PLAYERS_JSON: &str = include_str!("../../../../data/seeds/players.v1.json");
const FRANCHISES_JSON: &str = include_str!("../../../../data/seeds/franchises.v1.json");
const SCHEDULE_JSON: &str = include_str!("../../../../data/seeds/ipl-schedule.v1.json");

/// The Durable Object binding name in `wrangler.toml`.
const LOBBY_BINDING: &str = "LOBBY";
/// The storage key holding the lobby JSON.
const STORAGE_KEY: &str = "lobby";
/// The header the entry Worker uses to pass the lobby code to the object.
const LOBBY_CODE_HEADER: &str = "x-lobby-code";
/// How many codes to try before a create gives up. Collisions are rare with six characters.
const CODE_ATTEMPTS: u32 = 5;

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

/// One lobby. The object is single-writer, so operations on a lobby never interleave.
#[durable_object]
pub struct LobbyObject {
    state: State,
    seeds: Seeds,
}

impl LobbyObject {
    /// Loads the stored lobby.
    ///
    /// @returns The lobby, or `None` if the code has never been created.
    /// @throws Returns a Worker error if the stored JSON cannot be read.
    async fn load(&self) -> Result<Option<Lobby>> {
        match self.state.storage().get::<String>(STORAGE_KEY).await? {
            Some(json) => serde_json::from_str(&json).map(Some).map_err(fail),
            None => Ok(None),
        }
    }

    /// Saves the lobby and sets the alarm for its next auction timer.
    ///
    /// @param lobby - The lobby to save.
    /// @param now_ms - The current time, used to turn the wake time into a delay.
    /// @returns `Ok(())` once storage and the alarm are updated.
    async fn persist(&self, lobby: &Lobby, now_ms: u64) -> Result<()> {
        let storage = self.state.storage();
        storage
            .put_raw(STORAGE_KEY, serde_json::to_string(lobby).map_err(fail)?)
            .await?;
        match service::next_wake(lobby) {
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
        let code = match req.headers().get(LOBBY_CODE_HEADER)? {
            Some(code) => code,
            None => return respond_error(ApiError::new(400, "InvalidInputError")),
        };
        let operation: Operation = match req.json().await {
            Ok(operation) => operation,
            Err(_) => return respond_error(ApiError::because(400, "InvalidInputError", "body")),
        };
        let now_ms = Date::now().as_millis();

        match (self.load().await?, operation) {
            (
                None,
                Operation::CreateLobby {
                    name,
                    guest_id,
                    display_name,
                },
            ) => match service::create(&code, &name, &guest_id, &display_name, &self.seeds) {
                Ok(lobby) => {
                    self.persist(&lobby, now_ms).await?;
                    respond(
                        201,
                        serde_json::to_string(&views::lobby(&lobby)).map_err(fail)?,
                    )
                }
                Err(error) => respond_error(error),
            },
            (Some(_), Operation::CreateLobby { .. }) => {
                respond_error(ApiError::new(409, "LobbyCodeTakenError"))
            }
            (None, _) => respond_error(ApiError::new(404, "LobbyNotFoundError")),
            (Some(mut lobby), operation) => {
                let before = lobby.clone();
                let result = service::execute(
                    &mut lobby,
                    operation,
                    now_ms,
                    &self.seeds,
                    &ModifierConfig::default(),
                );
                // A refused operation can still have settled an overdue lot, so save any change.
                if lobby != before {
                    self.persist(&lobby, now_ms).await?;
                }
                match result {
                    Ok(body) => respond(200, body),
                    Err(error) => respond_error(error),
                }
            }
        }
    }

    async fn alarm(&self) -> Result<Response> {
        let now_ms = Date::now().as_millis();
        match self.load().await {
            Ok(Some(mut lobby)) => {
                let before = lobby.clone();
                // The alarm only closes lots that are due. A failure here leaves the lobby as it was.
                let _ = service::catch_up(&mut lobby, now_ms);
                if lobby != before {
                    self.persist(&lobby, now_ms).await?;
                }
            }
            Ok(None) => {}
            // An unreadable lobby would fail its alarm again on every retry, so the error is
            // logged and the alarm is answered. The lobby stays as it was stored.
            Err(error) => console_error!("the lobby could not be loaded for its alarm: {error}"),
        }
        Response::ok("")
    }
}

/// The entry Worker. It serves the public HTTP API under `/api/lobbies` and forwards each
/// request to the lobby's Durable Object.
///
/// @param mut req - The incoming request.
/// @param env - Bindings, including the lobby Durable Object namespace.
/// @param _ctx - The execution context, unused.
/// @returns The lobby's response, or a 400 or 404 for a bad request or route.
#[event(fetch)]
async fn fetch(mut req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let allow_list = cors::parse_allow_list(
        &env.var(cors::ALLOWED_ORIGINS_VAR)
            .map(|value| value.to_string())
            .unwrap_or_default(),
    );
    let origin = cors::allowed_origin(req.headers().get("origin")?.as_deref(), &allow_list);
    // A preflight is answered here, before any route is checked, so the browser can send the real request.
    if method_name(req.method()) == "OPTIONS" {
        let mut response = Response::empty()?.with_status(204);
        set_cors(response.headers_mut(), origin.as_deref())?;
        return Ok(response);
    }
    let response = route_request(&mut req, &env).await?;
    relay(response, origin.as_deref()).await
}

/// Parses one request and sends it to the lobby, or creates the lobby under a fresh code.
///
/// @param req - The incoming request, whose body is read.
/// @param env - The bindings.
/// @returns The response from the lobby, or a 400 or 404 for a bad request or route.
async fn route_request(req: &mut Request, env: &Env) -> Result<Response> {
    let method = method_name(req.method());
    let url = req.url()?;
    let body = req.text().await?;
    let routed = match route::parse(method, url.path(), url.query(), &body) {
        Ok(routed) => routed,
        Err(error) => return respond_error(error),
    };
    match routed {
        Routed::Create {
            name,
            guest_id,
            display_name,
        } => create_lobby(env, &name, &guest_id, &display_name).await,
        Routed::Lobby { code, operation } => forward(env, &code, &operation).await,
    }
}

/// Rebuilds a Durable Object's response with the CORS headers. The object's own response may
/// have immutable headers, so it is read and sent again rather than changed.
///
/// @param response - The object's response.
/// @param origin - The origin to allow, if the request came from an allowed one.
/// @returns The response to send to the browser.
async fn relay(mut response: Response, origin: Option<&str>) -> Result<Response> {
    let status = response.status_code();
    let body = response.bytes().await?;
    let mut relayed = Response::from_bytes(body)?.with_status(status);
    relayed
        .headers_mut()
        .set("content-type", "application/json")?;
    set_cors(relayed.headers_mut(), origin)?;
    Ok(relayed)
}

/// Sets the CORS headers. `Vary: Origin` is always sent, so a cache never serves one origin's
/// answer to another. The allow headers are sent only for an allowed origin.
///
/// @param headers - The response headers, changed in place.
/// @param origin - The allowed origin, if any.
fn set_cors(headers: &mut Headers, origin: Option<&str>) -> Result<()> {
    headers.set("vary", "Origin")?;
    if let Some(origin) = origin {
        headers.set("access-control-allow-origin", origin)?;
        headers.set("access-control-allow-methods", cors::ALLOWED_METHODS)?;
        headers.set("access-control-allow-headers", cors::ALLOWED_HEADERS)?;
    }
    Ok(())
}

/// Creates a lobby under a fresh code, trying another code if one is already taken.
///
/// @param env - The bindings.
/// @param name - The lobby's name.
/// @param guest_id - The creator.
/// @param display_name - The creator's name.
/// @returns The created lobby (201), or the refusal.
async fn create_lobby(
    env: &Env,
    name: &str,
    guest_id: &str,
    display_name: &str,
) -> Result<Response> {
    let now_ms = Date::now().as_millis();
    let operation = Operation::CreateLobby {
        name: name.to_string(),
        guest_id: guest_id.to_string(),
        display_name: display_name.to_string(),
    };
    for attempt in 0..CODE_ATTEMPTS {
        let code = route::generate_code(now_ms, attempt);
        let mut response = forward(env, &code, &operation).await?;
        if response.status_code() != 409 {
            return Ok(response);
        }
        // The only conflict a create can hit is a code already in use, so try another one.
        let _ = response.text().await?;
    }
    respond_error(ApiError::new(503, "LobbyCodeUnavailableError"))
}

/// Sends one operation to a lobby's Durable Object and returns its response.
///
/// @param env - The bindings.
/// @param code - The lobby code, which names the object.
/// @param operation - The action.
/// @returns The object's response.
async fn forward(env: &Env, code: &str, operation: &Operation) -> Result<Response> {
    let stub = env
        .durable_object(LOBBY_BINDING)?
        .id_from_name(code)?
        .get_stub()?;
    let body = serde_json::to_string(operation).map_err(fail)?;
    let headers = Headers::new();
    headers.set("content-type", "application/json")?;
    headers.set(LOBBY_CODE_HEADER, code)?;
    let mut init = RequestInit::new();
    init.with_method(Method::Post)
        .with_headers(headers)
        .with_body(Some(body.into()));
    let request = Request::new_with_init("https://lobby.internal/operation", &init)?;
    stub.fetch_with_request(request).await
}

/// The method as the route parser names it. Only `GET` and `POST` are routed, and `OPTIONS` is
/// answered as a preflight before routing.
///
/// @param method - The request method.
/// @returns `GET`, `POST`, `OPTIONS`, or `OTHER`.
fn method_name(method: Method) -> &'static str {
    match method {
        Method::Get => "GET",
        Method::Post => "POST",
        Method::Options => "OPTIONS",
        _ => "OTHER",
    }
}

/// A JSON response with a status.
///
/// @param status - The HTTP status.
/// @param body - The JSON body.
/// @returns The response.
fn respond(status: u16, body: String) -> Result<Response> {
    let mut response = Response::from_bytes(body.into_bytes())?.with_status(status);
    response
        .headers_mut()
        .set("content-type", "application/json")?;
    Ok(response)
}

/// A refusal as a JSON response.
///
/// @param error - The refusal.
/// @returns The response.
fn respond_error(error: ApiError) -> Result<Response> {
    respond(error.status, error.body())
}
