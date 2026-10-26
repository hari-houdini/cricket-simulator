const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const UINT32_RANGE = 4294967296;

/**
 * Hashes a string into an unsigned 32-bit state using FNV-1a. The hash is only
 * a seed spreader: two different seeds can collide, which is acceptable here.
 *
 * @param seed - Any string.
 * @returns An unsigned 32-bit integer.
 */
function hashSeed(seed: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

/**
 * Creates a deterministic pseudo-random generator from a string seed, using
 * the mulberry32 algorithm.
 *
 * Every lobby's players, auction order and results derive from its seed, so the
 * same seed must always produce the same sequence (ADR 0003). Do not use
 * `Math.random` for anything that must be reproducible.
 *
 * @param seed - Any string. The same seed always gives the same sequence.
 * @returns A function that returns a number in `[0, 1)` on each call.
 */
export function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
}
