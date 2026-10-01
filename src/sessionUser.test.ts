import { afterEach, describe, expect, it, vi } from "vitest";
import { sessionUserState } from "./api";

const answer = (status: number, body: unknown = {}) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
afterEach(() => vi.unstubAllGlobals());

describe("who is signed in", () => {
  it("is the user when the server names one", async () => {
    vi.stubGlobal("fetch", answer(200, { authenticated: true, user: { id: "u1", username: "admin", role: "admin" } }));
    expect(await sessionUserState("http://x:1")).toEqual({ state: "user", user: { id: "u1", username: "admin", role: "admin" } });
  });

  it("is nobody only when the server says so", async () => {
    vi.stubGlobal("fetch", answer(200, { authenticated: false }));
    expect(await sessionUserState("http://x:1")).toEqual({ state: "anonymous" });
    vi.stubGlobal("fetch", answer(401));
    expect(await sessionUserState("http://x:1")).toEqual({ state: "anonymous" });
  });

  it("is unknown - never 'not an administrator' - when the server could not be asked", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network"); }));
    expect(await sessionUserState("http://x:1")).toMatchObject({ state: "unknown", reason: expect.stringContaining("TypeError") });
    vi.stubGlobal("fetch", answer(429));
    expect(await sessionUserState("http://x:1")).toEqual({ state: "unknown", reason: "the server answered 429" });
    vi.stubGlobal("fetch", answer(503));
    expect(await sessionUserState("http://x:1")).toMatchObject({ state: "unknown" });
  });
});
