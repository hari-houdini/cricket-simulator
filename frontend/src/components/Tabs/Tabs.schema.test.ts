import { describe, expect, it } from "vitest";

import { tabsSchema } from "./Tabs.schema";

const tabs = [
  { id: "upcoming", label: "Upcoming" },
  { id: "development", label: "Development" },
];

describe("tabsSchema", () => {
  it("accepts two tabs with unique ids and a value that names one of them", () => {
    const result = tabsSchema.safeParse({
      "aria-label": "Fixture status",
      tabs,
      value: "upcoming",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a single tab, since one tab is not a choice", () => {
    const result = tabsSchema.safeParse({
      "aria-label": "Fixture status",
      tabs: [tabs[0]],
      value: "upcoming",
    });

    expect(result.success).toBe(false);
  });

  it("rejects two tabs that share an id", () => {
    const result = tabsSchema.safeParse({
      "aria-label": "Fixture status",
      tabs: [
        { id: "upcoming", label: "Upcoming" },
        { id: "upcoming", label: "Again" },
      ],
      value: "upcoming",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a value that matches no tab, so the glider would have nowhere to sit", () => {
    const result = tabsSchema.safeParse({
      "aria-label": "Fixture status",
      tabs,
      value: "completed",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a missing accessible name for the tablist", () => {
    const result = tabsSchema.safeParse({
      "aria-label": "",
      tabs,
      value: "upcoming",
    });

    expect(result.success).toBe(false);
  });
});
