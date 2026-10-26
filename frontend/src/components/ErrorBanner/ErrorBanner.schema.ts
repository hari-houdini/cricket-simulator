import { object, string } from "zod";

/**
 * Props the {@link ErrorBanner} owns. The default message is the design system's
 * copy for a dropped connection that is retrying.
 */
export const errorBannerSchema = object({
  message: string().min(1).default("Connection unstable. Retrying..."),
});
