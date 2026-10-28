# 0005: Pure Rust core with a Worker adapter

Status: accepted

The backend is a Cargo workspace. `cricket-core` holds the game rules and has no I/O and no Cloudflare dependency. `cricket-worker` is a thin adapter that runs in a Durable Object and compiles to wasm. Time and randomness enter the core as arguments, and the core owns no storage. Ports (traits for storage or broadcast) are added only in the adapter phase, where I/O actually crosses the boundary.

The alternative was one crate that mixes the rules with the Worker types. That is quicker to start, but the rules would then need a Worker runtime to test, and the auction and simulator tests would depend on the platform. Keeping the core pure makes the rules testable on the host with `cargo test`, keeps [ADR 0003](0003-seeded-deterministic-simulation.md) easy to verify, and means replacing Durable Objects costs one adapter rather than a rewrite.

The trade-off is some up-front structure and a boundary to maintain. Ports are deliberately limited to the adapter phase, so the core does not carry abstractions with one implementation.
