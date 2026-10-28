import { describe, expect, it } from "vitest";

import { createGameApi, resolveApiMode } from "./create-game-api";

describe("resolveApiMode", () => {
  it("defaults to mock when the variable is unset or empty", () => {
    expect(resolveApiMode(undefined)).toBe("mock");
    expect(resolveApiMode("")).toBe("mock");
  });

  it("accepts mock and http", () => {
    expect(resolveApiMode("mock")).toBe("mock");
    expect(resolveApiMode("http")).toBe("http");
  });

  it("throws on an unrecognised mode rather than guessing", () => {
    expect(() => resolveApiMode("production")).toThrow(
      'Unknown NEXT_PUBLIC_API_MODE "production"',
    );
  });
});

describe("createGameApi", () => {
  it("returns a working mock for mock mode", async () => {
    const api = createGameApi("mock");

    const lobby = await api.createLobby({
      name: "Mock",
      guestId: "guest-1",
      displayName: "Asha",
    });

    expect(lobby.owners).toHaveLength(1);
  });

  it("keeps the mock's lobbies across calls, so a later read sees an earlier create", async () => {
    const api = createGameApi("mock");
    const created = await api.createLobby({
      name: "Persisted",
      guestId: "guest-1",
      displayName: "Asha",
    });

    const reread = await api.getLobby(created.code);

    expect(reread.name).toBe("Persisted");
  });

  it("refuses http mode without a backend URL, so the gap shows at startup", () => {
    expect(() => createGameApi("http", undefined)).toThrow(
      "NEXT_PUBLIC_API_URL must be set",
    );
    expect(() => createGameApi("http", "")).toThrow(
      "NEXT_PUBLIC_API_URL must be set",
    );
  });

  it("returns the HTTP client for http mode when a backend URL is set", () => {
    const api = createGameApi("http", "http://localhost:8787");

    expect(typeof api.getLobby).toBe("function");
    expect(typeof api.advanceRound).toBe("function");
  });
});
