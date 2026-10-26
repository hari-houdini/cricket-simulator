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

  it("returns the HTTP stub for http mode, which rejects every call", async () => {
    const api = createGameApi("http");

    await expect(api.getLobby("ABC123")).rejects.toThrow(
      "The HTTP game API is not implemented yet",
    );
  });
});
