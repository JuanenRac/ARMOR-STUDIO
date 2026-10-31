import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALARM_SOURCES, fetchAlarmSound, readAlarmAudio, removeAlarmSound, uploadAlarmSound } from "./alarmAudio";
import { setElevationAsker } from "./transport";

type Seen = { url: string; method: string; headers: Headers; body: unknown };
const seen: Seen[] = [];
let answers: Array<() => Response> = [];
const json = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const ORIGIN = "http://armor.local:8080";

beforeEach(() => {
  seen.length = 0;
  answers = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
    seen.push({ url, method: init.method ?? "GET", headers: new Headers(init.headers), body: init.body });
    const next = answers.shift();
    if (!next) throw new Error("no answer prepared");
    return next();
  }));
});
afterEach(() => { vi.unstubAllGlobals(); setElevationAsker(null); });

describe("the sound of the alarms", () => {
  it("knows the six origins a sound can be set for", () => {
    expect([...ALARM_SOURCES]).toEqual(["device", "solar", "electrical", "network", "alarm", "other"]);
  });

  it("reads the state and removes the sound of one origin", async () => {
    answers.push(json(200, { sounds: [] }));
    expect(await readAlarmAudio(ORIGIN)).toEqual({ sounds: [] });
    expect(seen[0]).toMatchObject({ url: `${ORIGIN}/api/v1/alarm-audio`, method: "GET" });
    answers.push(json(200, { removed: true }));
    await removeAlarmSound(ORIGIN, "solar");
    expect(seen[1]).toMatchObject({ url: `${ORIGIN}/api/v1/alarm-audio/sounds/solar`, method: "DELETE" });
  });

  it("uploads the WAVE as audio/wav", async () => {
    answers.push(json(200, { source: "device", bytes: 4 }));
    const result = await uploadAlarmSound(ORIGIN, "device", new Uint8Array([1, 2, 3, 4]));
    expect(result).toMatchObject({ bytes: 4 });
    expect(seen[0]).toMatchObject({ url: `${ORIGIN}/api/v1/alarm-audio/sounds/device`, method: "PUT" });
    expect(seen[0]!.headers.get("Content-Type")).toBe("audio/wav");
    expect((seen[0]!.body as Blob).size).toBe(4);
  });

  it("asks for the proof of identity once when the server wants it, then sends the file again", async () => {
    const asked: string[] = [];
    setElevationAsker(async origin => { asked.push(origin); return true; });
    answers.push(json(403, { code: "elevation_required" }), json(200, { bytes: 1 }));
    await uploadAlarmSound(ORIGIN, "alarm", new Uint8Array([0]));
    expect(asked).toEqual([ORIGIN]);
    expect(seen).toHaveLength(2);
  });

  it("does not send the file again when the person did not prove themselves or nothing can ask", async () => {
    answers.push(json(403, { code: "elevation_required" }));
    await expect(uploadAlarmSound(ORIGIN, "alarm", new Uint8Array([0]))).rejects.toMatchObject({ status: 403, code: "elevation_required" });
    expect(seen).toHaveLength(1);
    setElevationAsker(async () => false);
    answers.push(json(403, { code: "elevation_required" }));
    await expect(uploadAlarmSound(ORIGIN, "alarm", new Uint8Array([0]))).rejects.toMatchObject({ code: "elevation_required" });
    expect(seen).toHaveLength(2);
  });

  it("asks only once even when the second try is refused too", async () => {
    let asks = 0;
    setElevationAsker(async () => { asks += 1; return true; });
    answers.push(json(403, { code: "elevation_required" }), json(403, { code: "elevation_required" }));
    await expect(uploadAlarmSound(ORIGIN, "alarm", new Uint8Array([0]))).rejects.toMatchObject({ status: 403 });
    expect(asks).toBe(1);
  });

  it("turns a refusal into a stable code: the machine word of the error, else the code, else generic", async () => {
    answers.push(json(400, { error: "bad_wave" }));
    await expect(uploadAlarmSound(ORIGIN, "other", new Uint8Array([0]))).rejects.toMatchObject({ status: 400, code: "bad_wave" });
    answers.push(json(400, { error: "A sentence, with spaces", code: "too_long" }));
    await expect(uploadAlarmSound(ORIGIN, "other", new Uint8Array([0]))).rejects.toMatchObject({ code: "too_long" });
    answers.push(json(500, {}));
    await expect(uploadAlarmSound(ORIGIN, "other", new Uint8Array([0]))).rejects.toMatchObject({ status: 500, code: "generic" });
  });

  it("downloads the samples to listen to them and fails with generic", async () => {
    answers.push(() => new Response(new Uint8Array([9, 8, 7]), { status: 200 }));
    const samples = await fetchAlarmSound(ORIGIN, "network");
    expect(new Uint8Array(samples)).toEqual(new Uint8Array([9, 8, 7]));
    expect(seen[0]!.headers.get("Accept")).toBe("audio/L16");
    answers.push(json(404, {}));
    await expect(fetchAlarmSound(ORIGIN, "network")).rejects.toMatchObject({ status: 404, code: "generic" });
  });
});
