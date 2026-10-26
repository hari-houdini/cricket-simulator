"use client";

import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import { SQUAD_SIZE } from "../../shared/const/auction.const";
import { bidBlockReason, timeLeftMs } from "../../shared/utils/auction-rules";
import { describeBidBlock } from "../../shared/utils/describe-api-error";
import { formatLakhs } from "../../shared/utils/format-money";
import { Badge } from "../Badge/Badge";
import { Button } from "../Button/Button";
import { EmptyState } from "../EmptyState/EmptyState";
import { ErrorBanner } from "../ErrorBanner/ErrorBanner";
import { styles } from "./AuctionView.styles";
import type { AuctionViewProps } from "./AuctionView.types";

/** How each player role is shown on the role badge, as the design system abbreviates it. */
const ROLE_BADGES = {
  batter: "BAT",
  bowler: "BOWL",
  "all-rounder": "AR",
  "wicket-keeper": "WK",
} as const;

/** How many of the latest bids the log shows, so the list stays short on a phone. */
const LOG_LENGTH = 10;

/**
 * Formats the timer as `m:ss`, rounding up, so the last second still shows
 * as `0:01` rather than `0:00` while the lot is open.
 *
 * @param milliseconds - Time left, in milliseconds.
 * @returns A string such as `"0:14"`.
 */
function formatCountdown(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * The live auction: the player up for auction, the one bid button, the timer,
 * the guest's purse and squad, the bid log, and the unsold pool.
 *
 * The bid button offers only the lot's minimum next bid, since bids are made with
 * increment buttons only. When it is disabled, the reason is shown beside it, so
 * the guest is never left guessing. The countdown is visible only, and the live
 * region carries the announcements that matter for a screen reader.
 *
 * @param props - The auction, the viewing guest, the clock, and the bid handler.
 * @returns The auction screen, or a completion summary once the auction ends.
 */
export function AuctionView({
  auction,
  guestId,
  now,
  pending,
  error,
  announcement,
  onBid,
}: AuctionViewProps) {
  const purse = auction.purses.find((item) => item.guestId === guestId);
  const lot = auction.lot;
  const lotHeadingId = useId();

  if (auction.status === "complete" || lot === null) {
    return (
      <div {...stylex.props(styles.layout)}>
        <section
          {...stylex.props(styles.panel)}
          aria-labelledby="complete-heading"
        >
          <h2 id="complete-heading" {...stylex.props(styles.heading)}>
            Auction complete
          </h2>
          <p {...stylex.props(styles.note)}>
            {auction.sold.length} sold, {auction.unsold.length} unsold. The
            league starts once the squads are set.
          </p>
        </section>
        <EmptyState
          title="No one is up for auction"
          description="Every player has been sold or has gone to the unsold pool."
        />
      </div>
    );
  }

  const blockReason = bidBlockReason(
    auction,
    guestId,
    lot.minimumBidLakhs,
    now,
  );
  const timeLeft = timeLeftMs(lot.endsAt, now);
  const bidBlockId = `${lotHeadingId}-block`;
  const bidLabel = `Bid ${formatLakhs(lot.minimumBidLakhs)}`;

  return (
    <>
      {error ? <ErrorBanner message={error} /> : null}
      <div {...stylex.props(styles.layout)}>
        <div {...stylex.props(styles.panel)}>
          <section aria-labelledby={lotHeadingId}>
            <h2 id={lotHeadingId} {...stylex.props(styles.heading)}>
              Up for auction
            </h2>
            <p {...stylex.props(styles.playerName)}>{lot.player.name}</p>
            <p {...stylex.props(styles.meta)}>
              <Badge kind="role" role={ROLE_BADGES[lot.player.role]} />
              <span>Base price {formatLakhs(lot.player.basePrice)}</span>
              <span>
                Trouble rating {lot.player.troubleRating ?? 2} of 10 (fantasy
                mechanic)
              </span>
            </p>
          </section>

          <section aria-labelledby="bid-heading">
            <h3 id="bid-heading" {...stylex.props(styles.heading)}>
              Highest bid
            </h3>
            <p {...stylex.props(styles.note)}>
              {lot.highBid
                ? `${formatLakhs(lot.highBid.amountLakhs)} by ${lot.highBid.displayName}`
                : "No bids yet"}
            </p>
            <p {...stylex.props(styles.note)} aria-hidden="true">
              Time left {formatCountdown(timeLeft)}
            </p>
            <output {...stylex.props(styles.announcement)} aria-live="polite">
              {announcement}
            </output>
          </section>

          {purse ? (
            <div>
              <Button
                disabled={pending || blockReason !== null}
                aria-describedby={blockReason ? bidBlockId : undefined}
                onClick={() => onBid(lot.minimumBidLakhs)}
              >
                {bidLabel}
              </Button>
              {blockReason ? (
                <p id={bidBlockId} {...stylex.props(styles.note)}>
                  {describeBidBlock(blockReason)}
                </p>
              ) : null}
            </div>
          ) : (
            <p {...stylex.props(styles.note)}>
              Join the lobby to bid on players.
            </p>
          )}
        </div>

        <div {...stylex.props(styles.list)}>
          <section
            {...stylex.props(styles.panel)}
            aria-labelledby="progress-heading"
          >
            <h2 id="progress-heading" {...stylex.props(styles.heading)}>
              Progress
            </h2>
            <p {...stylex.props(styles.note)}>
              Sold {auction.sold.length} · Unsold {auction.unsold.length} · Left
              to come up {auction.remaining}
            </p>
            {purse ? (
              <p {...stylex.props(styles.note)}>
                Your purse {formatLakhs(purse.purseLakhs)} · Squad{" "}
                {purse.squad.length} of {SQUAD_SIZE}
              </p>
            ) : null}
          </section>

          <section
            {...stylex.props(styles.panel)}
            aria-labelledby="owners-purse-heading"
          >
            <h2 id="owners-purse-heading" {...stylex.props(styles.heading)}>
              Purses
            </h2>
            <ul {...stylex.props(styles.list)}>
              {auction.purses.map((item) => (
                <li key={item.guestId}>
                  {item.displayName}
                  {item.guestId === guestId ? " (you)" : ""}:{" "}
                  {formatLakhs(item.purseLakhs)}, squad {item.squad.length} of{" "}
                  {SQUAD_SIZE}
                </li>
              ))}
            </ul>
          </section>

          <section
            {...stylex.props(styles.panel)}
            aria-labelledby="log-heading"
          >
            <h2 id="log-heading" {...stylex.props(styles.heading)}>
              Bid log
            </h2>
            {auction.log.length === 0 ? (
              <p {...stylex.props(styles.note)}>No bids yet on this auction.</p>
            ) : (
              <ol {...stylex.props(styles.list)}>
                {[...auction.log]
                  .reverse()
                  .slice(0, LOG_LENGTH)
                  .map((entry) => (
                    <li key={entry.sequence}>
                      {entry.displayName} bid {formatLakhs(entry.amountLakhs)}{" "}
                      for {entry.playerName}
                    </li>
                  ))}
              </ol>
            )}
          </section>

          <section
            {...stylex.props(styles.panel)}
            aria-labelledby="unsold-heading"
          >
            <h2 id="unsold-heading" {...stylex.props(styles.heading)}>
              Unsold pool
            </h2>
            <p {...stylex.props(styles.note)}>
              {auction.unsold.length === 0
                ? "No players unsold so far."
                : auction.unsold.map((player) => player.name).join(", ")}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
