import type { Owner } from "../types/lobby.types";

/**
 * The owners who play in a fixture, home owner first. A match between two owners
 * has two, a match with one owner has one, and any other match has none. Each
 * franchise has at most one owner, so each side gives at most one entry.
 *
 * @param fixture - The fixture's two franchises.
 * @param fixture.homeFranchiseId - The home franchise.
 * @param fixture.awayFranchiseId - The away franchise.
 * @param owners - The lobby's owners.
 * @returns The owners in the fixture, home owner first.
 */
export function ownersInFixture(
  fixture: {
    readonly homeFranchiseId: string;
    readonly awayFranchiseId: string;
  },
  owners: readonly Owner[],
): Owner[] {
  return [fixture.homeFranchiseId, fixture.awayFranchiseId]
    .map((franchiseId) =>
      owners.find((owner) => owner.franchiseId === franchiseId),
    )
    .filter((owner): owner is Owner => owner !== undefined);
}
