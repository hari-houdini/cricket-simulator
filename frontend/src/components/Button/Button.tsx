import * as stylex from "@stylexjs/stylex";

import { buttonSchema } from "./Button.schema";
import { styles } from "./Button.styles";
import type { ButtonProps } from "./Button.types";

/**
 * The app's button, in the three variants and three sizes from the design
 * system.
 *
 * Each variant has a motion from the snippet's button set: primary sweeps a
 * lighter gold across on hover, secondary draws gold edge lines, and tertiary
 * draws corner lines. Every variant shows a sheen on press. A selected button
 * (`aria-pressed="true"`) keeps the sheen looping. A disabled button takes the
 * filled look, and ignores hover and press.
 *
 * Props are validated against {@link buttonSchema} on every render. An invalid
 * combination, such as an icon-only button without an `aria-label`, throws, so
 * it fails during development instead of shipping. `type` defaults to
 * `"button"` so that a button inside a form does not submit it by accident.
 *
 * The decorative layers are `aria-hidden`, so the accessible name is the
 * children alone.
 *
 * @param props - Variant, size, icon-only flag, and native button props.
 * @returns A native `<button>` styled with StyleX.
 * @throws {ZodError} When the variant, size, or icon-only combination is invalid.
 */
export function Button({
  variant = "primary",
  size = "md",
  iconOnly,
  type = "button",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  buttonSchema.parse({
    variant,
    size,
    iconOnly,
    "aria-label": rest["aria-label"],
  });

  const pressed =
    rest["aria-pressed"] === true || rest["aria-pressed"] === "true";

  return (
    <button
      type={type}
      disabled={disabled}
      {...rest}
      {...stylex.props(
        // Marks this button so the fill and sheen's `when.ancestor` rules can match it.
        stylex.defaultMarker(),
        styles.base,
        variant === "primary" && styles.variantPrimary,
        variant === "secondary" && styles.variantSecondary,
        variant === "tertiary" && styles.variantTertiary,
        size === "sm" && styles.sizeSm,
        size === "md" && styles.sizeMd,
        size === "lg" && styles.sizeLg,
      )}
    >
      <span
        aria-hidden="true"
        {...stylex.props(
          styles.fill,
          variant === "primary" && styles.fillGold,
          variant !== "primary" && disabled && styles.fillMid,
          disabled && styles.fillFull,
        )}
      />
      <span
        aria-hidden="true"
        {...stylex.props(
          styles.sheen,
          pressed && !disabled && styles.sheenPressed,
        )}
      />
      <span {...stylex.props(styles.label)}>{children}</span>
    </button>
  );
}
