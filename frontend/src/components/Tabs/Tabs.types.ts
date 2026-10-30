import type { z } from "zod";

import type { tabsSchema } from "./Tabs.schema";

/** One tab: the id the parent stores, and the label the guest reads. */
export type TabItem = z.output<typeof tabsSchema>["tabs"][number];

/**
 * Props the {@link Tabs} component accepts. It is controlled, so the parent
 * keeps `value` and updates it in `onChange`.
 */
export type TabsProps = z.input<typeof tabsSchema> & {
  /** Called with the id of the tab the guest picks, by click or arrow key. */
  readonly onChange: (id: string) => void;
};
