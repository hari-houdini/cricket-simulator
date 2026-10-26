import { array, discriminatedUnion, literal, object, string } from "zod";

/** One choice in a dropdown. */
export const inputOptionSchema = object({
  value: string().min(1),
  label: string().min(1),
});

/**
 * Props the {@link Input} owns, discriminated by `kind`: a text field, a
 * dropdown, or a toggle. Every kind requires a visible `label`, so no control
 * relies on a placeholder for its name.
 */
export const inputSchema = discriminatedUnion("kind", [
  object({
    kind: literal("text"),
    label: string().min(1),
    placeholder: string().optional(),
  }),
  object({
    kind: literal("select"),
    label: string().min(1),
    options: array(inputOptionSchema).min(1),
  }),
  object({
    kind: literal("toggle"),
    label: string().min(1),
  }),
]);
