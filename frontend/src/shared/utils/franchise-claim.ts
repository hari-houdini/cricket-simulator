import type { Lobby, Owner } from "../types/lobby.types";

/**
 * Why a franchise claim is refused. `null` from {@link franchiseClaimBlock}
 * means the claim is allowed.
 *
 * - `closed`: the auction has started, or the lobby has left the auction phase.
 * - `not-an-owner`: the guest has not joined the lobby.
 * - `taken`: another owner already holds the franchise.
 */
export type FranchiseClaimBlock = "closed" | "not-an-owner" | "taken";

/**
 * Who holds a franchise in a lobby, or whether it is still free to claim. The
 * UI reads this to show the taken state and to disable the claim.
 */
export type FranchiseStatus =
  | { readonly kind: "available" }
  | { readonly kind: "owned"; readonly owner: Owner; readonly isMine: boolean };

/**
 * Decides whether a guest may claim a franchise. Claims are allowed only in the
 * auction phase, only for an owner in the lobby, and only for a franchise no
 * other owner holds. Re-claiming the franchise the guest already holds is
 * allowed, so the caller can repeat the request safely.
 *
 * @param lobby - The lobby as it is now.
 * @param guestId - The guest making the claim.
 * @param franchiseId - The franchise they want.
 * @returns The reason the claim is refused, or `null` when it is allowed.
 */
export function franchiseClaimBlock(
  lobby: Pick<Lobby, "phase" | "auctionStatus" | "owners">,
  guestId: string,
  franchiseId: string,
): FranchiseClaimBlock | null {
  if (lobby.phase !== "auction" || lobby.auctionStatus !== "waiting") {
    return "closed";
  }
  if (!lobby.owners.some((owner) => owner.guestId === guestId)) {
    return "not-an-owner";
  }
  const holder = lobby.owners.find(
    (owner) => owner.franchiseId === franchiseId,
  );
  if (holder && holder.guestId !== guestId) {
    return "taken";
  }
  return null;
}

/**
 * Reports who holds a franchise, relative to the guest looking at it.
 *
 * @param lobby - The lobby to read.
 * @param guestId - The guest looking at the franchise, to mark their own.
 * @param franchiseId - The franchise to look up.
 * @returns `available` when no owner holds it, otherwise `owned` with the owner.
 */
export function franchiseStatus(
  lobby: Pick<Lobby, "phase" | "auctionStatus" | "owners">,
  guestId: string,
  franchiseId: string,
): FranchiseStatus {
  const holder = lobby.owners.find(
    (owner) => owner.franchiseId === franchiseId,
  );
  if (!holder) {
    return { kind: "available" };
  }
  return { kind: "owned", owner: holder, isMine: holder.guestId === guestId };
}
