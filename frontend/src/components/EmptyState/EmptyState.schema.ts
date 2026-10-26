import { object, string } from "zod";

/**
 * Props the {@link EmptyState} owns. The defaults are the copy the design system
 * gives for an empty list.
 */
export const emptyStateSchema = object({
  title: string().min(1).default("No matches yet"),
  description: string().min(1).default("Check back soon"),
});
