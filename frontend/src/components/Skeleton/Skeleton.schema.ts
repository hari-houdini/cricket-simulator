import { object, string } from "zod";

/**
 * Props the {@link Skeleton} owns. Width and height are CSS lengths, such as
 * `"100%"` or `"16px"`, applied as inline size because they vary per use.
 */
export const skeletonSchema = object({
  width: string().min(1).default("100%"),
  height: string().min(1).default("16px"),
});
