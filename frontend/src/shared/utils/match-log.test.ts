import { describe, expect, it } from "vitest";

import type { MatchEvent } from "../types/playoffs.types";
import { franchiseName } from "./franchise-label";
import { describeMatchEvent, matchLogFor, oversText } from "./match-log";

/** A delivery position for the events that have one. */
const at = { innings: 1, over: 5, ball: 4 } as const;

describe("oversText", () => {
  it("writes whole overs without a decimal", () => {
    expect(oversText(0)).toBe("0");
    expect(oversText(120)).toBe("20");
  });

  it("writes the balls after the last full over", () => {
    expect(oversText(25)).toBe("4.1");
    expect(oversText(119)).toBe("19.5");
  });
});

describe("describeMatchEvent", () => {
  it("says who won the toss and that they bat", () => {
    expect(describeMatchEvent({ kind: "toss", winnerFranchiseId: "csk" })).toBe(
      `${franchiseName("csk")} won the toss and chose to bat.`,
    );
  });

  it("names the batting side, the openers and the opening bowler", () => {
    expect(
      describeMatchEvent({
        kind: "inningsStart",
        innings: 2,
        superOver: false,
        battingFranchiseId: "mi",
        bowlingFranchiseId: "csk",
        openers: ["Rohit", "De Kock"],
        openingBowler: "Deepak",
      }),
    ).toBe(
      `Innings 2: ${franchiseName("mi")} bat. Rohit and De Kock open the batting. Deepak opens the bowling.`,
    );
  });

  it("labels a super over innings as one", () => {
    expect(
      describeMatchEvent({
        kind: "inningsStart",
        innings: 3,
        superOver: true,
        battingFranchiseId: "mi",
        bowlingFranchiseId: "csk",
        openers: ["Rohit", "De Kock"],
        openingBowler: "Deepak",
      }),
    ).toMatch(/^Super over, innings 3:/);
  });

  it("says a batter brings up a thirty, fifty or hundred", () => {
    expect(
      describeMatchEvent({
        kind: "milestone",
        ...at,
        batter: "Gaikwad",
        milestone: "fifty",
      }),
    ).toBe("Gaikwad brings up a fifty.");
  });

  it("says two batters bring up a partnership milestone", () => {
    expect(
      describeMatchEvent({
        kind: "partnership",
        ...at,
        batters: ["Gaikwad", "Conway"],
        milestone: "hundred",
      }),
    ).toBe("Gaikwad and Conway bring up their hundred run partnership.");
  });

  it("names the catcher for a caught wicket", () => {
    expect(
      describeMatchEvent({
        kind: "wicket",
        ...at,
        batter: "Gaikwad",
        bowler: "Bumrah",
        wicketKind: "caught",
        fielder: "Ishan",
        runs: 88,
        wickets: 2,
      }),
    ).toBe("Bumrah takes the wicket of Gaikwad, caught by Ishan. 88/2.");
  });

  it("gives a caught wicket with no fielder as a plain wicket", () => {
    expect(
      describeMatchEvent({
        kind: "wicket",
        ...at,
        batter: "Gaikwad",
        bowler: "Bumrah",
        wicketKind: "caught",
        fielder: null,
        runs: 88,
        wickets: 2,
      }),
    ).toBe("Bumrah takes the wicket of Gaikwad. 88/2.");
  });

  it("says how an lbw or a bowled batter was out", () => {
    expect(
      describeMatchEvent({
        kind: "wicket",
        ...at,
        batter: "Gaikwad",
        bowler: "Bumrah",
        wicketKind: "lbw",
        fielder: null,
        runs: 40,
        wickets: 1,
      }),
    ).toBe("Bumrah takes the wicket of Gaikwad, lbw. 40/1.");
    expect(
      describeMatchEvent({
        kind: "wicket",
        ...at,
        batter: "Gaikwad",
        bowler: "Bumrah",
        wicketKind: "bowled",
        fielder: null,
        runs: 40,
        wickets: 1,
      }),
    ).toBe("Bumrah takes the wicket of Gaikwad, bowled. 40/1.");
  });

  it("does not credit the bowler with a run-out", () => {
    expect(
      describeMatchEvent({
        kind: "wicket",
        ...at,
        batter: "Gaikwad",
        bowler: "Bumrah",
        wicketKind: "run-out",
        fielder: null,
        runs: 40,
        wickets: 1,
      }),
    ).toBe("Gaikwad is run out. 40/1.");
  });

  it("names the bowler of a wicket that is neither a catch, lbw, bowled nor a run-out", () => {
    expect(
      describeMatchEvent({
        kind: "wicket",
        ...at,
        batter: "Gaikwad",
        bowler: "Bumrah",
        wicketKind: "other",
        fielder: null,
        runs: 40,
        wickets: 1,
      }),
    ).toBe("Bumrah takes the wicket of Gaikwad. 40/1.");
  });

  it("says a bowler takes four wickets", () => {
    expect(
      describeMatchEvent({
        kind: "fourWickets",
        ...at,
        bowler: "Bumrah",
      }),
    ).toBe("Bumrah takes four wickets.");
  });

  it("gives the score in the final over, and the runs needed in a chase", () => {
    expect(
      describeMatchEvent({
        kind: "finalOver",
        innings: 1,
        runs: 150,
        wickets: 5,
        target: null,
      }),
    ).toBe("Final over: 150/5.");
    expect(
      describeMatchEvent({
        kind: "finalOver",
        innings: 2,
        runs: 150,
        wickets: 5,
        target: 170,
      }),
    ).toBe("Final over: 150/5, 20 needed.");
  });

  it("gives an innings' total in overs", () => {
    expect(
      describeMatchEvent({
        kind: "inningsEnd",
        innings: 1,
        battingFranchiseId: "csk",
        runs: 180,
        wickets: 4,
        legalBalls: 120,
      }),
    ).toBe(`${franchiseName("csk")} finish on 180/4 from 20 overs.`);
  });

  it("names the winner, or says there was no result", () => {
    expect(
      describeMatchEvent({ kind: "result", winnerFranchiseId: "mi" }),
    ).toBe(`${franchiseName("mi")} win the match.`);
    expect(
      describeMatchEvent({ kind: "result", winnerFranchiseId: null }),
    ).toBe("No result.");
  });
});

describe("matchLogFor", () => {
  const score = {
    homeRuns: 170,
    homeWickets: 3,
    awayRuns: 150,
    awayWickets: 10,
    winnerFranchiseId: "csk",
  };

  it("opens with the toss and closes with the result", () => {
    const log = matchLogFor(score, "csk", "mi");
    expect(log[0]).toEqual({ kind: "toss", winnerFranchiseId: "csk" });
    expect(log.at(-1)).toEqual({ kind: "result", winnerFranchiseId: "csk" });
  });

  it("lists one wicket for each wicket lost and ends each innings with its total", () => {
    const log = matchLogFor(score, "csk", "mi");
    const wickets = log.filter(
      (event): event is Extract<MatchEvent, { kind: "wicket" }> =>
        event.kind === "wicket",
    );
    expect(wickets).toHaveLength(13);
    const ends = log.filter((event) => event.kind === "inningsEnd");
    expect(ends).toEqual([
      {
        kind: "inningsEnd",
        innings: 1,
        battingFranchiseId: "csk",
        runs: 170,
        wickets: 3,
        legalBalls: 120,
      },
      {
        kind: "inningsEnd",
        innings: 2,
        battingFranchiseId: "mi",
        runs: 150,
        wickets: 10,
        legalBalls: 120,
      },
    ]);
  });
});
