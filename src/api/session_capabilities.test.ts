import { afterEach, describe, expect, it, vi } from "vitest";
import { sessionUserState } from "./session";

const answer = (body: unknown) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } })));
afterEach(() => vi.unstubAllGlobals());

describe("the session answer", () => {
  it("carries the capabilities a new server announces", async () => {
    answer({ authenticated: true, user: { id: "u1", username: "ana", role: "operator" }, capabilities: { version: 1, actions: { arm: true, administer: false }, features: ["security_settings"] } });
    const result = await sessionUserState("http://s");
    expect(result).toMatchObject({ state: "user", user: { role: "operator" }, capabilities: { version: 1, actions: { arm: true, administer: false }, features: ["security_settings"] } });
  });

  it("has none for an older server, and the person is still known", async () => {
    answer({ authenticated: true, user: { id: "u1", username: "ana", role: "admin" } });
    expect(await sessionUserState("http://s")).toMatchObject({ state: "user", capabilities: null });
  });
});
