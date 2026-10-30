import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  BidBlockedError,
  LeagueNotStartedError,
  LobbyNotFoundError,
  MatchNotFoundError,
} from "../../shared/utils/game-api.errors";
import { createHttpGameApi, type FetchLike } from "./http-game-api";

const BASE_URL = "https://lobby.example.test";

/** A request the fake fetch saw. */
type SeenRequest = { readonly url: string; readonly init: RequestInit };

/**
 * Builds a fake `fetch` that records each request and answers with one body.
 *
 * @param status - The HTTP status to answer with.
 * @param body - The JSON body, or `undefined` for a body that is not JSON.
 * @returns The fake fetch and the list of requests it has seen.
 */
function fakeFetch(
  status: number,
  body: unknown,
): { readonly send: FetchLike; readonly seen: SeenRequest[] } {
  const seen: SeenRequest[] = [];
  const send: FetchLike = async (url, init) => {
    seen.push({ url, init });
    const text = body === undefined ? "not json" : JSON.stringify(body);
    return new Response(text, { status });
  };
  return { send, seen };
}

/**
 * Reads a shared API fixture, so the client is tested against real backend output.
 *
 * @param name - The fixture file name without its extension.
 * @returns The parsed fixture.
 */
function fixture(name: string): unknown {
  const path = fileURLToPath(
    new URL(`../../../../data/fixtures/api/${name}.json`, import.meta.url),
  );
  const json: unknown = JSON.parse(readFileSync(path, "utf8"));
  return json;
}

