"use client";

import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";

import { Button } from "../../../components/Button/Button";
import { SQUAD_SIZE } from "../../../shared/const/auction.const";
import type { Auction } from "../../../shared/types/auction.types";
import {
  bidBlockReason,
  timeLeftMs,
} from "../../../shared/utils/auction-rules";
import { describeBidBlock } from "../../../shared/utils/describe-api-error";
import { formatLakhs } from "../../../shared/utils/format-money";
import { styles } from "./ProtoAuctionView.styles";

/** The props for {@link ProtoAuctionView}. */
type ProtoAuctionViewProps = {
  /** The auction as last read. */
  readonly auction: Auction;
  /** The guest viewing the auction. */
  readonly guestId: string;
  /** The clock, so the countdown moves between reads. */
  readonly now: number;
  /** True while a bid is in flight. */
  readonly pending: boolean;
  /** The latest line for the live region. */
  readonly announcement: string;
  /** Places a bid at the lot's minimum next amount. */
  readonly onBid: (amountLakhs: number) => void;
};

/** The radius of the countdown ring, in SVG user units. */
const RING_RADIUS = 44;

/** The ring's full circumference, which the dash offset is measured against. */
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** The last seconds of a lot, when the timer turns to the urgent colour and says so in words. */
const URGENT_SECONDS = 2;

/** How many of the latest bids the log lists. */
const LOG_LENGTH = 8;

/**
 * Formats a countdown in whole seconds, rounding up, so the last second still
 * reads as "1" while the lot is open.
 *
 * @param milliseconds - Time left, in milliseconds.
 * @returns The seconds left, as a whole number.
 */
function secondsLeft(milliseconds: number): number {
  return Math.ceil(milliseconds / 1000);
}

/**
 * The live auction on the broadcast layout. The lot is the hero: the player, a
 * countdown ring, the highest bid, and the one bid action. The rail holds the
 * progress of the auction, the guest's own purse, every purse, the bid log and
 * the unsold pool.
 *
 * The countdown is a ring plus a number, and from the last two seconds it also
 * says "Closing" in words, so the urgency is never colour alone. The fill meters
 * scale with `transform`, so a new value costs no layout.
 *
 * @param props - The auction, the viewer, the clock, the pending flag, the live line and the bid handler.
 * @returns The auction layout.
 */
