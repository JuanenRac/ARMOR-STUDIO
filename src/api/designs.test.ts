import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./transport";
import { deleteDesignVersion, deleteDesignVersions, listDesignVersions, readAlarmDesign, readDesignVersion, readElectrical, readNetworkDesign, readSite, saveAlarmDesign, saveElectrical, saveNetworkDesign, saveSite, type DesignKind } from "./designs";

type Seen = { url: string; method: string; body: string | null; credentials: RequestCredentials | undefined };
const seen: Seen[] = [];
let answers: Array<() => Response> = [];
const json = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const ORIGIN = "http://armor.local:8080/";

beforeEach(() => {
  seen.length = 0;
  answers = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    seen.push({ url, method: init.method ?? "GET", body: (init.body as string | null | undefined) ?? null, credentials: init.credentials });
    const next = answers.shift();
    if (!next) throw new Error("no answer prepared");
    return next();
  }));
});
afterEach(() => vi.unstubAllGlobals());

const ROUTES: Record<DesignKind, string> = { site: "/api/v1/site", electrical: "/api/v1/electrical/design", network: "/api/v1/network/design", alarm: "/api/v1/alarm/design" };

describe("saving a drawing", () => {
  const cases = [
    ["site", saveSite, "site", "/api/v1/site"],
    ["electrical", saveElectrical, "electrical", "/api/v1/electrical/design"],
    ["network", saveNetworkDesign, "network", "/api/v1/network/design"],
    ["alarm", saveAlarmDesign, "alarm_design", "/api/v1/alarm/design"],
  ] as const;

  it.each(cases)("%s: sends the revision it read with the drawing, with the session cookie, and returns the new revision", async (_name, save, field, route) => {
    answers.push(json(200, { revision: 8 }));
    const result = await save(ORIGIN, 7, { a: 1 });
    expect(result).toEqual({ revision: 8 });
    expect(seen[0]).toMatchObject({ url: `http://armor.local:8080${route}`, method: "PUT", credentials: "include" });
    expect(JSON.parse(seen[0]!.body!)).toEqual({ revision: 7, [field]: { a: 1 } });
  });

  it.each(cases)("%s: a 409 comes back as the version somebody else saved, not as an error", async (_name, save) => {
    const current = { revision: 9, updated_at: "x", updated_by: "bob" };
    answers.push(json(409, { current }));
    expect(await save(ORIGIN, 7, {})).toEqual({ conflict: current });
  });

  it.each(cases)("%s: any other failure is an ApiError with its own status", async (_name, save) => {
    answers.push(json(500, {}));
    await expect(save(ORIGIN, 1, {})).rejects.toBeInstanceOf(ApiError);
    answers.push(json(403, {}));
    await expect(save(ORIGIN, 1, {})).rejects.toMatchObject({ status: 403 });
  });

  it("names the failure after the drawing", async () => {
    for (const [save, code] of [[saveSite, "site_save_failed"], [saveElectrical, "electrical_save_failed"], [saveNetworkDesign, "network_save_failed"], [saveAlarmDesign, "alarm_design_save_failed"]] as const) {
      answers.push(json(500, {}));
      await expect(save(ORIGIN, 1, {})).rejects.toMatchObject({ code });
    }
  });
});

describe("reading a drawing", () => {
  it("reads each one from its own route", async () => {
    for (const [read, route] of [[readSite, "/api/v1/site"], [readElectrical, "/api/v1/electrical/design"], [readNetworkDesign, "/api/v1/network/design"], [readAlarmDesign, "/api/v1/alarm/design"]] as const) {
      answers.push(json(200, { revision: 0 }));
      expect(await read(ORIGIN)).toEqual({ revision: 0 });
      expect(seen.at(-1)).toMatchObject({ url: `http://armor.local:8080${route}`, method: "GET" });
    }
  });
});

describe("the versions the server keeps", () => {
  it("lists them under the route of each kind", async () => {
    for (const kind of Object.keys(ROUTES) as DesignKind[]) {
      answers.push(json(200, { versions: [] }));
      await listDesignVersions(ORIGIN, kind);
      expect(seen.at(-1)!.url).toBe(`http://armor.local:8080${ROUTES[kind]}/versions`);
    }
  });

  it("forgets one version (the id is escaped) or all of them, and says how many went", async () => {
    answers.push(json(200, {}));
    await deleteDesignVersion(ORIGIN, "site", "a/b c");
    expect(seen[0]).toMatchObject({ url: "http://armor.local:8080/api/v1/site/versions/a%2Fb%20c", method: "DELETE" });
    answers.push(json(404, {}));
    await expect(deleteDesignVersion(ORIGIN, "site", "x")).rejects.toMatchObject({ status: 404, code: "version_delete_failed" });
    answers.push(json(200, { removed: 3 }));
    expect(await deleteDesignVersions(ORIGIN, "network")).toBe(3);
    expect(seen.at(-1)).toMatchObject({ url: "http://armor.local:8080/api/v1/network/design/versions", method: "DELETE" });
    answers.push(json(500, {}));
    await expect(deleteDesignVersions(ORIGIN, "network")).rejects.toMatchObject({ code: "version_delete_failed" });
  });

  it("reads the drawing of a version from the member of its kind, and null when there is none", async () => {
    answers.push(json(200, { alarm_design: { elements: [] } }));
    expect(await readDesignVersion(ORIGIN, "alarm", "v1")).toEqual({ elements: [] });
    answers.push(json(200, { electrical: { nodes: 1 } }));
    expect(await readDesignVersion(ORIGIN, "electrical", "v1")).toEqual({ nodes: 1 });
    answers.push(json(200, { site: null }));
    expect(await readDesignVersion(ORIGIN, "site", "v1")).toBeNull();
    answers.push(json(200, { network: "text" }));
    expect(await readDesignVersion(ORIGIN, "network", "v1")).toBeNull();
    answers.push(json(200, { alarm: { a: 1 } }));
    expect(await readDesignVersion(ORIGIN, "alarm", "v1")).toBeNull();   // the alarm kind reads alarm_design, not alarm
  });
});
