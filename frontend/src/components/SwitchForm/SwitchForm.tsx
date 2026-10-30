"use client";

import * as stylex from "@stylexjs/stylex";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import { Button } from "../Button/Button";
import { Input } from "../Input/Input";
import { Tabs } from "../Tabs/Tabs";
import {
  fieldErrors,
  switchFormSchema,
  switchModeSchema,
  switchModes,
} from "./SwitchForm.schema";
import { styles } from "./SwitchForm.styles";
import type { SwitchFormProps, SwitchMode } from "./SwitchForm.types";

/**
 * A sign-up and sign-in pair in one card. A 40% overlay carries the prompt to
 * switch: it slides to the other side of the card and shows the other form.
 * Below 768px the overlay is hidden, and a {@link Tabs} bar switches the forms.
 *
 * The inactive form is `inert`, so keyboard and assistive-tech users reach only
 * the visible form and the overlay. Submit validates the visible form's fields.
 * A valid form goes to `onSubmit`, and nothing is sent anywhere else.
 *
 * @param props - The two panels, the starting mode, the tabs' accessible name, and the submit handler.
 * @returns The card with both forms, the overlay, and the mobile tabs.
 * @throws {ZodError} When a panel has no fields or a copy string is empty, or `initialMode` is unknown.
 */
export function SwitchForm(props: SwitchFormProps) {
  const parsed = switchFormSchema.parse(props);
  const { onSubmit } = props;

  const [mode, setMode] = useState<SwitchMode>(parsed.initialMode);
  const [values, setValues] = useState<
    Record<SwitchMode, Record<string, string>>
  >({
    signUp: {},
    signIn: {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const other: SwitchMode = mode === "signUp" ? "signIn" : "signUp";

  /**
   * Shows the other form. Errors belong to the form being left, so they are cleared.
   *
   * @param next - The mode to show.
   */
  const switchTo = (next: SwitchMode) => {
    setMode(next);
    setErrors({});
  };

  /**
   * Stores one field's value under its panel, so each panel keeps what was typed.
   *
   * @param panel - The panel the field belongs to.
   * @param name - The field's name.
   * @returns A change handler for that field.
   */
  const change =
    (panel: SwitchMode, name: string) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { value } = event.target;
      setValues((current) => ({
        ...current,
        [panel]: { ...current[panel], [name]: value },
      }));
    };

  /**
   * Validates the visible form. Invalid fields get their messages. A valid form
   * is passed to `onSubmit`.
   *
   * @param event - The form's submit event. The browser's own validation is off, since this checks the values.
   */
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = fieldErrors(parsed[mode].fields, values[mode]);
    setErrors(found);
    if (Object.keys(found).length === 0) {
      onSubmit(mode, values[mode]);
    }
  };

  return (
    <div {...stylex.props(styles.card)}>
      <div {...stylex.props(styles.tabs)}>
        <Tabs
          aria-label={parsed["aria-label"]}
          tabs={switchModes.map((panel) => ({
            id: panel,
            label: parsed[panel].tabLabel,
          }))}
          value={mode}
          onChange={(id) => switchTo(switchModeSchema.parse(id))}
        />
      </div>

      {switchModes.map((panelMode) => {
        const panel = parsed[panelMode];
        const isActive = panelMode === mode;
        const titleId = `${panelMode}-title`;
        return (
          <form
            key={panelMode}
            aria-labelledby={titleId}
            noValidate
            inert={!isActive}
            onSubmit={submit}
            {...stylex.props(
              styles.panel,
              panelMode === "signUp" ? styles.panelSignUp : styles.panelSignIn,
              isActive ? styles.panelActive : styles.panelInactive,
            )}
          >
            <h2 id={titleId} {...stylex.props(styles.title)}>
              {panel.title}
            </h2>
            <div {...stylex.props(styles.fields)}>
              {panel.fields.map((field) => (
                <Input
                  key={field.name}
                  kind="text"
                  id={`${panelMode}-${field.name}`}
                  name={field.name}
                  label={field.label}
                  inputType={field.inputType}
                  value={values[panelMode][field.name] ?? ""}
                  onChange={change(panelMode, field.name)}
                  error={isActive ? errors[field.name] : undefined}
                />
              ))}
            </div>
            <Button type="submit" size="lg">
              {panel.submitLabel}
            </Button>
          </form>
        );
      })}

      <div
        {...stylex.props(
          styles.overlay,
          mode === "signIn" && styles.overlaySignIn,
        )}
      >
        <span aria-hidden="true" {...stylex.props(styles.decorLarge)} />
        <span aria-hidden="true" {...stylex.props(styles.decorSmall)} />
        <h2 {...stylex.props(styles.title)}>{parsed[mode].prompt.title}</h2>
        <p {...stylex.props(styles.description)}>
          {parsed[mode].prompt.description}
        </p>
        <Button variant="secondary" onClick={() => switchTo(other)}>
          {parsed[mode].prompt.switchLabel}
        </Button>
      </div>
    </div>
  );
}
