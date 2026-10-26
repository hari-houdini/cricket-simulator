import type { z } from "zod";

import type { skeletonSchema } from "./Skeleton.schema";

/** Props the {@link Skeleton} component accepts, derived from {@link skeletonSchema}. */
export type SkeletonProps = z.input<typeof skeletonSchema>;
