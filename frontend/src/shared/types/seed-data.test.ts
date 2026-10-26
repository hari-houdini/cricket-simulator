import { describe, expect, it } from "vitest";

import franchisesFile from "../../../../data/seeds/franchises.v1.json";
import scheduleFile from "../../../../data/seeds/ipl-schedule.v1.json";
import playersFile from "../../../../data/seeds/players.v1.json";
import {
  FRANCHISE_COUNT,
  LEAGUE_ROUNDS,
  MATCHES_PER_FRANCHISE,
} from "../const/league.const";
import { PLAYER_POOL } from "../const/player.const";
import { SEED_VERSION } from "../const/seed.const";
import { TEAMS } from "../const/teams.const";
import {
  franchiseSeedFileSchema,
  playerSeedFileSchema,
  scheduleSeedFileSchema,
} from "./seed.schema";

// Parsing here means a malformed seed file fails the whole suite, not one test.
const franchises = franchiseSeedFileSchema.parse(franchisesFile).franchises;
const players = playerSeedFileSchema.parse(playersFile).players;
const schedule = scheduleSeedFileSchema.parse(scheduleFile);

const franchiseIds = new Set(franchises.map((franchise) => franchise.id));

/**
 * Counts how many league matches each pair of franchises plays, keyed by the
 * two ids in sorted order so `"csk|mi"` and `"mi|csk"` are the same pair.
 *
 * @returns A map from pair key to match count.
 */
