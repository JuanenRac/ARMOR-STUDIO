import { describe, expect, it } from "vitest";
import type { Alarm } from "../api";
import { alarmSentence, routeFor } from "./route";
import { DEFAULT_ALERTS, parseAlerts, soundFor } from "./settings";
import { pickVoice } from "./sounds";
import { freshAlarms } from "./useAlarmAnnouncer";

const alarm = (patch: Partial<Alarm>): Alarm => ({ id: "a1", key: "k", source: { type: "node", id: "radar-1" }, severity: "critical", code: "intrusion", raised_at: "2000-01-01T00:00:00Z", ...patch });
const t = (key: string) => key;

describe("alarm settings", () => {
  it("falls back to the defaults for anything it does not trust", () => {
    expect(parseAlerts("not json")).toEqual(DEFAULT_ALERTS);
    const parsed = parseAlerts(JSON.stringify({ volume: 999, sounds: { critical: "../x" }, redirect: "teleport", voice: { language: "<b>", gender: "robot" }, popups: { seconds: -4 } }));
    expect(parsed.volume).toBe(100); expect(parsed.sounds.critical).toBe("siren"); expect(parsed.redirect).toBe("never");
    expect(parsed.voice.language).toBe(""); expect(parsed.voice.gender).toBe("any"); expect(parsed.popups.seconds).toBe(0);
  });
  it("lets a source's sound win over the severity's and silences muted ones", () => {
    const settings = parseAlerts(JSON.stringify({ sourceSounds: { camera: "bell" }, mutedSeverities: ["warning"] }));
    expect(soundFor(settings, "critical", "camera")).toBe("bell");
    expect(soundFor(settings, "critical", "node")).toBe("siren");
    expect(soundFor(settings, "warning", "node")).toBe("none");
    expect(soundFor({ ...settings, muted: true }, "critical", "node")).toBe("none");
  });
});

describe("where an alarm leads", () => {
  it("opens the camera of a camera alarm, and only if it exists", () => {
    expect(routeFor(alarm({ source: { type: "camera", id: "cam-02" } }), { cameras: new Set(["cam-02"]) })).toEqual({ view: "cameras", camera: "cam-02" });
    expect(routeFor(alarm({ source: { type: "camera", id: "gone" } }), { cameras: new Set(["cam-02"]) }).camera).toBeUndefined();
  });
  it("opens the camera that covers a radar for an intruder, and the radar otherwise", () => {
    expect(routeFor(alarm({}), { cameraCovering: () => "cam-01" })).toEqual({ view: "cameras", camera: "cam-01" });
    expect(routeFor(alarm({}), {})).toEqual({ view: "radar" });
  });
  it("sends panels, solar, electrical and network to their menus", () => {
    expect(routeFor(alarm({ source: { type: "node", id: "p1" } }), { panelNodes: new Set(["p1"]) }).view).toBe("alarmPanels");
    expect(routeFor(alarm({ source: { type: "solar", id: "s" }, code: "solar_battery_low" })).view).toBe("batteries");
    expect(routeFor(alarm({ source: { type: "electrical", id: "e" } })).view).toBe("electrical");
    expect(routeFor(alarm({ source: { type: "network", id: "n" } })).view).toBe("network");
    expect(routeFor(alarm({ source: { type: "alarm", id: "x" } })).view).toBe("alarmPanels");
  });
  it("says only the parts that were asked for", () => {
    expect(alarmSentence(alarm({}), t, { type: true, severity: false, source: true })).toBe("alarm_intrusion. source_node radar-1");
  });
});

describe("announcing", () => {
  it("learns the first list and then reports the new unacknowledged alarms, most severe first", () => {
    const first = freshAlarms(null, [alarm({ id: "old" })]);
    expect(first.fresh).toEqual([]);
    const next = freshAlarms(first.known, [alarm({ id: "old" }), alarm({ id: "w", severity: "warning" }), alarm({ id: "c" }), alarm({ id: "done", acknowledged_at: "x" })]);
    expect(next.fresh.map(item => item.id)).toEqual(["c", "w"]);
  });
});

describe("voices", () => {
  const voice = (name: string, lang: string, isDefault = false) => ({ name, lang, default: isDefault }) as SpeechSynthesisVoice;
  it("prefers the wanted gender within the language and falls back sensibly", () => {
    const list = [voice("Microsoft Helena", "es-ES"), voice("Microsoft Pablo", "es-ES"), voice("Zira", "en-US", true)];
    expect(pickVoice(list, "es-ES", "female")?.name).toBe("Microsoft Helena");
    expect(pickVoice(list, "es-ES", "male")?.name).toBe("Microsoft Pablo");
    expect(pickVoice(list, "ja-JP", "any")?.name).toBe("Zira");
    expect(pickVoice([], "es-ES", "any")).toBeNull();
  });
});
