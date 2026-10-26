import type { z } from "zod";

import type { errorBannerSchema } from "./ErrorBanner.schema";

/** Props the {@link ErrorBanner} component accepts, derived from {@link errorBannerSchema}. */
export type ErrorBannerProps = z.input<typeof errorBannerSchema>;
