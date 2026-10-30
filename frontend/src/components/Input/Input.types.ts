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
  /**
   * A message that says why the value is wrong. It is shown under a text field
   * and linked to it with `aria-describedby`, and the field is marked
   * `aria-invalid`. Leave it out when the value is fine.
   */
  error?: string | undefined;
};
