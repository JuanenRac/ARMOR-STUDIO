import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../api";
import { setElevationAsker } from "./transport";

type Seen = { url: string; method: string; body: unknown; headers: Headers };
const seen: Seen[] = [];
const O = "http://armor.local:8080/";
const ODD = "a/b c..";
const ENC = "a%2Fb%20c..";

const reply = (status: number, body: unknown): Response => new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
let answers: Response[] = [];

beforeEach(() => {
  seen.length = 0;
  answers = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    seen.push({ url, method: init.method ?? "GET", body: typeof init.body === "string" ? JSON.parse(init.body) : init.body, headers: new Headers(init.headers) });
    return answers.shift() ?? reply(200, {});
  }));
});
afterEach(() => { vi.unstubAllGlobals(); setElevationAsker(null); });

describe("the calls that write to a battery name their route and never let an identifier out of its place", () => {
  const rows: Array<[string, () => Promise<unknown>, string, string, unknown?]> = [
    ["catalog", () => api.batteryCatalog(O), "GET", "/api/v1/solar/battery-ops/catalog"],
    ["operations", () => api.batteryOperations(O), "GET", "/api/v1/solar/battery-ops"],
    ["operation", () => api.batteryOperation(O, ODD), "GET", `/api/v1/solar/battery-ops/${ENC}`],
    ["arm", () => api.batteryArm(O, { node: "solar-1", port: 1, op: "set_limits", serial: "ABC12345" }), "POST", "/api/v1/solar/battery-ops", { node: "solar-1", port: 1, op: "set_limits", serial: "ABC12345" }],
    ["execute", () => api.batteryExecute(O, ODD, "ABC12345"), "POST", `/api/v1/solar/battery-ops/${ENC}/execute`, { serial: "ABC12345" }],
    ["cancel", () => api.batteryCancel(O, ODD), "POST", `/api/v1/solar/battery-ops/${ENC}/cancel`, {}],
    ["restore", () => api.batteryRestore(O, ODD, "ABC12345"), "POST", `/api/v1/solar/battery-ops/${ENC}/restore`, { serial: "ABC12345" }],
  ];
  for (const [name, call, method, path, body] of rows) {
    it(name, async () => {
      await call();
      expect(seen).toHaveLength(1);
      expect(seen[0].url).toBe(`http://armor.local:8080${path}`);
      expect(seen[0].method).toBe(method);
      expect(seen[0].body).toEqual(body);
      expect(seen[0].headers.get("X-Armor-Client")).toMatch(/^studio\//);
    });
  }
});

describe("the upload of a firmware image of a battery", () => {
  const image = { image_id: "i1", size: 4, crc32: 1, sha256: "a".repeat(64), board: "us2000", version: "1.0" };
  const file = new File([new Uint8Array([1, 2, 3, 4])], "image.bin");

  it("sends the bytes as a stream of octets to the route of the images and gives back what the server read", async () => {
    answers = [reply(200, image)];
    expect(await api.batteryImageUpload(O, file)).toEqual(image);
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe("http://armor.local:8080/api/v1/solar/battery-ops/images");
    expect(seen[0].method).toBe("POST");
    expect(seen[0].headers.get("Content-Type")).toBe("application/octet-stream");
    expect(seen[0].body).toBe(file);
  });

  it("asks for the password again when the server wants it, and sends the image once more if the person proved themselves", async () => {
    const asker = vi.fn(async () => true);
    setElevationAsker(asker);
    answers = [reply(403, { code: "elevation_required" }), reply(200, image)];
    expect(await api.batteryImageUpload(O, file)).toEqual(image);
    expect(asker).toHaveBeenCalledTimes(1);
    expect(asker).toHaveBeenCalledWith(O);
    expect(seen).toHaveLength(2);
  });

  it("gives up with the code of the refusal when the person does not prove themselves, and asks only once when the second answer is a refusal too", async () => {
    setElevationAsker(async () => false);
    answers = [reply(403, { code: "elevation_required" })];
    await expect(api.batteryImageUpload(O, file)).rejects.toMatchObject({ status: 403, code: "elevation_required" });
    expect(seen).toHaveLength(1);
    const asker = vi.fn(async () => true);
    setElevationAsker(asker);
    answers = [reply(403, { code: "elevation_required" }), reply(403, { code: "elevation_required" })];
    await expect(api.batteryImageUpload(O, file)).rejects.toMatchObject({ status: 403, code: "elevation_required" });
    expect(asker).toHaveBeenCalledTimes(1);
  });

  it("without anything that can ask, an elevation is a refusal", async () => {
    answers = [reply(403, { code: "elevation_required" })];
    await expect(api.batteryImageUpload(O, file)).rejects.toMatchObject({ status: 403, code: "elevation_required" });
    expect(seen).toHaveLength(1);
  });

  it("turns any other refusal into its code, or into generic when it is not a text or not even JSON", async () => {
    for (const [status, body, code] of [[413, { code: "image_too_big" }, "image_too_big"], [422, { code: 5 }, "generic"], [500, "<html>oops</html>", "generic"], [401, {}, "generic"], [403, { code: "other" }, "other"]] as const) {
      answers = [reply(status, body)];
      await expect(api.batteryImageUpload(O, file)).rejects.toMatchObject({ status, code });
    }
  });

  it("does not ask again for a refusal that is not an elevation", async () => {
    const asker = vi.fn(async () => true);
    setElevationAsker(asker);
    answers = [reply(403, { code: "forbidden" })];
    await expect(api.batteryImageUpload(O, file)).rejects.toMatchObject({ code: "forbidden" });
    expect(asker).not.toHaveBeenCalled();
    expect(seen).toHaveLength(1);
  });
});