export function ProtoAuctionView({
  auction,
  guestId,
  now,
  pending,
  announcement,
  onBid,
}: ProtoAuctionViewProps) {
  const purse = auction.purses.find((item) => item.guestId === guestId);
  const lot = auction.lot;

  if (auction.status === "complete" || lot === null) {
    return (
      <section
        aria-labelledby="complete-heading"
        {...stylex.props(styles.hero)}
      >
        <h2 id="complete-heading" {...stylex.props(styles.player)}>
          Auction complete
        </h2>
        <p {...stylex.props(styles.note)}>
          {auction.sold.length} sold, {auction.unsold.length} unsold. The league
          starts once the squads are set.
        </p>
      </section>
    );
  }

  const blockReason = bidBlockReason(
    auction,
    guestId,
    lot.minimumBidLakhs,
    now,
  );
  const timeLeft = timeLeftMs(lot.endsAt, now);
  const seconds = secondsLeft(timeLeft);
  const urgent = seconds <= URGENT_SECONDS;
  // The ring drains as the lot's window runs out. The window is the full bid timer.
  const fraction = Math.min(1, Math.max(0, timeLeft / 5000));
  const dashOffset = RING_CIRCUMFERENCE * (1 - fraction);
  const seatsFilled = purse ? purse.squad.length : 0;

  return (
    <div {...stylex.props(styles.layout)}>
      <section aria-labelledby="lot-heading" {...stylex.props(styles.hero)}>
        <p {...stylex.props(styles.eyebrow)}>On the block</p>
        <h2 id="lot-heading" {...stylex.props(styles.player)}>
          {lot.player.name}
        </h2>
        <ul {...stylex.props(styles.meta)}>
          <li {...stylex.props(styles.chip)}>{roleLabel(lot.player.role)}</li>
          <li>Base price {formatLakhs(lot.player.basePrice)}</li>
          <li>Trouble rating {lot.player.troubleRating ?? 2} of 10</li>
        </ul>

        <div {...stylex.props(styles.readouts)}>
          <div {...stylex.props(styles.timer)}>
            <div {...stylex.props(styles.ringWrap)}>
              <svg
                viewBox="0 0 100 100"
                aria-hidden="true"
                focusable="false"
                {...stylex.props(styles.ringSvg)}
              >
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  {...stylex.props(styles.ringTrack)}
                />
                <circle
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  {...stylex.props(
                    styles.ringArc,
                    urgent && styles.ringArcUrgent,
                  )}
                />
              </svg>
              <span aria-hidden="true" {...stylex.props(styles.ringLabel)}>
                {seconds}
              </span>
            </div>
            <div>
              <p
                {...stylex.props(
                  styles.timerText,
                  urgent && styles.timerUrgent,
                )}
              >
                {urgent ? "Closing" : "Time left"}
              </p>
              <p aria-hidden="true" {...stylex.props(styles.timerText)}>
                {seconds} {seconds === 1 ? "second" : "seconds"}
              </p>
            </div>
          </div>

          <div {...stylex.props(styles.bidBlock)}>
            <p {...stylex.props(styles.label)}>Highest bid</p>
            <p {...stylex.props(styles.readout)}>
              {lot.highBid
                ? formatLakhs(lot.highBid.amountLakhs)
                : "No bids yet"}
            </p>
            <p {...stylex.props(styles.note)}>
              {lot.highBid
                ? `by ${lot.highBid.displayName}`
                : "Open for the first bid"}
            </p>
          </div>
        </div>

        <output aria-live="polite" {...stylex.props(styles.announcement)}>
          {announcement}
        </output>

        {purse ? (
          <div {...stylex.props(styles.bidBlock)}>
            <Button
              size="lg"
              disabled={pending || blockReason !== null}
              aria-describedby={blockReason ? "bid-block" : undefined}
              onClick={() => onBid(lot.minimumBidLakhs)}
            >
              Bid {formatLakhs(lot.minimumBidLakhs)}
            </Button>
            {blockReason ? (
              <p id="bid-block" {...stylex.props(styles.note)}>
                {describeBidBlock(blockReason)}
              </p>
            ) : null}
          </div>
        ) : (
          <p {...stylex.props(styles.note)}>
            Join the lobby to bid on players.
          </p>
        )}
      </section>

      <div {...stylex.props(styles.rail)}>
        <section
          aria-labelledby="progress-heading"
          {...stylex.props(styles.panel)}
        >
          <h2 id="progress-heading" {...stylex.props(styles.panelTitle)}>
            Progress
          </h2>
          <dl {...stylex.props(styles.statRow)}>
            <div {...stylex.props(styles.stat)}>
              <dt {...stylex.props(styles.label)}>Sold</dt>
              <dd {...stylex.props(styles.statValue)}>{auction.sold.length}</dd>
            </div>
            <div {...stylex.props(styles.stat)}>
              <dt {...stylex.props(styles.label)}>Unsold</dt>
              <dd {...stylex.props(styles.statValue)}>
                {auction.unsold.length}
              </dd>
            </div>
            <div {...stylex.props(styles.stat)}>
              <dt {...stylex.props(styles.label)}>To come</dt>
              <dd {...stylex.props(styles.statValue)}>{auction.remaining}</dd>
            </div>
          </dl>
          {purse ? (
            <>
              <p {...stylex.props(styles.note)}>
                Your purse {formatLakhs(purse.purseLakhs)}, squad {seatsFilled}{" "}
                of {SQUAD_SIZE}
              </p>
              <Meter value={seatsFilled} max={SQUAD_SIZE} label="Your squad" />
            </>
          ) : null}
        </section>

        <section
          aria-labelledby="purses-heading"
          {...stylex.props(styles.panel)}
        >
          <h2 id="purses-heading" {...stylex.props(styles.panelTitle)}>
            Purses
          </h2>
          <ul {...stylex.props(styles.owner)}>
            {auction.purses.map((item) => (
              <li key={item.guestId} {...stylex.props(styles.ownerRow)}>
                <span>
                  {item.displayName}
                  {item.guestId === guestId ? " (you)" : ""}
                </span>
                <span>
                  {formatLakhs(item.purseLakhs)} · {item.squad.length} of{" "}
                  {SQUAD_SIZE}
                </span>
                <Meter
                  value={item.squad.length}
                  max={SQUAD_SIZE}
                  label={`${item.displayName}'s squad`}
                />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="log-heading" {...stylex.props(styles.panel)}>
          <h2 id="log-heading" {...stylex.props(styles.panelTitle)}>
            Bid log
          </h2>
          {auction.log.length === 0 ? (
            <p {...stylex.props(styles.note)}>No bids yet on this auction.</p>
          ) : (
            <ol {...stylex.props(styles.log)}>
              {[...auction.log]
                .reverse()
                .slice(0, LOG_LENGTH)
                .map((entry) => (
                  <li key={entry.sequence} {...stylex.props(styles.logItem)}>
                    <span>
                      {entry.displayName} on {entry.playerName}
                    </span>
                    <span {...stylex.props(styles.logAmount)}>
                      {formatLakhs(entry.amountLakhs)}
                    </span>
                  </li>
                ))}
            </ol>
          )}
        </section>

        <section
          aria-labelledby="unsold-heading"
          {...stylex.props(styles.panel)}
        >
          <h2 id="unsold-heading" {...stylex.props(styles.panelTitle)}>
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
  );
}

/**
 * A progress meter for a count out of a maximum. The fill is scaled with
 * `transform` through a CSS variable, and the meter has an accessible name and
 * the value as text, so a screen reader hears the same number a sighted guest sees.
 *
 * @param props.value - The current count.
 * @param props.max - The count that means full.
 * @param props.label - What the meter counts, for a screen reader.
 * @returns A labelled meter.
 */
function Meter({
  value,
  max,
  label,
}: {
  readonly value: number;
  readonly max: number;
  readonly label: string;
}) {
  const fill = max === 0 ? 0 : Math.min(1, value / max);
  return (
    // The native <meter> cannot take the transform-scaled fill this design uses,
    // so the meter is a styled element with the same ARIA meter semantics.
    // biome-ignore lint/a11y/useSemanticElements: custom-styled meter, see above
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max}`}
      {...stylex.props(styles.meter)}
    >
      <span
        aria-hidden="true"
        style={{ "--fill": String(fill) } as CSSProperties}
        {...stylex.props(styles.meterFill)}
      />
    </div>
  );
}

/**
 * The role's name as the auction shows it, in words, so the chip never relies on
 * an abbreviation alone.
 *
 * @param role - The player's role.
 * @returns The role in plain words.
 */
function roleLabel(
  role: Auction["lot"] extends infer L
    ? L extends { player: { role: infer R } }
      ? R
      : never
    : never,
): string {
  const labels: Record<string, string> = {
    batter: "Batter",
    bowler: "Bowler",
    "all-rounder": "All-rounder",
    "wicket-keeper": "Wicket-keeper",
  };
  return labels[role] ?? role;
}
