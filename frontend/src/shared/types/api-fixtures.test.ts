import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";

import { auctionSchema } from "./auction.schema";
import { awardsSchema } from "./awards.schema";
import { leagueSchema } from "./league.schema";
import { lobbySchema } from "./lobby.schema";
import { playoffsSchema } from "./playoffs.schema";
import { squadSchema, startingXiSchema } from "./squad.schema";

/**
 * The shared API fixtures. The backend's Rust tests round-trip the same files through its DTOs,
 * so this test and that one keep the wire contract in step.
 */
const fixtureDirectory = fileURLToPath(
  new URL("../../../../data/fixtures/api/", import.meta.url),
);

/**
 * Reads one fixture and returns its JSON, unvalidated, for the schema under test.
 *
 * @param name - The fixture file name without its extension.
 * @returns The parsed JSON.
 * @throws A file-system error if the fixture is missing.
 */
function readFixture(name: string): unknown {
  const json: unknown = JSON.parse(
    readFileSync(`${fixtureDirectory}${name}.json`, "utf8"),
  );
  return json;
}

/**
 * Lists the schema issues for one fixture, so a failing test names the field that drifted.
 *
 * @param schema - The zod schema the endpoint's response must satisfy.
 * @param name - The fixture file name without its extension.
 * @returns The issues, which are empty when the fixture matches.
 */
function issuesFor(schema: ZodType, name: string): unknown[] {
  const result = schema.safeParse(readFixture(name));
  return result.success ? [] : result.error.issues;
}

describe("API fixtures", () => {
  it("match the lobby schema", () => {
    expect(issuesFor(lobbySchema, "lobby")).toEqual([]);
  });

  it("match the auction schema", () => {
    expect(issuesFor(auctionSchema, "auction")).toEqual([]);
  });

  it("match the squad schema", () => {
    expect(issuesFor(squadSchema, "squad")).toEqual([]);
  });

  it("reject a squad that is not 15 players", () => {
    const squad: unknown = readFixture("squad");
    if (typeof squad !== "object" || squad === null || !("players" in squad)) {
      throw new Error("the squad fixture has no players list");
    }
    const players: unknown = squad.players;
    if (!Array.isArray(players)) {
      throw new Error("the squad fixture's players are not a list");
    }

    expect(
      squadSchema.safeParse({ ...squad, players: players.slice(0, 14) })
        .success,
    ).toBe(false);
  });

  it("reject a starting XI that is not 11 players", () => {
    const playerIds = Array.from(
      { length: 10 },
      (_, index) => `player-${index}`,
    );

    expect(
      startingXiSchema.safeParse({
        playerIds,
        captainId: playerIds[0],
        viceCaptainId: playerIds[1],
      }).success,
    ).toBe(false);
  });

  it("match the league schema", () => {
    expect(issuesFor(leagueSchema, "league")).toEqual([]);
  });

  it("match the playoffs schema", () => {
    expect(issuesFor(playoffsSchema, "playoffs")).toEqual([]);
  });

  it("match the awards schema", () => {
    expect(issuesFor(awardsSchema, "awards")).toEqual([]);
  });
});
