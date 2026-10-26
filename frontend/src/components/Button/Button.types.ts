import type { ComponentPropsWithoutRef } from "react";
import type { z } from "zod";

import type { buttonSchema } from "./Button.schema";

/**
 * Props the {@link Button} component accepts. The zod-owned props come from
 * {@link buttonSchema}, and the rest are the native `<button>` attributes.
 * `className` is left out because styling is owned by StyleX.
 */
export type ButtonProps = z.input<typeof buttonSchema> &
  Omit<ComponentPropsWithoutRef<"button">, "className">;

/** Visual weight of a button, derived from the schema. */
export type ButtonVariant = z.output<typeof buttonSchema>["variant"];

/** Touch-target size of a button, derived from the schema. */
export type ButtonSize = z.output<typeof buttonSchema>["size"];
