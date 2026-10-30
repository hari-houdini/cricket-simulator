import { array, object, string } from "zod";

/**
 * Props {@link Tabs} owns, validated on every render. The change handler is a
 * function, so it is typed in `Tabs.types.ts` instead.
 *
 * Two tabs is the minimum, since one tab is not a choice. Ids must be unique
 * because they are the React keys and the values the parent stores. `value`
 * must name one of them, so the glider always has a tab to sit on.
 */
export const tabsSchema = object({
  "aria-label": string().min(1),
  value: string().min(1),
  tabs: array(
    object({
      id: string().min(1),
      label: string().min(1),
    }),
  ).min(2),
})
  .refine(
    (props) =>
      new Set(props.tabs.map((tab) => tab.id)).size === props.tabs.length,
    { message: "Tab ids must be unique", path: ["tabs"] },
  )
  .refine((props) => props.tabs.some((tab) => tab.id === props.value), {
    message: "value must match one of the tab ids",
    path: ["value"],
  });
