# 0004: Integer lakhs and integer ratings in seed and wire shapes

Status: accepted

Money is stored as integer lakhs (₹1cr is 100 lakhs), and batting, bowling and fielding ratings are integers from 0 to 100. This applies to the seed files in `data/seeds/`, the frontend schemas and the Rust structs. `ARCHITECTURE.md` previously gave base prices in ₹ as `u32` and ratings as `f32`.

Lakhs are exact as integers, so purse arithmetic never rounds. Integer ratings give the same value in TypeScript and Rust, with no float differences, which keeps seeded results reproducible as [ADR 0003](0003-seeded-deterministic-simulation.md) requires.

The trade-off is that display code divides by 100 to show crores, and ratings are coarser than floats. Both are cheap to change at the edges. The stored format is recorded by every lobby, so changing it after seasons exist would be costly.
