import { CATCH_RATE } from "../const/awards.const";
import { createSeededRandom } from "./seeded-random";

/** The ratings the engine needs from a player who takes the field. */
export type PlayingPlayer = {
  readonly id: string;
  readonly batting: number;
  readonly bowling: number;
  readonly fielding: number;
};

/**
 * One franchise's eleven on the field, in batting order. The order matters: the
 * first players in it bat first.
 */
export type PlayingSide = {
  readonly franchiseId: string;
  readonly xi: readonly PlayingPlayer[];
};

/** What one player did in one match, allocated from the innings totals. */
export type PlayerPerformance = {
  readonly playerId: string;
  readonly franchiseId: string;
  /** 1 for the first player in the batting order, and so on. Used to break ties. */
  readonly battingPosition: number;
  readonly batted: boolean;
  readonly runs: number;
  readonly wickets: number;
  readonly catches: number;
  readonly runsConceded: number;
};

/** A share of a total, paired with the entry it belongs to. */
export type Share<T> = {
  readonly entry: T;
  readonly share: number;
};

/** One fractional part, while a total is being split. */
type Part<T> = Share<T> & {
  readonly fraction: number;
};

/**
 * Splits a total across entries in proportion to their weights, in whole numbers
 * that add up to the total. Remainders go to the largest fractions first. A tie
 * goes to the earlier entry, since the sort is stable, so the split is the same
 * every time.
 *
 * @param total - The whole amount to split, such as runs or wickets.
 * @param entries - The entries to share out, each with a weight. A weight of 0 gets nothing.
 * @returns One share per entry, in the same order, summing to `total`. Equal shares when every weight is 0.
 */
export function allocate<T extends { readonly weight: number }>(
  total: number,
  entries: readonly T[],
): Share<T>[] {
  const sum = entries.reduce((running, entry) => running + entry.weight, 0);
  const parts: Part<T>[] = entries.map((entry) => {
    const exact =
      sum > 0 ? (total * entry.weight) / sum : total / entries.length;
    const floor = Math.floor(exact);
    return { entry, share: floor, fraction: exact - floor };
  });
  const remaining =
    total - parts.reduce((running, part) => running + part.share, 0);
  const bumped = new Set(
    [...parts]
      .sort((left, right) => right.fraction - left.fraction)
      .slice(0, remaining),
  );
  return parts.map((part) => ({
    entry: part.entry,
    share: part.share + (bumped.has(part) ? 1 : 0),
  }));
}

/**
 * A rating turned into a weight with a seeded factor between 0.5 and 1.5, so a
 * strong player takes more of the innings but not always the same share.
 *
 * @param rating - The player's rating for the skill.
 * @param draw - A seeded draw in [0, 1).
 * @returns The weight for this innings.
 */
function weight(rating: number, draw: number): number {
  return rating * (0.5 + draw);
}

/** A player's totals across one match, before they are turned into a {@link PlayerPerformance}. */
type Tally = {
  runs: number;
  wickets: number;
  catches: number;
  runsConceded: number;
  batted: boolean;
};

/** A batter, with whether he bats in this innings and the weight of his share of the runs. */
type Batter = {
  readonly player: PlayingPlayer;
  readonly batted: boolean;
  readonly weight: number;
};

/** A player on the fielding side, with the weight of his share of one total. */
type Fielder = {
  readonly player: PlayingPlayer;
  readonly weight: number;
};

/**
 * Splits one innings between the batting side and the fielding side. The
 * batters who bat are the first `wickets + 1` (at most eleven), and they share
 * the runs by batting rating. The bowling side shares the wickets and the runs
 * conceded by bowling rating, and the catches by fielding rating. Every draw is
 * taken in a fixed order, so the same seed always gives the same split.
 *
 * @param batting - The side batting in this innings.
 * @param fielding - The side fielding in this innings.
 * @param runs - The innings total.
 * @param wickets - Wickets lost by the batting side.
 * @param random - The seeded draw source.
 * @param tallies - Each player's running totals for the match, changed in place.
 */
function playInnings(
  batting: PlayingSide,
  fielding: PlayingSide,
  runs: number,
  wickets: number,
  random: () => number,
  tallies: Map<string, Tally>,
) {
  const battersIn = Math.min(batting.xi.length, wickets + 1);
  const batters: Batter[] = batting.xi.map((player, index) => {
    const draw = random();
    const batted = index < battersIn;
    return {
      player,
      batted,
      weight: batted ? weight(player.batting, draw) : 0,
    };
  });
  for (const { entry, share } of allocate(runs, batters)) {
    const tally = tallyFor(tallies, entry.player.id);
    tally.runs += share;
    tally.batted = entry.batted;
  }

  const bowlers: Fielder[] = fielding.xi.map((player) => ({
    player,
    weight: weight(player.bowling, random()),
  }));
  const catchers: Fielder[] = fielding.xi.map((player) => ({
    player,
    weight: weight(player.fielding, random()),
  }));
  for (const { entry, share } of allocate(wickets, bowlers)) {
    tallyFor(tallies, entry.player.id).wickets += share;
  }
  for (const { entry, share } of allocate(runs, bowlers)) {
    tallyFor(tallies, entry.player.id).runsConceded += share;
  }
  for (const { entry, share } of allocate(
    Math.round(wickets * CATCH_RATE),
    catchers,
  )) {
    tallyFor(tallies, entry.player.id).catches += share;
  }
}

/**
 * Returns a player's running totals, creating them the first time the player appears.
 *
 * @param tallies - The match's totals.
 * @param playerId - The player.
 * @returns The player's totals, which the caller may change.
 */
function tallyFor(tallies: Map<string, Tally>, playerId: string): Tally {
  const existing = tallies.get(playerId);
  if (existing) {
    return existing;
  }
  const tally: Tally = {
    runs: 0,
    wickets: 0,
    catches: 0,
    runsConceded: 0,
    batted: false,
  };
  tallies.set(playerId, tally);
  return tally;
}

/**
 * Allocates a finished match's team totals to the players who took part. The
 * home side bats first. Each player gets their share of the runs, wickets,
 * catches and runs conceded, so the players' totals add back up to the team's.
 *
 * @param seedKey - The match's seed, so the same match always splits the same way.
 * @param home - The home side and its eleven, in batting order.
 * @param away - The away side and its eleven, in batting order.
 * @param score - The team totals.
 * @param score.homeRuns - Runs the home side scored.
 * @param score.homeWickets - Wickets the home side lost.
 * @param score.awayRuns - Runs the away side scored.
 * @param score.awayWickets - Wickets the away side lost.
 * @returns One performance per player on both sides, home side first.
 */
export function allocateMatch(
  seedKey: string,
  home: PlayingSide,
  away: PlayingSide,
  score: {
    readonly homeRuns: number;
    readonly homeWickets: number;
    readonly awayRuns: number;
    readonly awayWickets: number;
  },
): PlayerPerformance[] {
  const random = createSeededRandom(seedKey);
  const tallies = new Map<string, Tally>();
  playInnings(home, away, score.homeRuns, score.homeWickets, random, tallies);
  playInnings(away, home, score.awayRuns, score.awayWickets, random, tallies);

  return [home, away].flatMap((side) =>
    side.xi.map((player, index) => {
      const tally = tallyFor(tallies, player.id);
      return {
        playerId: player.id,
        franchiseId: side.franchiseId,
        battingPosition: index + 1,
        batted: tally.batted,
        runs: tally.runs,
        wickets: tally.wickets,
        catches: tally.catches,
        runsConceded: tally.runsConceded,
      };
    }),
  );
}
