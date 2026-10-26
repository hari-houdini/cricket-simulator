import { boolean, object, string } from "zod";

/**
 * Props the {@link Modal} owns. `title` names the dialog for assistive
 * technology, so it is required and must not be empty.
 */
export const modalSchema = object({
  title: string().min(1),
  open: boolean(),
});
