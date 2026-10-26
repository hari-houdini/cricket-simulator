/**
 * Version of the seed data set. Every seed file must carry this value, and each
 * lobby records it, so a season can be replayed against the same data. Bump it
 * whenever any seed file changes.
 */
export const SEED_VERSION = "1.1.0" as const;

/**
 * Shape version every seed file must declare. A loader rejects any other value,
 * so an incompatible file change fails loudly instead of parsing wrongly.
 */
export const SEED_SCHEMA_VERSION = 1 as const;
