import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import manifest from "../../package.json";
import { ApiError, CALL_TIMEOUT_MS, CLIENT_NAME, endpoint, setElevationAsker, timedFetch, userCall } from "./transport";

type Seen = { url: string; method: string; headers: Headers; body: string | null; credentials: RequestCredentials | undefined; signal: AbortSignal | null | undefined };
const seen: Seen[] = [];
let answers: Array<() => Response | Promise<Response>> = [];

const json = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const plain = (status: number, body = "") => () => new Response(status === 204 ? null : body, { status });

beforeEach(() => {
  seen.length = 0;
  answers = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    seen.push({ url, method: init.method ?? "GET", headers: new Headers(init.headers), body: (init.body as string | null | undefined) ?? null, credentials: init.credentials, signal: init.signal });
    const next = answers.shift();
    if (!next) throw new Error("no answer prepared");
    return next();
  }));
});
afterEach(() => { vi.unstubAllGlobals(); setElevationAsker(null); });

describe("the way every call of the console leaves", () => {
  it("joins the address and the route without doubling the slash", () => {
    expect(endpoint("http://armor.local:8080", "/api/v1/x")).toBe("http://armor.local:8080/api/v1/x");
    expect(endpoint("http://armor.local:8080/", "/api/v1/x")).toBe("http://armor.local:8080/api/v1/x");
    expect(endpoint("", "/api/v1/x")).toBe("/api/v1/x");
  });

  it("says what it is on every call, with the version of this build", async () => {
    answers.push(plain(200));
    await timedFetch("http://s/api");
    expect(CLIENT_NAME).toBe(`studio/${manifest.version}`);
    expect(seen[0]!.headers.get("X-Armor-Client")).toBe(CLIENT_NAME);
  });

  it("keeps a client name that the caller chose, and the other headers it sent", async () => {
    answers.push(plain(200));
    await timedFetch("http://s/api", { headers: { "X-Armor-Client": "tour-bot/1", Accept: "text/plain" } });
    expect(seen[0]!.headers.get("X-Armor-Client")).toBe("tour-bot/1");
    expect(seen[0]!.headers.get("Accept")).toBe("text/plain");
  });

  it("gives up on its own after a while, unless the caller brought its own signal", async () => {
    answers.push(plain(200), plain(200));
    await timedFetch("http://s/api");
    expect(seen[0]!.signal).toBeInstanceOf(AbortSignal);
    expect(seen[0]!.signal!.aborted).toBe(false);
    expect(CALL_TIMEOUT_MS).toBe(30_000);
    const mine = new AbortController();
    await timedFetch("http://s/api", { signal: mine.signal });
    expect(seen[1]!.signal).toBe(mine.signal);
  });
});

