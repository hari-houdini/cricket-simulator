import { awardsSchema } from "../../shared/types/awards.schema";
import type {
  Awards,
  FairPlayFranchise,
  FairPlayLine,
  ManOfTheMatch,
  OwnerAwardLine,
  PlayerAwardLine,
} from "../../shared/types/awards.types";
import type { Standing } from "../../shared/types/league.types";
import type { Player } from "../../shared/types/player.types";
import {
  fairPlayColumns,
  type PlayerEffect,
  pickFairPlayWinner,
} from "../../shared/utils/fair-play";
import {
  multiplierFor,
  type SquadRole,
} from "../../shared/utils/fantasy-points";
import {
  compareEmerging,
  compareOrangeCap,
  comparePurpleCap,
  franchiseFairPlay,
  type PerformanceRow,
  type PlayerSeason,
  playerSeasons,
  topTwo,
} from "../../shared/utils/season-awards";
import type { MatchRecord } from "./mock-league";

/** An owner as the awards need them: their franchise and their squad's captain roles. */
export type AwardOwner = {
  readonly guestId: string;
  readonly displayName: string;
  readonly franchiseId: string;
  readonly captainId: string | null;
  readonly viceCaptainId: string | null;
};

/**
 * Builds every award for a season from its played matches.
 *
 * @param input - Whether the season is over, the matches played, the owners, the table and the player pool.
 * @returns The awards, validated.
 */
export function buildAwards(input: {
  readonly seasonComplete: boolean;
  readonly records: readonly MatchRecord[];
  readonly owners: readonly AwardOwner[];
  readonly standings: readonly Standing[];
  readonly players: readonly Player[];
}): Awards {
  const playersById = new Map(
    input.players.map((player) => [player.id, player]),
  );
  const nameOf = (playerId: string) =>
    playersById.get(playerId)?.name ?? playerId;
  const rows = input.records.flatMap((record) =>
    record.performances.map(
      (performance): PerformanceRow => ({
        matchKey: record.matchKey,
        playerId: performance.playerId,
        franchiseId: performance.franchiseId,
        batted: performance.batted,
        runs: performance.runs,
        wickets: performance.wickets,
        runsConceded: performance.runsConceded,
        fantasyPoints: performance.fantasyPoints,
        fairPlayScore: performance.fairPlayScore,
      }),
    ),
  );

  const seasons = playerSeasons(rows);
  const playerLine = (season: PlayerSeason): PlayerAwardLine => ({
    playerId: season.playerId,
    name: nameOf(season.playerId),
    franchiseId: season.franchiseId,
    innings: season.innings,
    runs: season.runs,
    wickets: season.wickets,
    runsConceded: season.runsConceded,
    fantasyPoints: season.fantasyPoints,
  });
  const uncapped = seasons.filter(
    (season) => playersById.get(season.playerId)?.category === "uncapped",
  );

  const ownerLines: OwnerAwardLine[] = input.owners.map((owner) => {
    const roleOf = (playerId: string): SquadRole =>
      owner.captainId === playerId
        ? "captain"
        : owner.viceCaptainId === playerId
          ? "vice-captain"
          : "none";
    const points = rows
      .filter((row) => row.franchiseId === owner.franchiseId)
      .reduce(
        (total, row) =>
          total + row.fantasyPoints * multiplierFor(roleOf(row.playerId)),
        0,
      );
    return {
      guestId: owner.guestId,
      displayName: owner.displayName,
      franchiseId: owner.franchiseId,
      fantasyPoints: points,
    };
  });

  const franchises = franchiseFairPlay(rows);
  const tableRow = (franchiseId: string) =>
    input.standings.find((row) => row.franchiseId === franchiseId);
  const fairPlayWinner = pickFairPlayWinner(
    franchises.map((franchise) => ({
      franchiseId: franchise.franchiseId,
      standing: franchise.standing,
      points: tableRow(franchise.franchiseId)?.points ?? 0,
      netRunRate: tableRow(franchise.franchiseId)?.netRunRate ?? 0,
    })),
  );
  const lineOf = (effect: PlayerEffect): FairPlayLine => ({
    playerId: effect.playerId,
    name: nameOf(effect.playerId),
    averageEffect: effect.averageEffect,
  });
  const fairPlay: FairPlayFranchise[] = franchises.map((franchise) => {
    const columns = fairPlayColumns(franchise.effects);
    return {
      franchiseId: franchise.franchiseId,
      standing: franchise.standing,
      lowering: columns.lowering.map(lineOf),
      lifting: columns.lifting.map(lineOf),
    };
  });

  const manOfTheMatch: ManOfTheMatch[] = input.records.flatMap((record) => {
    const playerId = record.manOfTheMatchId;
    const performance = record.performances.find(
      (item) => item.playerId === playerId,
    );
    if (playerId === null || !performance) {
      return [];
    }
    return [
      {
        round: record.round,
        homeFranchiseId: record.homeFranchiseId,
        awayFranchiseId: record.awayFranchiseId,
        playerId,
        name: nameOf(playerId),
        franchiseId: performance.franchiseId,
      },
    ];
  });

  const orange = topTwo(seasons, compareOrangeCap);
  const purple = topTwo(seasons, comparePurpleCap);
  const emerging = topTwo(uncapped, compareEmerging);
  const mvp = topTwo(
    ownerLines.filter((line) => line.fantasyPoints > 0),
    (left, right) =>
      right.fantasyPoints - left.fantasyPoints ||
      left.guestId.localeCompare(right.guestId),
  );

  return awardsSchema.parse({
    seasonComplete: input.seasonComplete,
    orangeCap: {
      winner: orange.winner ? playerLine(orange.winner) : null,
      runnerUp: orange.runnerUp ? playerLine(orange.runnerUp) : null,
    },
    purpleCap: {
      winner: purple.winner ? playerLine(purple.winner) : null,
      runnerUp: purple.runnerUp ? playerLine(purple.runnerUp) : null,
    },
    mostValuable: { winner: mvp.winner, runnerUp: mvp.runnerUp },
    emerging: {
      winner: emerging.winner ? playerLine(emerging.winner) : null,
      runnerUp: emerging.runnerUp ? playerLine(emerging.runnerUp) : null,
    },
    fairPlay: { winnerFranchiseId: fairPlayWinner, franchises: fairPlay },
    manOfTheMatch,
  });
}
