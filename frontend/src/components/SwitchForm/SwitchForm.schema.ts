import type { z } from "zod";
import { array, boolean, email, object, string, enum as zodEnum } from "zod";

import { inputTypes } from "../Input/Input.schema";

/** The two forms a {@link SwitchForm} can show. The order is the order of the tabs. */
export const switchModes = ["signUp", "signIn"] as const;

/** Accepts one of {@link switchModes}. Used to read a tab id back as a mode. */
export const switchModeSchema = zodEnum(switchModes);

/**
 * One field in a form panel: the key its value is stored under, its label, its
 * native type, and an optional placeholder example.
 */
export const switchFieldSchema = object({
  name: string().min(1),
  label: string().min(1),
  inputType: zodEnum(inputTypes),
  placeholder: string().min(1).optional(),
});

/**
 * The prompt shown on the overlay while a panel is active. It invites the
 * guest to switch to the other panel.
 */
export const switchPromptSchema = object({
  title: string().min(1),
  description: string().min(1),
  switchLabel: string().min(1),
});

/** One form panel: its heading, its tab label, its fields, its submit label, and its prompt. */
export const switchPanelSchema = object({
  title: string().min(1),
  tabLabel: string().min(1),
  fields: array(switchFieldSchema).min(1),
  submitLabel: string().min(1),
  prompt: switchPromptSchema,
});

/**
 * Props {@link SwitchForm} owns, validated on every render. `onSubmit` is a
 * function, so it is typed in `SwitchForm.types.ts` instead. `initialMode`
 * defaults to the sign-up panel, which is the one the design opens on. When
 * `disabled` is true, every input and button is disabled, so a pending request
 * cannot be submitted twice.
 */
export const switchFormSchema = object({
  "aria-label": string().min(1),
  initialMode: switchModeSchema.default("signUp"),
  disabled: boolean().default(false),
  signUp: switchPanelSchema,
  signIn: switchPanelSchema,
});

/**
 * Checks the values of one panel's fields and returns a message for each one that
 * fails. A blank field fails with "is required". An `email` field that is not blank
 * must parse as an email address. A valid panel returns an empty object.
 *
 * @param fields - The fields the panel shows, in order.
 * @param values - The current values, keyed by field name. A missing key counts as blank.
 * @returns The message for each invalid field, keyed by field name.
 */
export function fieldErrors(
  fields: readonly z.output<typeof switchFieldSchema>[],
  values: Readonly<Record<string, string>>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = (values[field.name] ?? "").trim();
    if (value === "") {
      errors[field.name] = `${field.label} is required`;
    } else if (
      field.inputType === "email" &&
      !email().safeParse(value).success
    ) {
      errors[field.name] = "Enter an email address, like name@example.com.";
    }
  }
  return errors;
}
