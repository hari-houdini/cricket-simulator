import * as stylex from "@stylexjs/stylex";

import { buttonSchema } from "./Button.schema";
import { styles } from "./Button.styles";
import type { ButtonProps } from "./Button.types";

/**
 * The app's button, in the three variants and three sizes from the design
 * system.
 *
 * Props are validated against {@link buttonSchema} on every render. An invalid
 * combination, such as an icon-only button without an `aria-label`, throws, so
 * it fails during development instead of shipping. `type` defaults to
 * `"button"` so that a button inside a form does not submit it by accident.
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
  children,
  ...rest
}: ButtonProps) {
  buttonSchema.parse({
    variant,
    size,
    iconOnly,
    "aria-label": rest["aria-label"],
  });

  return (
    <button
      type={type}
      {...rest}
      {...stylex.props(
        styles.base,
        variant === "primary" && styles.variantPrimary,
        variant === "secondary" && styles.variantSecondary,
        variant === "tertiary" && styles.variantTertiary,
        size === "sm" && styles.sizeSm,
        size === "md" && styles.sizeMd,
        size === "lg" && styles.sizeLg,
      )}
    >
      {children}
    </button>
  );
}
