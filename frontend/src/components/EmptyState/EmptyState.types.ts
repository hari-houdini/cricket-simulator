import type { ReactNode } from "react";
import type { z } from "zod";

import type { emptyStateSchema } from "./EmptyState.schema";

/**
 * Props the {@link EmptyState} component accepts. `action` is a slot, not a
 * built-in button, so the caller supplies the control. This keeps the component
 * free of any import from the button's folder.
 */
export type EmptyStateProps = z.input<typeof emptyStateSchema> & {
  /** Optional illustration or symbol, decorative by default. */
  icon?: ReactNode;
  /** Optional call to action, such as a Retry button. */
  action?: ReactNode;
};
