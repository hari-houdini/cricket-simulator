# 0003: Seeded deterministic simulation

Status: accepted

Matches and fair-play rolls are simulated from a seed derived from lobby ID and match ID, so the same inputs always produce the same result. Every guest in a lobby sees identical scores. This replaces the "weighted random" wording in `ARCHITECTURE.md`.
