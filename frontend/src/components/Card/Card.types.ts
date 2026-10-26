import type { ComponentPropsWithoutRef } from "react";
import type { z } from "zod";

import type { cardSchema } from "./Card.schema";

/**
 * Props the {@link Card} component accepts: the schema's props plus native
 * `<div>` attributes. `className` is left out because styling is owned by StyleX.
 */
export type CardProps = z.input<typeof cardSchema> &
  Omit<ComponentPropsWithoutRef<"div">, "className">;
