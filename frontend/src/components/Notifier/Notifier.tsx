"use client";

import { useEffect } from "react";
import { Toaster, toast } from "sonner";

import { Toast } from "../Toast/Toast";
import type { ToastProps } from "../Toast/Toast.types";
import { CONNECTION_NOTICE_ID } from "./Notifier.const";

/**
 * Options for one notice. `id` lets a caller replace or dismiss it later, and
 * `duration` overrides the default lifetime. `Infinity` keeps it until dismissed.
 */
type NoticeOptions = {
  readonly id?: string;
  readonly duration?: number;
};

/**
 * The app's one toast region. Mount it once, in the app providers.
 *
 * Sonner keeps the region `position: fixed`, so a notice floats over the page
 * and never takes up space in the layout. That is why notices replaced the
 * banners: a banner pushed the content down when it appeared.
 *
 * Each notice is rendered by our own {@link Toast}, not Sonner's card, so the
 * tone and its `role` (`alert` for errors) stay in one place and the styling
 * stays in StyleX.
 *
 * @returns The toast region, which is empty until a notice is shown.
 */
export function Notifier() {
  return <Toaster position="top-center" />;
}

/**
 * Shows a notice in the toast region and returns its id.
 *
 * Call it from an event handler or an effect, never during render, since it
 * updates the region. The message is checked by {@link Toast} when it renders.
 *
 * @param props - The tone and message of the notice.
 * @param options - An optional fixed `id` and `duration` for the notice.
 * @returns The id of the notice, for {@link toast.dismiss}.
 * @throws {ZodError} When the message is empty, which fails when the notice renders.
 */
export function notify(
  props: ToastProps,
  options: NoticeOptions = {},
): string | number {
  return toast.custom(() => <Toast {...props} />, options);
}

/**
 * Keeps a connection notice on screen while `message` is set, and removes it
 * once `message` clears. Use it for a read that fails while the view still has
 * data to show: the notice stays until the next read succeeds, so a guest
 * cannot miss that the connection is down.
 *
 * @param message - The current read error, or `null` once the read succeeds.
 */
export function useConnectionNotice(message: string | null): void {
  useEffect(() => {
    if (message === null) {
      return;
    }
    const id = notify(
      { tone: "error", message },
      { id: CONNECTION_NOTICE_ID, duration: Number.POSITIVE_INFINITY },
    );
    return () => {
      toast.dismiss(id);
    };
  }, [message]);
}
