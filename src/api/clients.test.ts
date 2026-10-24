import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError, captureSnapshot, closeStudioSession, completeStudioSession, createCameraPreviewUrl, createCameraStreamUrl, deleteDesignVersion, deleteDesignVersions, deleteHistory, deleteMedia, forgetNode, getPreferences, listCameraStatus,
  listConfiguredCameras, listConnections, listDesignVersions, listHistory, listMedia, mediaUrl, openStudioSession, readDesignVersion, readHistorySummary, readMediaProof, readRules, readSite, saveAlarmDesign,
  saveElectrical, saveNetworkDesign, savePreferences, saveRules, saveSite, sendPtz, sessionUserState, setMediaProtected, setSystemMode, studioSessionState, type MediaItem,
} from "../api";

type Seen = { url: string; method: string; headers: Headers; body: string | null };
const seen: Seen[] = [];
let answers: Array<() => Response> = [];
const json = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const text = (status: number, body = "") => () => new Response(status === 204 ? null : body, { status });
const last = () => seen[seen.length - 1]!;
const O = "http://armor.local:8080/";

beforeEach(() => {
  seen.length = 0; answers = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    seen.push({ url, method: init.method ?? "GET", headers: new Headers(init.headers), body: (init.body as string | null | undefined) ?? null });
    const next = answers.shift();
    if (!next) throw new Error("no answer prepared");
    return next();
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe("whether the session is still valid", () => {
  it("only the server saying so ends it: a slow answer, a rate limit or a dead network is 'unknown'", async () => {
    answers.push(json(200, { authenticated: true }), json(200, { authenticated: false }), text(401), text(429), text(500), () => { throw new TypeError("offline"); }, json(200, {}));
    expect(await studioSessionState(O)).toBe("active");
    expect(await studioSessionState(O)).toBe("ended");
    expect(await studioSessionState(O)).toBe("ended");
    expect(await studioSessionState(O)).toBe("unknown");
    expect(await studioSessionState(O)).toBe("unknown");
    expect(await studioSessionState(O)).toBe("unknown");
    expect(await studioSessionState(O)).toBe("ended");   // a well-formed answer without the flag
    expect(last().url).toBe("http://armor.local:8080/api/v1/studio/session");
  });

  it("an answer that is not JSON at all is unknown, never an ended session", async () => {
    answers.push(text(200, "<html>captive portal</html>"));
    expect(await studioSessionState(O)).toBe("unknown");
  });

  it("who is signed in: the user, nobody, or unknown with a reason that is never mistaken for 'not an administrator'", async () => {
    const user = { id: "u1", username: "ana", role: "operator" };
    answers.push(json(200, { authenticated: true, user }), json(200, { authenticated: true }), json(200, { authenticated: false }), text(401), text(503), () => { throw new DOMException("timed out", "TimeoutError"); }, () => { throw "weird"; });
    expect(await sessionUserState(O)).toEqual({ state: "user", user, capabilities: null });
    expect(await sessionUserState(O)).toEqual({ state: "anonymous" });
    expect(await sessionUserState(O)).toEqual({ state: "anonymous" });
    expect(await sessionUserState(O)).toEqual({ state: "anonymous" });
    expect(await sessionUserState(O)).toEqual({ state: "unknown", reason: "the server answered 503" });
    expect(await sessionUserState(O)).toEqual({ state: "unknown", reason: "TimeoutError: timed out" });
    expect(await sessionUserState(O)).toEqual({ state: "unknown", reason: "no answer" });
  });
});

describe("signing in", () => {
  it("a plain sign-in is done at once, and the password goes in the body, never in the address", async () => {
    answers.push(json(201, { user: { id: "u1" } }));
    expect(await openStudioSession(O, "ana", "s3cret pass")).toEqual({ done: true });
    expect(last()).toMatchObject({ method: "POST", url: "http://armor.local:8080/api/v1/studio/session" });
    expect(JSON.parse(last().body!)).toEqual({ username: "ana", password: "s3cret pass" });
    expect(last().url).not.toContain("s3cret");
  });

  it("with the second factor on it gives the challenge, and nothing is signed in yet", async () => {
    answers.push(json(200, { totp_required: true, challenge: "abc" }), json(200, { totp_required: true }), json(200, { totp_required: true, challenge: 5 }));
    expect(await openStudioSession(O, "a", "b")).toEqual({ done: false, challenge: "abc" });
    expect(await openStudioSession(O, "a", "b")).toEqual({ done: true });
    expect(await openStudioSession(O, "a", "b")).toEqual({ done: true });
  });

  it("tells apart 'set the second factor up first' from every other refusal", async () => {
    answers.push(json(403, { code: "totp_setup_required" }), json(403, { code: "other" }), json(401, {}), text(429, "slow down"));
    await expect(openStudioSession(O, "a", "b")).rejects.toMatchObject({ status: 403, code: "totp_setup_required" });
    await expect(openStudioSession(O, "a", "b")).rejects.toThrow("Studio login returned 403");
    await expect(openStudioSession(O, "a", "b")).rejects.toThrow("Studio login returned 401");
    await expect(openStudioSession(O, "a", "b")).rejects.toThrow("Studio login returned 429");
  });

  it("the second step sends the challenge and the code, and a refusal carries the code of why", async () => {
    answers.push(json(201, {}), json(401, { code: "bad_code" }), json(429, { code: "totp_locked" }), text(500, "boom"));
    await completeStudioSession(O, "abc", "123456");
    expect(JSON.parse(last().body!)).toEqual({ challenge: "abc", code: "123456" });
    expect(last().url).toBe("http://armor.local:8080/api/v1/studio/session/totp");
    await expect(completeStudioSession(O, "abc", "0")).rejects.toMatchObject({ status: 401, code: "bad_code" });
    await expect(completeStudioSession(O, "abc", "0")).rejects.toMatchObject({ status: 429, code: "totp_locked" });
    await expect(completeStudioSession(O, "abc", "0")).rejects.toMatchObject({ status: 500, code: "generic" });
  });

  it("signing out never fails, even without a network", async () => {
    answers.push(() => { throw new TypeError("offline"); }, text(500));
    await expect(closeStudioSession(O)).resolves.toBeUndefined();
    await expect(closeStudioSession(O)).resolves.toBeUndefined();
    expect(last().method).toBe("DELETE");
  });
});

describe("the preferences of the account", () => {
  it("are read and written with their own error text", async () => {
    answers.push(json(200, { language: "pt" }), text(401), json(200, { theme: "Night" }), text(400));
    expect(await getPreferences(O)).toEqual({ language: "pt" });
    await expect(getPreferences(O)).rejects.toThrow("Server returned 401");
    expect(await savePreferences(O, { theme: "Night" })).toEqual({ theme: "Night" });
    expect(last()).toMatchObject({ method: "PUT", url: "http://armor.local:8080/api/v1/preferences" });
    expect(JSON.parse(last().body!)).toEqual({ theme: "Night" });
    await expect(savePreferences(O, { language: "xx" })).rejects.toThrow("Server returned 400");
  });
});

describe("arming and disarming", () => {
  it("sends the PIN only when disarming, and only when there is one", async () => {
    answers.push(json(200, {}), json(200, {}), json(200, {}), json(200, {}));
    await setSystemMode(O, "armed", "1234");
    expect(JSON.parse(last().body!)).toEqual({ mode: "armed" });
    await setSystemMode(O, "disarmed");
    expect(JSON.parse(last().body!)).toEqual({ mode: "disarmed" });
    await setSystemMode(O, "disarmed", "");
    expect(JSON.parse(last().body!)).toEqual({ mode: "disarmed" });
    await setSystemMode(O, "disarmed", "2468");
    expect(JSON.parse(last().body!)).toEqual({ mode: "disarmed", pin: "2468" });
  });

  it("keeps the PIN refusals apart and gives every other refusal a short name", async () => {
    answers.push(json(403, { code: "wrong_pin" }), json(429, { code: "pin_locked" }), json(403, { code: "pin_not_set" }), json(403, { code: "elevation_required" }), json(401, {}), json(403, {}), json(500, {}), text(502, "<html>"), json(409, { code: "pinned" }));
    const code = async () => { try { await setSystemMode(O, "disarmed", "0"); return "no error"; } catch (error) { return (error as ApiError).code; } };
    expect(await code()).toBe("wrong_pin");
    expect(await code()).toBe("pin_locked");
    expect(await code()).toBe("pin_not_set");
    expect(await code()).toBe("forbidden");       // a code that is not a PIN one is not passed on
    expect(await code()).toBe("session_ended");
    expect(await code()).toBe("forbidden");
    expect(await code()).toBe("generic");
    expect(await code()).toBe("generic");
    expect(await code()).toBe("generic");
  });
});

describe("the history", () => {
  it("asks for fifty events unless told otherwise, and only sends the filters that are set", async () => {
    answers.push(json(200, { events: [], next_before: null }), json(200, { events: [] }));
    await listHistory(O);
    expect(new URL(last().url).searchParams.toString()).toBe("limit=50");
    await listHistory(O, { type: "alarm", before: 90, limit: 20, q: "front door", since: "2026-01-01", until: "2026-02-01", level: "high", order: "asc", category: "node", kind: "android", client: "c1", user: "ana", all: true });
    const query = new URL(last().url).searchParams;
    expect(Object.fromEntries(query)).toEqual({ limit: "20", type: "alarm", before: "90", q: "front door", since: "2026-01-01", until: "2026-02-01", level: "high", order: "asc", category: "node", kind: "android", client: "c1", user: "ana", all: "1" });
  });

  it("does not send empty filters (before 0, empty text) and tolerates an answer without events", async () => {
    answers.push(json(200, {}), json(200, { events: "none", next_before: 7 }));
    expect(await listHistory(O, { before: 0, q: "", limit: 0 })).toEqual({ events: [], next_before: null });
    expect(new URL(last().url).searchParams.toString()).toBe("limit=0");
    expect(await listHistory(O)).toEqual({ events: [], next_before: 7 });
  });

  it("a failed read says which call it was", async () => {
    answers.push(text(500), text(403), text(500));
    await expect(listHistory(O)).rejects.toThrow("History returned 500");
    await expect(listConnections(O)).rejects.toThrow("Connections returned 403");
    await expect(readHistorySummary(O)).rejects.toThrow("History summary returned 500");
  });

  it("the connections can be limited to a kind of client and to the ones that are connected now", async () => {
    answers.push(json(200, { clients: [{ id: "c1" }] }), json(200, {}));
    expect(await listConnections(O, { kind: "android", active: true })).toEqual([{ id: "c1" }]);
    expect(Object.fromEntries(new URL(last().url).searchParams)).toEqual({ kind: "android", active: "1" });
    expect(await listConnections(O)).toEqual([]);
    expect(new URL(last().url).searchParams.toString()).toBe("");
  });

  it("deleting history always carries the confirmation the server insists on, and says what the scope is", async () => {
    answers.push(json(200, { deleted: 3, remaining: 0 }), json(200, { deleted: 1, remaining: 5 }), text(400));
    await deleteHistory(O, { kind: "all" });
    expect(last().method).toBe("DELETE");
    expect(Object.fromEntries(new URL(last().url).searchParams)).toEqual({ confirm: "delete", scope: "all" });
    expect(await deleteHistory(O, { kind: "older-than", days: 30 }, "alert")).toEqual({ deleted: 1, remaining: 5 });
    expect(Object.fromEntries(new URL(last().url).searchParams)).toEqual({ confirm: "delete", scope: "older-than", days: "30", type: "alert" });
    await expect(deleteHistory(O, { kind: "all" })).rejects.toThrow("History delete returned 400");
  });

  it("forgetting a node that is already gone is not a failure; any other refusal is", async () => {
    answers.push(text(204), text(404), text(500));
    await forgetNode(O, "north/1 b");
    expect(last().url).toBe("http://armor.local:8080/api/v1/nodes/north%2F1%20b");
    await expect(forgetNode(O, "x")).resolves.toBeUndefined();
    await expect(forgetNode(O, "x")).rejects.toThrow("Forget node returned 500");
  });

  it("rules and camera status", async () => {
    answers.push(json(200, { dwell_ms: 1500, zones: [] }), json(200, { dwell_ms: 1, zones: [] }), text(422), json(200, { cameras: [{ id: "c" }] }), json(200, { cameras: null }));
    expect(await readRules(O)).toEqual({ dwell_ms: 1500, zones: [] });
    await saveRules(O, { dwell_ms: 1, zones: [] });
    expect(last().method).toBe("PUT");
    await expect(saveRules(O, { dwell_ms: 1, zones: [] })).rejects.toThrow("Rules save returned 422");
    expect(await listCameraStatus(O)).toEqual([{ id: "c" }]);
    expect(await listCameraStatus(O)).toEqual([]);
  });
});

describe("the designs kept on the server", () => {
  const site = { revision: 4, updated_at: null, updated_by: null, site: null };
  it("saving sends the revision it started from, and a 409 gives back the version somebody else saved", async () => {
    answers.push(json(200, { revision: 5 }), json(409, { current: site }), text(500), json(409, { current: site }), json(200, { revision: 9 }), text(403), text(413));
    expect(await saveSite(O, 4, { a: 1 })).toEqual({ revision: 5 });
    expect(JSON.parse(last().body!)).toEqual({ revision: 4, site: { a: 1 } });
    expect(await saveSite(O, 3, {})).toEqual({ conflict: site });
    await expect(saveSite(O, 4, {})).rejects.toMatchObject({ status: 500, code: "site_save_failed" });
    expect(await saveElectrical(O, 1, { e: 1 })).toEqual({ conflict: site });
    expect(await saveAlarmDesign(O, 8, { z: [] })).toEqual({ revision: 9 });
    expect(JSON.parse(last().body!)).toEqual({ revision: 8, alarm_design: { z: [] } });
    await expect(saveNetworkDesign(O, 1, {})).rejects.toMatchObject({ status: 403, code: "network_save_failed" });
    await expect(saveAlarmDesign(O, 1, {})).rejects.toMatchObject({ status: 413, code: "alarm_design_save_failed" });
  });

  it("each kind of design has its own route", async () => {
    answers.push(json(200, site), json(200, { versions: [] }), json(200, { versions: [] }), json(200, { versions: [] }), json(200, { versions: [] }));
    await readSite(O);
    expect(last().url).toBe("http://armor.local:8080/api/v1/site");
    const routes: string[] = [];
    for (const kind of ["site", "electrical", "network", "alarm"] as const) { await listDesignVersions(O, kind); routes.push(new URL(last().url).pathname); }
    expect(routes).toEqual(["/api/v1/site/versions", "/api/v1/electrical/design/versions", "/api/v1/network/design/versions", "/api/v1/alarm/design/versions"]);
  });

  it("a kept version is read from the field named after its kind, and anything else is nothing", async () => {
    answers.push(json(200, { alarm_design: { zones: 2 } }), json(200, { site: { a: 1 } }), json(200, { site: "text" }), json(200, { site: null }), json(200, { electrical: { x: 1 } }));
    expect(await readDesignVersion(O, "alarm", "v 1")).toEqual({ zones: 2 });
    expect(last().url).toBe("http://armor.local:8080/api/v1/alarm/design/versions/v%201");
    expect(await readDesignVersion(O, "site", "a")).toEqual({ a: 1 });
    expect(await readDesignVersion(O, "site", "a")).toBeNull();
    expect(await readDesignVersion(O, "site", "a")).toBeNull();
    expect(await readDesignVersion(O, "network", "a")).toBeNull();   // asked as network, the answer holds only an electrical one
  });

  it("forgetting versions says how many there were, and a refusal is an ApiError", async () => {
    answers.push(text(204), json(200, { removed: 7 }), text(403), text(500));
    await deleteDesignVersion(O, "site", "../x");
    expect(last().url).toBe("http://armor.local:8080/api/v1/site/versions/..%2Fx");
    expect(await deleteDesignVersions(O, "electrical")).toBe(7);
    await expect(deleteDesignVersion(O, "site", "a")).rejects.toMatchObject({ status: 403, code: "version_delete_failed" });
    await expect(deleteDesignVersions(O, "site")).rejects.toMatchObject({ status: 500, code: "version_delete_failed" });
  });
});

describe("cameras and evidence", () => {
  const item: MediaItem = { id: "m1", cameraId: "cam 1/x", kind: "snapshot", file: "2026 01.jpg", createdAt: "", bytes: 1 };
  it("a list that is not a list is empty, not a crash", async () => {
    answers.push(json(200, { cameras: "x" }), json(200, { items: 4, activeCameraIds: {} }));
    expect(await listConfiguredCameras(O)).toEqual([]);
    expect(await listMedia(O)).toEqual({ items: [], activeCameraIds: [] });
  });

  it("the address of a file is built from encoded parts, so a name cannot climb out of its folder", () => {
    expect(mediaUrl(O, item)).toBe("http://armor.local:8080/api/v1/media/cam%201%2Fx/snapshots/2026%2001.jpg");
    expect(mediaUrl(O, { ...item, kind: "recording", file: "../../etc/passwd" })).toBe("http://armor.local:8080/api/v1/media/cam%201%2Fx/recordings/..%2F..%2Fetc%2Fpasswd");
  });

  it("a stream ticket is accepted only when it points inside the cameras of the server", async () => {
    answers.push(json(200, { path: "/api/v1/cameras/c1/stream?ticket=t" }), json(200, { path: "https://evil.example/x" }), json(200, {}), text(403));
    expect(await createCameraStreamUrl(O, "c1")).toBe("http://armor.local:8080/api/v1/cameras/c1/stream?ticket=t");
    await expect(createCameraStreamUrl(O, "c1")).rejects.toThrow("invalid");
    await expect(createCameraStreamUrl(O, "c1")).rejects.toThrow("invalid");
    await expect(createCameraStreamUrl(O, "c1")).rejects.toThrow("ticket returned 403");
  });

  it("the still picture of a camera comes with a ticket that points inside the cameras of the server", async () => {
    answers.push(json(201, { path: "/api/v1/cameras/c1/preview?ticket=t" }), json(201, { path: "https://evil.example/x" }), text(422));
    expect(await createCameraPreviewUrl(O, "c1")).toBe("http://armor.local:8080/api/v1/cameras/c1/preview?ticket=t");
    await expect(createCameraPreviewUrl(O, "c1")).rejects.toThrow("invalid");
    await expect(createCameraPreviewUrl(O, "c1")).rejects.toThrow("ticket returned 422");
  });

  it("a stream ticket path cannot climb out of the cameras route or name another host", async () => {
    for (const path of ["/api/v1/cameras/../admin", "/api/v1/cameras/%2e%2e/admin", "/api/v1/cameras/c1/%2E%2E/%2E%2E/admin", "/api/v1/cameras//evil.example/x", "/api/v1/cameras/c1\\..\\x", "/api/v1/cameras/%zz"]) {
      answers.push(json(200, { path }));
      await expect(createCameraStreamUrl(O, "c1")).rejects.toThrow("invalid");
    }
    answers.push(json(200, { path: "/api/v1/cameras/c1/stream.mjpeg?ticket=ab12&quality=low" }));
    expect(await createCameraStreamUrl(O, "c1")).toBe("http://armor.local:8080/api/v1/cameras/c1/stream.mjpeg?ticket=ab12&quality=low");
  });

  it("a PTZ refusal shows the reason the server gave, in its own words", async () => {
    answers.push(json(200, {}), json(502, { error: "the camera refused the login" }), json(502, {}), text(500, "<html>"));
    await sendPtz(O, "c1", "left");
    expect(JSON.parse(last().body!)).toEqual({ command: "left" });
    await expect(sendPtz(O, "c1", "left")).rejects.toThrow("the camera refused the login");
    await expect(sendPtz(O, "c1", "left")).rejects.toThrow("PTZ command returned 502");
    await expect(sendPtz(O, "c1", "left")).rejects.toThrow("PTZ command returned 500");
  });

  it("evidence: the snapshot comes out of its envelope, protection is a PUT with a flag, the proof is pretty JSON for a file", async () => {
    answers.push(json(200, { item }), text(204), text(204), json(200, { sha256: "ab" }), text(404), text(500));
    expect(await captureSnapshot(O, "c 1")).toEqual(item);
    expect(last().url).toBe("http://armor.local:8080/api/v1/cameras/c%201/snapshot");
    await setMediaProtected(O, item, true);
    expect(last()).toMatchObject({ method: "PUT" });
    expect(last().url.endsWith("/snapshots/2026%2001.jpg/protected")).toBe(true);
    expect(JSON.parse(last().body!)).toEqual({ protected: true });
    await deleteMedia(O, { ...item, kind: "recording" });
    expect(last()).toMatchObject({ method: "DELETE" });
    expect(last().url).toContain("/recordings/");
    expect(await readMediaProof(O, item)).toBe(JSON.stringify({ sha256: "ab" }, null, 2));
    expect(last().headers.get("X-Armor-Client")).toMatch(/^studio\//);
    await expect(readMediaProof(O, item)).rejects.toThrow("Media proof returned 404");
    await expect(deleteMedia(O, item)).rejects.toThrow("Media delete returned 500");
  });
});
