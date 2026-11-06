// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCriticalAlarmAlert } from "./alarmAlert";
import type { Alarm } from "./api";

const alarm = (id: string, severity: Alarm["severity"], code = "smoke", acknowledged = false) => ({ id, key: id, source: { type: "device", id }, severity, code, raised_at: "x", ...(acknowledged ? { acknowledged_at: "y" } : {}) }) as unknown as Alarm;

type Props = { active: Alarm[] | null; enabled?: boolean; how?: { sound?: boolean; notification?: boolean } };
function Probe({ active, enabled = true, how }: Props) {
  useCriticalAlarmAlert(active ? { active } : null, "Critical alarm", enabled, how);
  return null;
}

let root: Root | null = null;
let host: HTMLElement | null = null;
const notifications: Array<{ title: string; options: Record<string, unknown> }> = [];
let oscillators = 0;

function stubBrowser(permission: "granted" | "denied" | "default") {
  class FakeNotification {
    static permission = permission;
    static requestPermission = vi.fn(async () => "granted");
    constructor(title: string, options: Record<string, unknown>) { notifications.push({ title, options }); }
  }
  vi.stubGlobal("Notification", FakeNotification);
  class FakeAudio {
    currentTime = 0;
    destination = {};
    createOscillator() { oscillators += 1; return { type: "", frequency: { value: 0 }, connect() { /* fake */ }, start() { /* fake */ }, stop() { /* fake */ } }; }
    createGain() { return { gain: { value: 0 }, connect() { /* fake */ } }; }
    close() { return Promise.resolve(); }
  }
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudio;
  return FakeNotification;
}

const render = async (props: Props) => {
  if (!host) { host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host); }
  await act(async () => { root!.render(createElement(Probe, props)); });
};

describe("a critical alarm that comes in while the console is on another tab", () => {
  beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; notifications.length = 0; oscillators = 0; });
  afterEach(async () => {
    await act(async () => { root?.unmount(); });
    host?.remove(); root = null; host = null;
    vi.unstubAllGlobals();
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });

  it("is heard three times and shown once, with its code, and an alarm already there when the console opened is not announced", async () => {
    stubBrowser("granted");
    await render({ active: [alarm("a", "critical", "smoke")] });
    expect(notifications).toEqual([]);
    expect(oscillators).toBe(0);
    await render({ active: [alarm("a", "critical", "smoke"), alarm("b", "critical", "door"), alarm("c", "critical", "glass")] });
    expect(oscillators).toBe(3);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.title).toBe("Critical alarm");
    expect(notifications[0]!.options.body).toBe("door, glass");
    expect(notifications[0]!.options.tag).toBe("armor-critical");
    // the same list again says nothing more
    await render({ active: [alarm("a", "critical"), alarm("b", "critical"), alarm("c", "critical")] });
    expect(notifications).toHaveLength(1);
    expect(oscillators).toBe(3);
  });

  it("stays silent for a warning, an acknowledged alarm, a console that is switched off, and the part the person turned off", async () => {
    stubBrowser("granted");
    await render({ active: [] });
    await render({ active: [alarm("w", "warning"), alarm("k", "critical", "x", true)] });
    expect(notifications).toEqual([]);
    expect(oscillators).toBe(0);
    await render({ active: [alarm("n", "critical", "n")], enabled: false });
    expect(notifications).toEqual([]);
    expect(oscillators).toBe(0);
    await render({ active: [alarm("n", "critical", "n"), alarm("m", "critical", "m")], how: { sound: false } });
    expect(oscillators).toBe(0);
    expect(notifications).toHaveLength(1);
    await render({ active: [alarm("n", "critical", "n"), alarm("m", "critical", "m"), alarm("o", "critical", "o")], how: { notification: false } });
    expect(notifications).toHaveLength(1);
    expect(oscillators).toBe(3);
  });

  it("does not show a notification the browser has not allowed, and never fails for it", async () => {
    stubBrowser("denied");
    await render({ active: [] });
    await render({ active: [alarm("a", "critical")] });
    expect(notifications).toEqual([]);
    expect(oscillators).toBe(3);
    vi.stubGlobal("Notification", undefined);
    await render({ active: [alarm("a", "critical"), alarm("b", "critical")] });
    expect(oscillators).toBe(6);
  });

  it("asks for the permission once, at the first click, only when it was never answered", async () => {
    const Fake = stubBrowser("default");
    await render({ active: [] });
    window.dispatchEvent(new Event("pointerdown"));
    window.dispatchEvent(new Event("pointerdown"));
    expect(Fake.requestPermission).toHaveBeenCalledTimes(1);
    await act(async () => { root!.unmount(); });
    root = null; host?.remove(); host = null;
    const Granted = stubBrowser("granted");
    await render({ active: [] });
    window.dispatchEvent(new Event("pointerdown"));
    expect(Granted.requestPermission).not.toHaveBeenCalled();
  });
});