describe("a call of a person", () => {
  it("sends the session cookie, JSON only when there is a body, and returns the answer", async () => {
    answers.push(json(200, { ok: true }), json(200, { ok: true }));
    await userCall("http://s", "GET", "/api/v1/users");
    await userCall("http://s/", "POST", "/api/v1/users", { username: "a" });
    expect(seen[0]).toMatchObject({ url: "http://s/api/v1/users", method: "GET", body: null, credentials: "include" });
    expect(seen[0]!.headers.get("Content-Type")).toBeNull();
    expect(seen[0]!.headers.get("Accept")).toBe("application/json");
    expect(seen[1]!.headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(seen[1]!.body!)).toEqual({ username: "a" });
    expect(seen[1]!.headers.get("X-Armor-Client")).toBe(CLIENT_NAME);
  });

  it("returns nothing for a 204 and does not try to read a body", async () => {
    answers.push(plain(204));
    expect(await userCall("http://s", "DELETE", "/api/v1/users/x")).toBeUndefined();
  });

  it("sends a falsy body (zero, false, empty text) rather than dropping it", async () => {
    answers.push(json(200, {}), json(200, {}), json(200, {}));
    await userCall("http://s", "PUT", "/x", 0);
    await userCall("http://s", "PUT", "/x", false);
    await userCall("http://s", "PUT", "/x", "");
    expect(seen.map(item => item.body)).toEqual(["0", "false", "\"\""]);
  });

  it("turns a refusal into an ApiError whose code is the one the server gave", async () => {
    answers.push(json(409, { code: "self_delete" }));
    await expect(userCall("http://s", "DELETE", "/x")).rejects.toMatchObject({ status: 409, code: "self_delete", message: "409 self_delete" });
  });

  it("understands the administration's short error names, with or without a line number, and ignores sentences", async () => {
    answers.push(json(422, { error: "invalid_line:3" }), json(422, { error: "restart_failed" }), json(400, { error: "That did not work, sorry." }), json(500, { error: "Bad Gateway" }));
    await expect(userCall("http://s", "PUT", "/x")).rejects.toMatchObject({ code: "invalid_line:3" });
    await expect(userCall("http://s", "PUT", "/x")).rejects.toMatchObject({ code: "restart_failed" });
    await expect(userCall("http://s", "PUT", "/x")).rejects.toMatchObject({ code: "generic" });
    await expect(userCall("http://s", "PUT", "/x")).rejects.toMatchObject({ code: "generic" });
  });

  it("prefers the separate code of the users' answers over the error name", async () => {
    answers.push(json(403, { code: "wrong_password", error: "forbidden_here" }));
    await expect(userCall("http://s", "PATCH", "/x")).rejects.toMatchObject({ code: "wrong_password" });
  });

  it("calls a 401 or 403 without a reason 'forbidden', and anything else 'generic', even when the body is not JSON or is empty", async () => {
    answers.push(plain(401, "<html>nope</html>"), plain(403), plain(500, ""), plain(502, "not json"), json(404, null as unknown as object));
    await expect(userCall("http://s", "GET", "/x")).rejects.toMatchObject({ status: 401, code: "forbidden" });
    await expect(userCall("http://s", "GET", "/x")).rejects.toMatchObject({ status: 403, code: "forbidden" });
    await expect(userCall("http://s", "GET", "/x")).rejects.toMatchObject({ status: 500, code: "generic" });
    await expect(userCall("http://s", "GET", "/x")).rejects.toMatchObject({ status: 502, code: "generic" });
    await expect(userCall("http://s", "GET", "/x")).rejects.toBeInstanceOf(Error);
  });

  it("lets a network failure through as it is, and is an ApiError only for what the server said", async () => {
    answers.push(() => { throw new TypeError("Failed to fetch"); });
    await expect(userCall("http://s", "GET", "/x")).rejects.toThrow("Failed to fetch");
    const error = new ApiError(418, "teapot");
    expect(error).toBeInstanceOf(Error);
    expect([error.status, error.code]).toEqual([418, "teapot"]);
  });
});

describe("a critical action that asks for a new proof", () => {
  const needsProof = json(403, { code: "elevation_required" });

  it("asks the person once, and when they prove themselves the same call is made again and answers", async () => {
    const asker = vi.fn(async () => true);
    setElevationAsker(asker);
    answers.push(needsProof, json(201, { id: "u1" }));
    await expect(userCall("http://s", "POST", "/api/v1/users", { username: "b" })).resolves.toEqual({ id: "u1" });
    expect(asker).toHaveBeenCalledTimes(1);
    expect(asker).toHaveBeenCalledWith("http://s");
    expect(seen).toHaveLength(2);
    expect(seen[1]!.body).toBe(seen[0]!.body);
  });

  it("does not ask again when the second try is refused for the same reason (no loop)", async () => {
    const asker = vi.fn(async () => true);
    setElevationAsker(asker);
    answers.push(needsProof, needsProof);
    await expect(userCall("http://s", "POST", "/x")).rejects.toMatchObject({ status: 403, code: "elevation_required" });
    expect(asker).toHaveBeenCalledTimes(1);
    expect(seen).toHaveLength(2);
  });

  it("gives the refusal back when the person cancels, and when nobody is there to ask", async () => {
    setElevationAsker(async () => false);
    answers.push(needsProof);
    await expect(userCall("http://s", "POST", "/x")).rejects.toMatchObject({ code: "elevation_required" });
    expect(seen).toHaveLength(1);
    setElevationAsker(null);
    answers.push(needsProof);
    await expect(userCall("http://s", "POST", "/x")).rejects.toMatchObject({ code: "elevation_required" });
  });

  it("is asked only for that code: any other 403 is final", async () => {
    const asker = vi.fn(async () => true);
    setElevationAsker(asker);
    answers.push(json(403, { code: "forbidden" }));
    await expect(userCall("http://s", "POST", "/x")).rejects.toMatchObject({ code: "forbidden" });
    expect(asker).not.toHaveBeenCalled();
  });
});
