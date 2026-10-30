import * as stylex from "@stylexjs/stylex";

import { inputSchema } from "./Input.schema";
import { styles } from "./Input.styles";
import type { InputProps } from "./Input.types";

/**
 * A labeled form control: a text field, a dropdown, or a toggle.
 *
 * The visible label is always linked to the control through `id`, so the
 * control's accessible name matches what the user sees. A toggle is a native
 * checkbox, which already exposes its checked state to assistive technology. A
 * styled knob would need pseudo-elements, which browsers don't render on checkboxes.
 *
 * @param props - The control `kind`, its label, and the control's id, value, and handler.
 * @returns A `<div>` with the label and control.
 * @throws {ZodError} When `kind` is unknown, the label is missing, or a dropdown has no options.
 */
export function Input(props: InputProps) {
  const parsed = inputSchema.parse(props);
  const { id, name, disabled, value, checked, onChange, error } = props;

  if (parsed.kind === "text") {
    const errorId = `${id}-error`;
    return (
      <div {...stylex.props(styles.field)}>
        <label htmlFor={id} {...stylex.props(styles.label)}>
          {parsed.label}
        </label>
        <input
          id={id}
          name={name}
          type={parsed.inputType}
          placeholder={parsed.placeholder}
          disabled={disabled}
          value={value}
          onChange={onChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...stylex.props(
            styles.control,
            error ? styles.controlInvalid : null,
          )}
        />
        {error ? (
          <p id={errorId} {...stylex.props(styles.error)}>
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (parsed.kind === "select") {
    return (
      <div {...stylex.props(styles.field)}>
        <label htmlFor={id} {...stylex.props(styles.label)}>
          {parsed.label}
        </label>
        <select
          id={id}
          name={name}
          disabled={disabled}
          value={value}
          onChange={onChange}
          {...stylex.props(styles.control)}
        >
          {parsed.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <label {...stylex.props(styles.toggleRow)}>
      <input
        id={id}
        name={name}
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={onChange}
        {...stylex.props(styles.toggle)}
      />
      {parsed.label}
    </label>
  );
}
