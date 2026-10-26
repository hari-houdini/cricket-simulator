import { object, string } from "zod";

/**
 * Schema for an IPL franchise. Used to validate the franchise constants and
 * any franchise data that arrives from the backend.
 *
 * Named imports (not `import { z }`) keep the bundle small, since a namespace
 * import pulls in every zod export.
 */
export const teamSchema = object({
  /** Stable lowercase identifier, such as `"csk"`. */
  id: string().min(1),
  /** Full franchise name, such as `"Chennai Super Kings"`. */
  name: string().min(1),
  /** Two- to four-letter abbreviation shown alongside the color. */
  abbreviation: string().regex(/^[A-Z]{2,4}$/),
  /** Franchise color as a six-digit hex string, such as `"#F9CD05"`. */
  color: string().regex(/^#[0-9a-fA-F]{6}$/),
});
