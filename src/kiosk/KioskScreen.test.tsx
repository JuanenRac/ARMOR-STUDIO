// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Alarm } from "../api/alarms";

const fake = vi.hoisted(() => ({
  connection: "synced" as "synced" | "demo",
  mode: "armed" as "armed" | "disarmed",
  role: "operator",
  alarms: [] as unknown[],
  failed: false,
  reload: vi.fn(),
  apply: vi.fn(),
}));
vi.mock("../hooks", () => ({
  useServerStatus: () => ({ state: { mode: fake.mode, revision: 1, nodes: {}, updated_at: "" }, connection: fake.connection, latencyMs: 5, live: true, apply: fake.apply }),
  usePolled: () => ({ data: { active: fake.alarms, recent: [] }, reload: fake.reload, failed: fake.failed }),
  useSessionUser: () => ({ user: { id: "u1", username: "ana", role: fake.role }, capabilities: null, known: true, reason: "", refresh: () => undefined }),
}));
const calls: string[] = [];
vi.mock("../api/system", () => ({ setSystemMode: vi.fn(async (_origin: string, mode: string, pin?: string) => { calls.push(`mode:${mode}:${pin ?? "-"}`); return { mode, revision: 2, nodes: {}, updated_at: "" }; }) }));
vi.mock("../api/alarms", () => ({ listAlarms: vi.fn(), acknowledgeAlarm: vi.fn(async (_origin: string, id: string) => { calls.push(`ack:${id}`); return {}; }) }));

import { KioskScreen } from "./KioskScreen";
import { KIOSK_CONFIG } from "./kioskModel";

const alarm = (id: string, extra: Partial<Alarm> = {}): Alarm => ({ id, key: id, source: { type: "node", id: "n1" }, severity: "high", code: "intrusion", raised_at: "2026-01-01T10:00:00Z", ...extra });
let root: Root | null = null;
const host = document.createElement("div");
const show = async () => { root = createRoot(host); await act(async () => { root!.render(createElement(KioskScreen, { origin: "http://127.0.0.1:8080", onSignOut: () => calls.push("signout") })); }); };
const buttons = () => [...host.querySelectorAll("button")].map(button => button.textContent);
const press = async (label: string) => { await act(async () => { [...host.querySelectorAll("button")].find(button => button.textContent === label)!.click(); }); };

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  calls.length = 0; fake.connection = "synced"; fake.mode = "armed"; fake.role = "operator"; fake.alarms = []; fake.failed = false;
});
afterEach(async () => { await act(async () => { root?.unmount(); }); root = null; vi.useRealTimers(); });

describe("the wall panel screen", () => {
  it("shows the state and the button that does the opposite, and an alarm with its acknowledge button", async () => {
    fake.alarms = [alarm("a1")];
    await show();
    expect(host.querySelector("h1")?.textContent).toBe("ARMED");
    expect(buttons()).toContain("Disarm");
    expect(buttons()).toContain("Acknowledge");
    await press("Acknowledge");
    expect(calls).toContain("ack:a1");
  });
  it("arms with one press when it is disarmed", async () => {
    fake.mode = "disarmed";
    await show();
    expect(host.querySelector("h1")?.textContent).toBe("DISARMED");
    await press("Arm");
    expect(calls).toContain("mode:armed:-");
  });
  it("does not claim a state it does not know: without the server it says so and offers no order", async () => {
    fake.connection = "demo";
    await show();
    expect(host.querySelector("h1")?.textContent).toBe("NO DATA");
    expect(host.textContent).toContain("Connection lost");
    expect(buttons()).not.toContain("Arm");
    expect(buttons()).not.toContain("Disarm");
  });
  it("offers nothing to change to a session that can only look", async () => {
    fake.role = "viewer";
    fake.alarms = [alarm("a1")];
    await show();
    expect(buttons()).not.toContain("Disarm");
    expect(buttons()).not.toContain("Acknowledge");
    expect(host.textContent).toContain("only look");
  });
  it("rests after the time of the configuration, wakes with a touch, and never rests with an alarm waiting", async () => {
    await show();
    await act(async () => { await vi.advanceTimersByTimeAsync(KIOSK_CONFIG.idle_after_s * 1000 + 2000); });
    expect(host.querySelector("main")?.className).toContain("resting");
    expect(host.textContent).toContain("Touch the screen");
    await act(async () => { window.dispatchEvent(new Event("pointerdown")); });
    expect(host.querySelector("main")?.className).not.toContain("resting");
    await act(async () => { root!.unmount(); });
    root = null;
    fake.alarms = [alarm("a2")];
    await show();
    await act(async () => { await vi.advanceTimersByTimeAsync(KIOSK_CONFIG.idle_after_s * 1000 + 2000); });
    expect(host.querySelector("main")?.className).not.toContain("resting");
  });
});
