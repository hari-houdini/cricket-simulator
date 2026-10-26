import * as stylex from "@stylexjs/stylex";

import { emptyStateSchema } from "./EmptyState.schema";
import { styles } from "./EmptyState.styles";
import type { EmptyStateProps } from "./EmptyState.types";

/**
 * Shown in place of a list or result that has nothing to display yet.
 *
 * By default it shows the navy-and-gold sphere from the app icon. A custom
 * `icon` replaces it. The title and description are text, so the state is clear
 * without the visual. The optional action lets the user recover, such as by
 * retrying the request.
 *
 * @param props - Title, description, and optional icon and action slots.
 * @returns A `<section>` with the visual, title, rule, description, and action.
 * @throws {ZodError} When the title or description is empty.
 */
export function EmptyState({ icon, action, ...rest }: EmptyStateProps) {
  const parsed = emptyStateSchema.parse(rest);

  return (
    <section {...stylex.props(styles.base)}>
      {icon ? (
        <div aria-hidden="true">{icon}</div>
      ) : (
        <span
          aria-hidden="true"
          data-testid="empty-state-sphere"
          {...stylex.props(styles.sphere)}
        />
      )}
      <h2 {...stylex.props(styles.title)}>{parsed.title}</h2>
      <span aria-hidden="true" {...stylex.props(styles.rule)} />
      <p {...stylex.props(styles.description)}>{parsed.description}</p>
      {action ? <div {...stylex.props(styles.action)}>{action}</div> : null}
    </section>
  );
}
