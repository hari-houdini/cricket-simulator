//! The Cloudflare Worker adapter for the lobby (ARCHITECTURE.md, Cloudflare Workers).
//!
//! Everything except `durable` is plain Rust and runs on the host, so its tests run under
//! `cargo test`. `durable` is the Cloudflare shell: the Durable Object and the entry Worker.
//! It needs the wasm target and is the only module that touches the `worker` SDK.

pub mod api;
#[cfg(target_arch = "wasm32")]
pub mod durable;
pub mod errors;
pub mod operation;
pub mod route;
pub mod service;
pub mod views;
