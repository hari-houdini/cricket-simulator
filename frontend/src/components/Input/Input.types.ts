import type { ChangeEventHandler } from "react";
import type { z } from "zod";

import type { inputSchema } from "./Input.schema";

/**
 * Props the {@link Input} component accepts: the schema's props, plus the
 * control's id, name, state, and change handler. `id` is required so the
 * visible label can be linked to the control.
 */
export type InputProps = z.input<typeof inputSchema> & {
  id: string;
  name?: string;
  disabled?: boolean;
  value?: string;
  checked?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLSelectElement>;
};
