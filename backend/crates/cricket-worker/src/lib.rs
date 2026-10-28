//! The Cloudflare Worker adapter for the lobby (ARCHITECTURE.md, Cloudflare Workers).
//!
//! `service` holds the lobby commands as plain Rust. It is tested on the host. `durable`
//! is the Cloudflare shell: it loads a lobby from Durable Object storage, applies a command,
//! saves the result, and sets the alarm. Only that shell needs the wasm target.

pub mod service;

#[cfg(target_arch = "wasm32")]
pub mod durable;
