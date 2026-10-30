import type { MatchScore } from "../types/league.types";
import type { MatchEvent } from "../types/playoffs.types";
import { franchiseAbbreviation, franchiseName } from "./franchise-label";

/**
 * The overs a number of legal deliveries makes, as a scorecard writes them: 20, or 4.2.
 *
 * @param legalBalls - The legal deliveries bowled.
 * @returns The overs, with the balls after the last full over.
 */
export function oversText(legalBalls: number): string {
  const balls = legalBalls % 6;
  const overs = Math.floor(legalBalls / 6);
  return balls === 0 ? `${overs}` : `${overs}.${balls}`;
}

/**
 * One key moment in words, for the match log.
 *
 * The wording avoids gendered pronouns. A milestone reads "brings up a fifty", and a partnership
 * reads "bring up their fifty run partnership".
 *
 * @param event - The key moment.
 * @returns A sentence describing it.
 */
export function describeMatchEvent(event: MatchEvent): string {
  switch (event.kind) {
    case "toss":
      return `${franchiseName(event.winnerFranchiseId)} won the toss and chose to bat.`;
    case "inningsStart": {
      const [first, second] = event.openers;
      const label = event.superOver
        ? `Super over, innings ${event.innings}`
        : `Innings ${event.innings}`;
      return `${label}: ${franchiseName(event.battingFranchiseId)} bat. ${first} and ${second} open the batting. ${event.openingBowler} opens the bowling.`;
    }
    case "milestone":
      return `${event.batter} brings up a ${event.milestone}.`;
    case "partnership": {
      const [first, second] = event.batters;
      return `${first} and ${second} bring up their ${event.milestone} run partnership.`;
    }
    case "wicket":
      return `${wicketText(event)} ${event.runs}/${event.wickets}.`;
    case "fourWickets":
      return `${event.bowler} takes four wickets.`;
    case "finalOver":
      return event.target === null
        ? `Final over: ${event.runs}/${event.wickets}.`
        : `Final over: ${event.runs}/${event.wickets}, ${event.target - event.runs} needed.`;
    case "inningsEnd":
      return `${franchiseName(event.battingFranchiseId)} finish on ${event.runs}/${event.wickets} from ${oversText(event.legalBalls)} overs.`;
    case "result":
      return event.winnerFranchiseId === null
        ? "No result."
        : `${franchiseName(event.winnerFranchiseId)} win the match.`;
  }
}

/**
 * The first half of a wicket's sentence: who got whom, and how. A run-out names only the batter,
 * because a run-out is not credited to the bowler.
 *
 * @param event - The wicket.
 * @returns The sentence without its score.
 */
function wicketText(event: Extract<MatchEvent, { kind: "wicket" }>): string {
  if (event.wicketKind === "run-out") {
    return `${event.batter} is run out.`;
  }
  if (event.wicketKind === "caught" && event.fielder !== null) {
    return `${event.bowler} takes the wicket of ${event.batter}, caught by ${event.fielder}.`;
  }
  const how =
    event.wicketKind === "lbw" || event.wicketKind === "bowled"
      ? `, ${event.wicketKind}`
      : "";
  return `${event.bowler} takes the wicket of ${event.batter}${how}.`;
}

/**
 * A stand-in match log for the mock API, built from a played match's score. It names the
 * openers and bowlers from the franchise abbreviations, and spreads the wickets across each
 * innings, so the log reads like a real one with the same totals and winner.
 *
 * @param score - The match's score.
 * @param home - The home franchise, which bats first.
 * @param away - The away franchise.
 * @returns The match log, from the toss to the result.
 */
export function matchLogFor(
  score: MatchScore,
  home: string,
  away: string,
): MatchEvent[] {
  return [
    { kind: "toss", winnerFranchiseId: home },
    ...inningsFor(1, home, away, score.homeRuns, score.homeWickets),
    ...inningsFor(2, away, home, score.awayRuns, score.awayWickets),
    { kind: "result", winnerFranchiseId: score.winnerFranchiseId },
  ];
}

/**
 * The key moments of one innings for the mock log: its start, one caught wicket for each wicket
 * lost, and its end.
 *
 * @param innings - The innings number.
 * @param batting - The franchise batting.
 * @param bowling - The franchise bowling.
 * @param runs - The innings total.
 * @param wickets - The wickets lost.
 * @returns The innings' key moments, in order.
 */
function inningsFor(
  innings: number,
  batting: string,
  bowling: string,
  runs: number,
  wickets: number,
): MatchEvent[] {
  const bat = franchiseAbbreviation(batting);
  const bowl = franchiseAbbreviation(bowling);
  const events: MatchEvent[] = [
    {
      kind: "inningsStart",
      innings,
      superOver: false,
      battingFranchiseId: batting,
      bowlingFranchiseId: bowling,
      openers: [`${bat} Opener A`, `${bat} Opener B`],
      openingBowler: `${bowl} Bowler A`,
    },
  ];
  for (let wicket = 1; wicket <= wickets; wicket += 1) {
    events.push({
      kind: "wicket",
      innings,
      over: Math.min(20, wicket * 2),
      ball: 1,
      batter: `${bat} Batter ${wicket}`,
      bowler: `${bowl} Bowler A`,
      wicketKind: "caught",
      fielder: `${bowl} Fielder ${wicket}`,
      runs: Math.floor((runs * wicket) / (wickets + 1)),
      wickets: wicket,
    });
  }
  events.push({
    kind: "inningsEnd",
    innings,
    battingFranchiseId: batting,
    runs,
    wickets,
    legalBalls: 120,
  });
  return events;
}
