import { object, string, enum as zodEnum } from "zod";

/**
 * Tones for a toast. `error` is announced as an alert. The others are status
 * messages, which screen readers announce politely without interrupting.
 */
export const toastTones = ["info", "success", "warning", "error"] as const;

/** Props the {@link Toast} owns. */
export const toastSchema = object({
  tone: zodEnum(toastTones).default("info"),
  message: string().min(1),
});
