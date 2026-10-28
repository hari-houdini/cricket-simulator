//! The IPL cricket simulator's game rules: pure Rust with no I/O (ADR 0005).
//!
//! Time and randomness enter as arguments, and seed data enters as parsed values, so every
//! function here is deterministic and testable on the host.

pub mod auction;
pub mod awards;
pub mod lobby;
pub mod model;
pub mod playoffs;
pub mod schedule;
pub mod season;
pub mod seed;
pub mod seed_data;
pub mod simulator;
pub mod squad;
pub mod standings;
pub mod system_squad;
