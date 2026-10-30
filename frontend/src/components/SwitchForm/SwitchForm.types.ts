import type { z } from "zod";

import type { switchFormSchema, switchPanelSchema } from "./SwitchForm.schema";

/** Which form is showing: sign-up or sign-in. */
export type SwitchMode = z.output<typeof switchFormSchema>["initialMode"];

/** One form panel as the caller passes it: its copy, fields, and overlay prompt. */
export type SwitchPanel = z.input<typeof switchPanelSchema>;

/**
 * Props the {@link SwitchForm} component accepts. The schema owns the copy and
 * the field lists. `onSubmit` runs only when the visible form's values pass
 * validation, and it receives the mode and the values as typed.
 */
export type SwitchFormProps = z.input<typeof switchFormSchema> & {
  /** Called with the visible form's mode and its field values when the form is valid. */
  readonly onSubmit: (mode: SwitchMode, values: Record<string, string>) => void;
};