function countPairMeetings(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const match of schedule.league) {
    const key = [match.homeFranchiseId, match.awayFranchiseId].sort().join("|");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

describe("franchise seed", () => {
  it("matches the franchises in teams.const, so the two sources cannot drift", () => {
    expect(franchises).toEqual([...TEAMS]);
  });

  it("holds exactly one entry per league franchise", () => {
    expect(franchises).toHaveLength(FRANCHISE_COUNT);
  });
});

describe("player seed", () => {
  it("has the approved pool size and category split", () => {
    const current = players.filter((player) => !player.retired);
    const count = (category: string) =>
      players.filter((player) => player.category === category).length;

    expect(players).toHaveLength(PLAYER_POOL.total);
    expect(count("marquee")).toBe(PLAYER_POOL.marquee);
    expect(count("capped")).toBe(PLAYER_POOL.capped);
    expect(count("uncapped")).toBe(PLAYER_POOL.uncapped);
    expect(players.filter((player) => player.retired)).toHaveLength(
      PLAYER_POOL.retired,
    );
    expect(current).toHaveLength(PLAYER_POOL.current);
  });

  it("gives every player a unique id and a unique name", () => {
    expect(new Set(players.map((player) => player.id)).size).toBe(
      players.length,
    );
    expect(new Set(players.map((player) => player.name)).size).toBe(
      players.length,
    );
  });

  it("never lists a retired player as uncapped, since retired players were capped", () => {
    expect(
      players.some(
        (player) => player.retired && player.category === "uncapped",
      ),
    ).toBe(false);
  });

  it("refers only to franchises that exist in the franchise seed", () => {
    for (const player of players) {
      if (player.franchiseId !== null) {
        expect(franchiseIds.has(player.franchiseId)).toBe(true);
      }
    }
  });

  it("gives each trouble rating that is set as an integer from 0 to 10", () => {
    // An unrated player takes DEFAULT_TROUBLE_RATING. Writing 0 for a player
    // whose record was never verified would make that player look clean.
    for (const player of players) {
      if (player.troubleRating !== undefined) {
        expect(Number.isInteger(player.troubleRating)).toBe(true);
        expect(player.troubleRating).toBeGreaterThanOrEqual(0);
        expect(player.troubleRating).toBeLessThanOrEqual(10);
      }
    }
  });

  it("gives every franchise a squad-capable current pool", () => {
    for (const franchise of franchises) {
      const current = players.filter(
        (player) => !player.retired && player.franchiseId === franchise.id,
      );
      const bowlingOptions = current.filter(
        (player) => player.role === "bowler" || player.role === "all-rounder",
      );

      expect(current.length, franchise.id).toBeGreaterThanOrEqual(15);
      expect(
        current.some((player) => player.role === "wicket-keeper"),
        `${franchise.id} needs a wicket-keeper`,
      ).toBe(true);
      expect(
        bowlingOptions.length,
        `${franchise.id} bowling options`,
      ).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("schedule seed", () => {
  it("runs 14 rounds with five matches in each, and every franchise once per round", () => {
    for (let round = 1; round <= LEAGUE_ROUNDS; round++) {
      const matches = schedule.league.filter((match) => match.round === round);
      const teams = matches.flatMap((match) => [
        match.homeFranchiseId,
        match.awayFranchiseId,
      ]);

      expect(matches, `round ${round} match count`).toHaveLength(
        FRANCHISE_COUNT / 2,
      );
      expect(new Set(teams).size, `round ${round} teams`).toBe(FRANCHISE_COUNT);
    }
  });

  it("plays each franchise 14 times and hosts 7 of them", () => {
    for (const id of franchiseIds) {
      const played = schedule.league.filter(
        (match) => match.homeFranchiseId === id || match.awayFranchiseId === id,
      );
      const hosted = schedule.league.filter(
        (match) => match.homeFranchiseId === id,
      );

      expect(played, `${id} matches`).toHaveLength(MATCHES_PER_FRANCHISE);
      expect(hosted, `${id} home matches`).toHaveLength(
        MATCHES_PER_FRANCHISE / 2,
      );
    }
  });

  it("has every pair of franchises meet at least once, and at most twice", () => {
    const counts = countPairMeetings();
    const pairs = (FRANCHISE_COUNT * (FRANCHISE_COUNT - 1)) / 2;

    expect(counts.size).toBe(pairs);
    for (const [pair, meetings] of counts) {
      expect(meetings, pair).toBeGreaterThanOrEqual(1);
      expect(meetings, pair).toBeLessThanOrEqual(2);
    }
  });

  it("has each franchise meet exactly five opponents twice", () => {
    const counts = countPairMeetings();

    for (const id of franchiseIds) {
      const twice = [...counts].filter(
        ([pair, meetings]) => meetings === 2 && pair.split("|").includes(id),
      );
      expect(twice, `${id} double opponents`).toHaveLength(5);
    }
  });

  it("lists the playoffs in IPL order, with each slot fed by the right earlier match", () => {
    expect(schedule.playoffs).toEqual([
      {
        round: 15,
        slot: "qualifier-1",
        home: { kind: "standing", position: 1 },
        away: { kind: "standing", position: 2 },
      },
      {
        round: 16,
        slot: "eliminator",
        home: { kind: "standing", position: 3 },
        away: { kind: "standing", position: 4 },
      },
      {
        round: 17,
        slot: "qualifier-2",
        home: { kind: "loser", slot: "qualifier-1" },
        away: { kind: "winner", slot: "eliminator" },
      },
      {
        round: 18,
        slot: "final",
        home: { kind: "winner", slot: "qualifier-1" },
        away: { kind: "winner", slot: "qualifier-2" },
      },
    ]);
  });

  it("refers only to franchises that exist in the franchise seed", () => {
    for (const match of schedule.league) {
      expect(franchiseIds.has(match.homeFranchiseId)).toBe(true);
      expect(franchiseIds.has(match.awayFranchiseId)).toBe(true);
    }
  });
});

describe("seed files", () => {
  it("all pin the same seed version, which lobbies record", () => {
    expect(franchisesFile.seedVersion).toBe(SEED_VERSION);
    expect(playersFile.seedVersion).toBe(SEED_VERSION);
    expect(scheduleFile.seedVersion).toBe(SEED_VERSION);
  });
});