describe("createHttpGameApi requests", () => {
  it("sends a bid as a JSON POST to the lobby's bid route, without the code in the body", async () => {
    const { send, seen } = fakeFetch(200, fixture("auction"));
    const api = createHttpGameApi({ baseUrl: BASE_URL, fetch: send });

    await api.placeBid({
      code: "abc123",
      guestId: "guest-1",
      amountLakhs: 20,
    });

    const [request] = seen;
    expect(request?.url).toBe(`${BASE_URL}/api/lobbies/ABC123/auction/bids`);
    expect(request?.init.method).toBe("POST");
    expect(JSON.parse(String(request?.init.body))).toEqual({
      guestId: "guest-1",
      amountLakhs: 20,
    });
  });

  it("reads a squad with the guest in an encoded query", async () => {
    const { send, seen } = fakeFetch(200, fixture("squad"));
    const api = createHttpGameApi({ baseUrl: BASE_URL, fetch: send });

    await api.getSquad({ code: "ABC123", guestId: "guest 1&x" });

    expect(seen[0]?.url).toBe(
      `${BASE_URL}/api/lobbies/ABC123/squad?guestId=guest%201%26x`,
    );
    expect(seen[0]?.init.method).toBe("GET");
    expect(seen[0]?.init.body).toBeUndefined();
  });

  it("uses the origin of the base URL, so a trailing path cannot change the route", async () => {
    const { send, seen } = fakeFetch(200, fixture("league"));
    const api = createHttpGameApi({
      baseUrl: `${BASE_URL}/ignored/path/`,
      fetch: send,
    });

    await api.getLeague("ABC123");

    expect(seen[0]?.url).toBe(`${BASE_URL}/api/lobbies/ABC123/league`);
  });

  it("checks the input before sending, so a bad code never reaches the network", async () => {
    const { send, seen } = fakeFetch(200, fixture("auction"));
    const api = createHttpGameApi({ baseUrl: BASE_URL, fetch: send });

    await expect(
      api.placeBid({ code: "bad", guestId: "guest-1", amountLakhs: 20 }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(seen).toHaveLength(0);
  });

  it("rejects a base URL that is not absolute when the client is created", () => {
    expect(() => createHttpGameApi({ baseUrl: "/relative" })).toThrow();
  });
});

describe("createHttpGameApi responses", () => {
  it("parses a successful response with the endpoint's schema", async () => {
    const { send } = fakeFetch(200, fixture("league"));
    const api = createHttpGameApi({ baseUrl: BASE_URL, fetch: send });

    const league = await api.getLeague("ABC123");

    expect(league).toEqual(fixture("league"));
  });

  it("turns a refusal into the typed error the mock throws", async () => {
    const { send } = fakeFetch(404, {
      error: "LobbyNotFoundError",
      reason: null,
    });
    const api = createHttpGameApi({ baseUrl: BASE_URL, fetch: send });

    await expect(api.getLobby("ZZZZZZ")).rejects.toBeInstanceOf(
      LobbyNotFoundError,
    );
  });

  it("keeps the reason on a refusal that names one", async () => {
    const { send } = fakeFetch(409, {
      error: "BidBlockedError",
      reason: "over-purse",
    });
    const api = createHttpGameApi({ baseUrl: BASE_URL, fetch: send });

    const refusal = await api
      .placeBid({ code: "ABC123", guestId: "guest-1", amountLakhs: 20 })
      .catch((error: unknown) => error);

    expect(refusal).toBeInstanceOf(BidBlockedError);
    expect((refusal as BidBlockedError).reason).toBe("over-purse");
  });

  it("fails with a plain error when a failure has no refusal body", async () => {
    const { send } = fakeFetch(502, undefined);
    const api = createHttpGameApi({ baseUrl: BASE_URL, fetch: send });

    await expect(api.getLobby("ABC123")).rejects.toThrow(
      "The API answered 502 without a refusal.",
    );
  });

  it("fails with a ZodError when a successful response drifts from the contract", async () => {
    const drifted = { ...(fixture("league") as Record<string, unknown>) };
    delete drifted.standings;
    const { send } = fakeFetch(200, drifted);
    const api = createHttpGameApi({ baseUrl: BASE_URL, fetch: send });

    await expect(api.getLeague("ABC123")).rejects.toBeInstanceOf(ZodError);
  });

  it("keeps the not-started refusal on the league read", async () => {
    const { send } = fakeFetch(409, {
      error: "LeagueNotStartedError",
      reason: null,
    });
    const api = createHttpGameApi({ baseUrl: BASE_URL, fetch: send });

    await expect(api.getLeague("ABC123")).rejects.toBeInstanceOf(
      LeagueNotStartedError,
    );
  });
});

describe("createHttpGameApi standings, matches and live events", () => {
  it("reads the table from the standings route", async () => {
    const json = fixture("league");
    const standings =
      typeof json === "object" && json !== null && "standings" in json
        ? json.standings
        : undefined;
    const { send, seen } = fakeFetch(200, standings);
    const api = createHttpGameApi({ baseUrl: BASE_URL, fetch: send });

    const table = await api.getStandings("abc123");

    expect(seen[0]?.url).toBe(`${BASE_URL}/api/lobbies/ABC123/standings`);
    expect(table).toHaveLength(10);
  });

  it("reads one match from its route, and parses the result", async () => {
    const match = {
      id: "r01-csk-mi",
      round: 1,
      homeFranchiseId: "csk",
      awayFranchiseId: "mi",
      result: {
        homeRuns: 150,
        homeWickets: 5,
        awayRuns: 140,
        awayWickets: 10,
        winnerFranchiseId: "csk",
      },
    };
    const { send, seen } = fakeFetch(200, match);
    const api = createHttpGameApi({ baseUrl: BASE_URL, fetch: send });

    const result = await api.getMatch("ABC123", "r01-csk-mi");

    expect(seen[0]?.url).toBe(
      `${BASE_URL}/api/lobbies/ABC123/matches/r01-csk-mi`,
    );
    expect(result).toEqual(match);
  });

  it("turns a missing match refusal into MatchNotFoundError with the id", async () => {
    const { send } = fakeFetch(404, {
      error: "MatchNotFoundError",
      reason: null,
    });
    const api = createHttpGameApi({ baseUrl: BASE_URL, fetch: send });

    const error = await api
      .getMatch("ABC123", "r01-csk-mi")
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MatchNotFoundError);
    expect((error as Error).message).toContain("r01-csk-mi");
  });

  it("rejects live events until the WebSocket transport exists", async () => {
    const { send, seen } = fakeFetch(200, null);
    const api = createHttpGameApi({ baseUrl: BASE_URL, fetch: send });

    await expect(api.subscribe("ABC123", () => {})).rejects.toThrow(
      "WebSocket",
    );
    expect(seen).toEqual([]);
  });
});
