import { describe, expect, it } from "vitest";

import { LobbyFullError, LobbyNotFoundError } from "./game-api.errors";
import { createMockGameApi } from "./mock-game-api";

const creator = { guestId: "guest-1", displayName: "Asha" };

describe("createMockGameApi", () => {
  it("creates a lobby in the auction phase with the caller as its first owner", async () => {
    const api = createMockGameApi();

    const lobby = await api.createLobby({ name: "Sunday League", ...creator });

    expect(lobby.name).toBe("Sunday League");
    expect(lobby.phase).toBe("auction");
    expect(lobby.round).toBe(0);
    expect(lobby.owners).toEqual([creator]);
    expect(lobby.code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("gives the same lobby codes for the same seed", async () => {
    const first = createMockGameApi({ seed: "fixed" });
    const second = createMockGameApi({ seed: "fixed" });

    const firstCodes = [
      (await first.createLobby({ name: "A", ...creator })).code,
      (await first.createLobby({ name: "B", ...creator })).code,
    ];
    const secondCodes = [
      (await second.createLobby({ name: "A", ...creator })).code,
      (await second.createLobby({ name: "B", ...creator })).code,
    ];

    expect(firstCodes).toEqual(secondCodes);
    expect(firstCodes[0]).not.toBe(firstCodes[1]);
  });

  it("finds a lobby by its code regardless of case and surrounding spaces", async () => {
    const api = createMockGameApi();
    const created = await api.createLobby({ name: "Finals", ...creator });

    const found = await api.getLobby(`  ${created.code.toLowerCase()} `);

    expect(found.code).toBe(created.code);
  });

  it("rejects with LobbyNotFoundError when no lobby has the code", async () => {
    const api = createMockGameApi();

    await expect(api.getLobby("ZZZZZZ")).rejects.toBeInstanceOf(
      LobbyNotFoundError,
    );
  });

  it("rejects a malformed code before looking it up", async () => {
    const api = createMockGameApi();

    await expect(api.getLobby("abc")).rejects.toThrow();
  });

  it("adds a new guest as an owner when they join", async () => {
    const api = createMockGameApi();
    const created = await api.createLobby({ name: "Open", ...creator });

    const joined = await api.joinLobby({
      code: created.code,
      guestId: "guest-2",
      displayName: "Ravi",
    });

    expect(joined.owners.map((owner) => owner.guestId)).toEqual([
      "guest-1",
      "guest-2",
    ]);
  });

  it("treats joining again with the same guest ID as a no-op", async () => {
    const api = createMockGameApi();
    const created = await api.createLobby({ name: "Refresh", ...creator });

    const rejoined = await api.joinLobby({
      code: created.code,
      ...creator,
    });

    expect(rejoined.owners).toHaveLength(1);
  });

  it("rejects a join with LobbyFullError once all 10 owners are present", async () => {
    const api = createMockGameApi();
    const created = await api.createLobby({ name: "Full", ...creator });
    for (let index = 2; index <= 10; index += 1) {
      await api.joinLobby({
        code: created.code,
        guestId: `guest-${index}`,
        displayName: `Owner ${index}`,
      });
    }

    await expect(
      api.joinLobby({
        code: created.code,
        guestId: "guest-11",
        displayName: "Late",
      }),
    ).rejects.toBeInstanceOf(LobbyFullError);
  });

  it("rejects a join to an unknown code with LobbyNotFoundError", async () => {
    const api = createMockGameApi();

    await expect(
      api.joinLobby({ code: "NOPE42", guestId: "guest-9", displayName: "X" }),
    ).rejects.toBeInstanceOf(LobbyNotFoundError);
  });

  it("returns copies, so changing a result does not change the stored lobby", async () => {
    const api = createMockGameApi();
    const created = await api.createLobby({ name: "Copy", ...creator });
    created.owners.push({ guestId: "intruder", displayName: "Intruder" });

    const fetched = await api.getLobby(created.code);

    expect(fetched.owners).toHaveLength(1);
  });
});
