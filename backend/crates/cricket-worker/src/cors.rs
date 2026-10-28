//! Cross-origin access for the browser client. The frontend runs on its own origin, so the
//! Worker answers allowed origins with CORS headers and answers preflight requests itself.
//!
//! Only the decisions are here, so they run on the host. Attaching the headers to a response
//! happens in `durable`, where the Worker types are.

/// The environment variable holding the comma-separated allow-list of origins.
pub const ALLOWED_ORIGINS_VAR: &str = "ALLOWED_ORIGINS";

/// The methods a browser may use on the API.
pub const ALLOWED_METHODS: &str = "GET, POST, OPTIONS";

/// The request headers a browser may send. Only JSON bodies are sent, so this is all the API needs.
pub const ALLOWED_HEADERS: &str = "content-type";

/// Reads the allow-list. Empty entries are dropped, so an empty variable allows no origin.
///
/// @param raw - The comma-separated value, such as `http://localhost:3000,https://example.com`.
/// @returns The allowed origins.
pub fn parse_allow_list(raw: &str) -> Vec<String> {
    raw.split(',')
        .map(str::trim)
        .filter(|origin| !origin.is_empty())
        .map(str::to_string)
        .collect()
}

/// Returns the origin to echo back in `Access-Control-Allow-Origin`, when the request's origin
/// is on the allow-list. An origin that is not listed gets no CORS headers, so the browser
/// blocks the response for it.
///
/// @param origin - The request's `Origin` header, if it has one.
/// @param allow_list - The allowed origins.
/// @returns The origin to echo, or `None` when the request may not be read cross-origin.
pub fn allowed_origin(origin: Option<&str>, allow_list: &[String]) -> Option<String> {
    let origin = origin?;
    allow_list
        .iter()
        .any(|allowed| allowed == origin)
        .then(|| origin.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_allow_list_ignores_blanks_and_spaces() {
        assert_eq!(
            parse_allow_list(" http://localhost:3000 , ,https://example.com "),
            vec!["http://localhost:3000", "https://example.com"]
        );
        assert!(parse_allow_list("").is_empty());
    }

    #[test]
    fn a_listed_origin_is_echoed_and_an_unlisted_one_is_not() {
        let list = parse_allow_list("http://localhost:3000");
        assert_eq!(
            allowed_origin(Some("http://localhost:3000"), &list),
            Some("http://localhost:3000".to_string())
        );
        assert_eq!(allowed_origin(Some("https://evil.example"), &list), None);
    }

    #[test]
    fn a_request_without_an_origin_gets_no_cors_headers() {
        let list = parse_allow_list("http://localhost:3000");
        assert_eq!(allowed_origin(None, &list), None);
    }
}
