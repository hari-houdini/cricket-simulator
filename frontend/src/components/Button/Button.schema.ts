import { boolean, object, string, enum as zodEnum } from "zod";

/** Visual weight of a button. Maps to the three variants in the design system. */
export const buttonVariants = ["primary", "secondary", "tertiary"] as const;

/** Touch-target size. `md` is the default and meets the 44px WCAG minimum. */
export const buttonSizes = ["sm", "md", "lg"] as const;

/**
 * Props the {@link Button} owns. Native button props are added in
 * `Button.types.ts`.
 *
 * An icon-only button has no visible text, so it must carry an `aria-label`.
 * The refine rejects an icon-only button without one, so the mistake fails
 * loudly during development instead of shipping an unlabeled control.
 */
export const buttonSchema = object({
  variant: zodEnum(buttonVariants).default("primary"),
  size: zodEnum(buttonSizes).default("md"),
  iconOnly: boolean().optional(),
  "aria-label": string().min(1).optional(),
}).refine((props) => !props.iconOnly || props["aria-label"] !== undefined, {
  message: "Icon-only buttons need an aria-label",
  path: ["aria-label"],
});
