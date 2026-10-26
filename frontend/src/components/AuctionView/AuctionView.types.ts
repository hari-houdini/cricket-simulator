import type { Auction } from "../../shared/types/auction.types";

/** Props for {@link AuctionView}. The view shows the auction it is given and reports a bid. */
export type AuctionViewProps = {
  /** The auction state to show. */
  readonly auction: Auction;
  /** The guest viewing it. They bid only if they own a purse in this auction. */
  readonly guestId: string;
  /** The current time, in epoch milliseconds, so the countdown and bid checks match the timer. */
  readonly now: number;
  /** True while a bid is in flight. Disables the bid button. */
  readonly pending: boolean;
  /** A message for the last failed bid, or `null`. */
  readonly error: string | null;
  /**
   * Text for the live region: the latest bid, sale, or time warning. Screen
   * readers announce it. Empty when there is nothing new to say.
   */
  readonly announcement: string;
  /** Called with the amount when the guest presses the bid button. */
  readonly onBid: (amountLakhs: number) => void;
};
