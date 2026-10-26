import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { franchiseName } from "../../shared/utils/franchise-label";
import { LeagueTable } from "./LeagueTable";
import { midSeasonStandings } from "./LeagueTable.mock";

const meta = {
  component: LeagueTable,
  args: {
    standings: midSeasonStandings,
  },
} satisfies Meta<typeof LeagueTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The table in table order, with no column marked as sorted. */
export const TableOrder: Story = {
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table", { name: "League table" });
    const rows = within(table).getAllByRole("rowheader");
    await expect(rows[0]).toHaveTextContent(franchiseName("csk"));
    await expect(
      canvas.getByRole("columnheader", { name: "Points" }),
    ).toHaveAttribute("aria-sort", "none");
  },
};

/** Pressing a column header sorts largest first, and a second press reverses the order. */
export const SortByPoints: Story = {
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table", { name: "League table" });
    const points = canvas.getByRole("button", { name: "Points" });

    await userEvent.click(points);
    await expect(
      canvas.getByRole("columnheader", { name: "Points" }),
    ).toHaveAttribute("aria-sort", "descending");
    await expect(within(table).getAllByRole("rowheader")[0]).toHaveTextContent(
      franchiseName("csk"),
    );

    await userEvent.click(points);
    await expect(
      canvas.getByRole("columnheader", { name: "Points" }),
    ).toHaveAttribute("aria-sort", "ascending");
    await expect(within(table).getAllByRole("rowheader")[0]).toHaveTextContent(
      franchiseName("rcb"),
    );
  },
};
