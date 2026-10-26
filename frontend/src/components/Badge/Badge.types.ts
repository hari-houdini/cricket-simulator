import type { z } from "zod";

import type { badgeSchema } from "./Badge.schema";

/**
 * Props the {@link Badge} component accepts, discriminated by `kind`. Derived
 * from {@link badgeSchema}.
 */
export type BadgeProps = z.input<typeof badgeSchema>;
