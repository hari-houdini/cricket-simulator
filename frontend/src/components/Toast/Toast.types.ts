import type { z } from "zod";

import type { toastSchema } from "./Toast.schema";

/** Props the {@link Toast} component accepts, derived from {@link toastSchema}. */
export type ToastProps = z.input<typeof toastSchema>;
