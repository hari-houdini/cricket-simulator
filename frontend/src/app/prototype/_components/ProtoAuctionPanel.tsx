"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useGuestSession } from "../../../components/GuestSessionProvider/GuestSessionProvider";
import {
  notify,
  useConnectionNotice,
} from "../../../components/Notifier/Notifier";
import type { Auction } from "../../../shared/types/auction.types";
import { describeApiError } from "../../../shared/utils/describe-api-error";
import { formatLakhs } from "../../../shared/utils/format-money";
import { ProtoAuctionView } from "./ProtoAuctionView";

/** How often the auction is re-read, so other owners' bids appear without a reload. */
const POLL_MS = 1000;

/** How often the countdown moves on. A quarter second keeps the ring steady. */
const TICK_MS = 250;

/** The seconds left at which the live region announces the timer. */
const WARNING_SECONDS = [5] as const;

/** The props for {@link ProtoAuctionPanel}. */
type ProtoAuctionPanelProps = {
  /** The lobby whose auction is running. */
  readonly code: string;
};

/**
 * The prototype's live auction. It reads the auction every second, moves the
 * countdown on, and re-reads it the moment a lot's timer runs out, so the hammer
 * shows without waiting for the next poll. It raises a notice when the guest is
 * outbid or wins a lot, and announces each bid and the last-five-seconds warning
 * to screen readers.
 *
 * The logic matches the production {@link AuctionPanel}. Only the view differs.
 *
 * @param props.code - The lobby whose auction is running.
 * @returns The auction, or a loading or error line while it loads.
 */
export function ProtoAuctionPanel({ code }: ProtoAuctionPanelProps) {
  const { api, guestId } = useGuestSession();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState("");
  const previous = useRef<{
    lotId: string | null;
    highBidderId: string | null;
  } | null>(null);
  const announcedWarnings = useRef(new Set<string>());
  const seenBids = useRef(0);
  const announcedLot = useRef<string | null | undefined>(undefined);
  const seenSales = useRef(0);

  const refresh = useCallback(async () => {
    try {
      setAuction(await api.getAuction(code));
      setLoadError(null);
    } catch (caught) {
      setLoadError(describeApiError(caught));
    }
  }, [api, code]);

  // Read the auction now, then keep reading it while it runs.
  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  // Move the countdown on.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // A lot whose timer has run out is settled now, not at the next poll.
  useEffect(() => {
    if (auction?.lot && now >= auction.lot.endsAt) {
      void refresh();
    }
  }, [auction, now, refresh]);

  // Once the auction is on screen, a failed read stays visible until a read succeeds.
  useConnectionNotice(auction ? loadError : null);

  // Compare with the last read: a lot that changed hands, or a guest who lost the lead.
  useEffect(() => {
    if (!auction || !guestId) {
      return;
    }
    const lotId = auction.lot?.player.id ?? null;
    const highBidderId = auction.lot?.highBid?.guestId ?? null;
    const before = previous.current;
    previous.current = { lotId, highBidderId };
    if (!before) {
      return;
    }

    if (before.lotId !== lotId && before.highBidderId === guestId) {
      const sale = auction.sold.at(-1);
      if (sale?.guestId === guestId) {
        notify({
          tone: "success",
          message: `You won ${sale.player.name} for ${formatLakhs(sale.amountLakhs)}.`,
        });
      }
    } else if (
      before.lotId === lotId &&
      before.highBidderId === guestId &&
      highBidderId !== null &&
      highBidderId !== guestId
    ) {
      notify({
        tone: "warning",
        message: `You were outbid on ${auction.lot?.player.name ?? "this player"}.`,
      });
    }
  }, [auction, guestId]);

  // Announce the newest bid, and the result of each lot when it ends.
  useEffect(() => {
    if (!auction) {
      return;
    }
    if (auction.log.length > seenBids.current) {
      const latest = auction.log.at(-1);
      if (latest) {
        setAnnouncement(
          `${latest.displayName} bid ${formatLakhs(latest.amountLakhs)} for ${latest.playerName}.`,
        );
      }
    }
    seenBids.current = auction.log.length;

    const lotId = auction.lot?.player.id ?? null;
    const lotEnded =
      announcedLot.current !== undefined && announcedLot.current !== lotId;
    announcedLot.current = lotId;
    const soldNow = auction.sold.length > seenSales.current;
    seenSales.current = auction.sold.length;
    if (lotEnded) {
      const sale = auction.sold.at(-1);
      const unsold = auction.unsold.at(-1);
      if (soldNow && sale) {
        setAnnouncement(
          `${sale.player.name} sold to ${sale.displayName} for ${formatLakhs(sale.amountLakhs)}.`,
        );
      } else if (unsold) {
        setAnnouncement(`${unsold.name} went unsold.`);
      }
    }
  }, [auction]);

  // Announce the timer at its warning mark, once per lot.
  useEffect(() => {
    const lot = auction?.lot;
    if (!lot) {
      return;
    }
    const secondsLeft = Math.ceil(Math.max(0, lot.endsAt - now) / 1000);
    for (const mark of WARNING_SECONDS) {
      const key = `${lot.player.id}:${mark}`;
      if (
        secondsLeft <= mark &&
        secondsLeft > 0 &&
        !announcedWarnings.current.has(key)
      ) {
        announcedWarnings.current.add(key);
        setAnnouncement(`${mark} seconds left on ${lot.player.name}.`);
      }
    }
  }, [auction, now]);

  /**
   * Places a bid at the lot's minimum next amount. On a refusal the auction is
   * read again, since the lot may already have moved on.
   *
   * @param amountLakhs - The minimum next bid, as the button offered it.
   */
  async function placeBid(amountLakhs: number) {
    if (!guestId) {
      return;
    }
    setPending(true);
    try {
      setAuction(await api.placeBid({ code, guestId, amountLakhs }));
    } catch (caught) {
      notify({ tone: "error", message: describeApiError(caught) });
      await refresh();
    } finally {
      setPending(false);
    }
  }

  if (!auction || !guestId) {
    if (loadError) {
      return <p role="alert">{loadError}</p>;
    }
    return <p aria-busy="true">Loading the auction…</p>;
  }

  return (
    <ProtoAuctionView
      auction={auction}
      guestId={guestId}
      now={now}
      pending={pending}
      announcement={announcement}
      onBid={(amountLakhs) => void placeBid(amountLakhs)}
    />
  );
}
