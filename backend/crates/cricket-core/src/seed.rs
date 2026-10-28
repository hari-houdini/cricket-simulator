//! Deterministic seeds and the random source used by every simulation (ADR 0003).

use rand_chacha::ChaCha8Rng;
use rand_core::{Rng, SeedableRng};

/// Derives a 32-byte seed from labelled parts, such as `["match", lobby_id, match_id]`.
///
/// FNV-1a is used instead of `std::hash::DefaultHasher` because the standard library
/// does not promise that hash is stable across Rust releases. A change there would
/// silently change every replayed season.
///
/// @param parts - Labels and identifiers. Each part is separated so `["ab", "c"]`
///   and `["a", "bc"]` produce different seeds.
/// @returns A 32-byte seed for {@link GameRng::from_seed}.
pub fn seed_from(parts: &[&str]) -> [u8; 32] {
    const FNV_OFFSET: u64 = 0xcbf2_9ce4_8422_2325;
    const FNV_PRIME: u64 = 0x0000_0100_0000_01b3;

    let mut state = FNV_OFFSET;
    for part in parts {
        for byte in part.as_bytes() {
            state ^= u64::from(*byte);
            state = state.wrapping_mul(FNV_PRIME);
        }
        state ^= 0xff;
        state = state.wrapping_mul(FNV_PRIME);
    }

    // Expand the 64-bit hash to 32 bytes with a SplitMix64 step per 8-byte chunk.
    let mut seed = [0u8; 32];
    for chunk in seed.chunks_mut(8) {
        state = state.wrapping_add(0x9e37_79b9_7f4a_7c15);
        let mut z = state;
        z = (z ^ (z >> 30)).wrapping_mul(0xbf58_476d_1ce4_e5b9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94d0_49bb_1331_11eb);
        z ^= z >> 31;
        chunk.copy_from_slice(&z.to_le_bytes());
    }
    seed
}

/// The seeded random source used by the simulator and the shuffles.
///
/// Wraps ChaCha8 so the same seed gives the same sequence on every platform, including
/// the wasm build of the Worker.
pub struct GameRng {
    inner: ChaCha8Rng,
}

impl GameRng {
    /// Creates a generator from a seed produced by {@link seed_from}.
    ///
    /// @param seed - The 32-byte seed.
    /// @returns A generator positioned at the start of the sequence.
    pub fn from_seed(seed: [u8; 32]) -> Self {
        Self {
            inner: ChaCha8Rng::from_seed(seed),
        }
    }

    /// Returns a uniform integer in `0..bound` without modulo bias.
    ///
    /// @param bound - Exclusive upper limit. Must be greater than zero.
    /// @returns A value in `0..bound`.
    /// @throws Panics if `bound` is zero.
    pub fn below(&mut self, bound: u32) -> u32 {
        assert!(bound > 0, "bound must be greater than zero");
        let zone = u32::MAX - (u32::MAX % bound);
        loop {
            let value = self.inner.next_u32();
            if value < zone {
                return value % bound;
            }
        }
    }

    /// Shuffles a slice in place with the Fisher-Yates algorithm.
    ///
    /// @param items - The slice to shuffle.
    pub fn shuffle<T>(&mut self, items: &mut [T]) {
        for index in (1..items.len()).rev() {
            let swap_with = self.below(u32::try_from(index + 1).unwrap_or(u32::MAX)) as usize;
            items.swap(index, swap_with);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn same_parts_give_same_seed() {
        assert_eq!(
            seed_from(&["match", "lobby-1", "m-1"]),
            seed_from(&["match", "lobby-1", "m-1"])
        );
    }

    #[test]
    fn different_parts_give_different_seeds() {
        assert_ne!(
            seed_from(&["match", "lobby-1", "m-1"]),
            seed_from(&["match", "lobby-1", "m-2"])
        );
    }

    #[test]
    fn part_boundaries_are_respected() {
        assert_ne!(seed_from(&["ab", "c"]), seed_from(&["a", "bc"]));
    }

    #[test]
    fn same_seed_gives_same_sequence() {
        let mut first = GameRng::from_seed(seed_from(&["x"]));
        let mut second = GameRng::from_seed(seed_from(&["x"]));
        let a: Vec<u32> = (0..50).map(|_| first.below(1000)).collect();
        let b: Vec<u32> = (0..50).map(|_| second.below(1000)).collect();
        assert_eq!(a, b);
    }

    #[test]
    fn below_stays_in_range() {
        let mut rng = GameRng::from_seed(seed_from(&["range"]));
        assert!((0..10_000).all(|_| rng.below(7) < 7));
    }

    #[test]
    fn shuffle_keeps_every_item() {
        let mut rng = GameRng::from_seed(seed_from(&["shuffle"]));
        let mut items: Vec<u32> = (0..20).collect();
        rng.shuffle(&mut items);
        items.sort_unstable();
        assert_eq!(items, (0..20).collect::<Vec<u32>>());
    }
}
