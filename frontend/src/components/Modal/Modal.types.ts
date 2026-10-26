import type { ReactNode } from "react";
import type { z } from "zod";

import type { modalSchema } from "./Modal.schema";

/**
 * Props the {@link Modal} component accepts. The schema's props, plus the
 * close handler and the dialog's content.
 */
export type ModalProps = z.input<typeof modalSchema> & {
  /** Called when the close button is pressed or Escape is pressed inside the dialog. */
  onClose: () => void;
  children?: ReactNode;
};
