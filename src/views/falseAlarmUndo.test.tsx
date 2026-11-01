// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Alarm } from "../api";
import { locales, text } from "../i18n";

const api = vi.hoisted(() => ({ markFalseAlarm: vi.fn() }));
vi.mock("../api", async importOriginal => ({ ...(await importOriginal<typeof import("../api")>()), ...api }));

const NOW = Date.parse("2026-01-01T12:00:00Z");
const t = (key: string) => text("en", key);
const alarm = (patch: Partial<Alarm> = {}): Alarm => ({ id: "a1", key: "k", source: { type: "device", id: "door-1" }, severity: "high", code: "door_open", raised_at: new Date(NOW - 60_000).toISOString(), ...patch });
let root: Root | null = null;
let container: HTMLElement;
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };
const click = async (target: Element) => { await act(async () => { target.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await flush(); };
const button = (label: string) => [...container.querySelectorAll("button")].find(item => item.textContent === label) as HTMLButtonElement | undefined;

async function show(alarms: Alarm[]) {
  const { AlarmsView } = await import("./AlarmsView");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(createElement(AlarmsView, { t, origin: "http://x", alarms: { active: alarms, recent: [] }, reload: () => undefined, devices: [], cameraNames: {}, mode: "disarmed", toggleMode: () => undefined, now: NOW, isAdmin: true, readOnly: false }));
  });
  await flush();
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetModules();
  api.markFalseAlarm.mockReset();
  api.markFalseAlarm.mockResolvedValue(alarm());
});
afterEach(async () => { await act(async () => { root?.unmount(); }); root = null; container?.remove(); });

describe("taking back the false-alarm mark", () => {
  it("asks first, and does nothing if the answer is no", async () => {
    await show([alarm({ false_alarm: true, false_alarm_by: "ana" })]);
    await click(button("Not a false alarm")!);
    expect(container.textContent).toContain(t("alarmFalseUndoQuestion"));
    expect(api.markFalseAlarm).not.toHaveBeenCalled();
    await click(button(t("cancel"))!);
    expect(api.markFalseAlarm).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain(t("alarmFalseUndoQuestion"));
  });

  it("takes the mark back only after the confirmation", async () => {
    await show([alarm({ false_alarm: true })]);
    await click(button("Not a false alarm")!);
    const confirm = [...container.querySelectorAll("button")].filter(item => item.textContent === "Not a false alarm").pop()!;
    await click(confirm);
    expect(api.markFalseAlarm).toHaveBeenCalledTimes(1);
    expect(api.markFalseAlarm).toHaveBeenCalledWith("http://x", "a1", null);
  });

  it("does not ask when the mark is put on: marking is quick, un-marking is what changes a report", async () => {
    await show([alarm()]);
    await click(button("False alarm")!);
    expect(api.markFalseAlarm).toHaveBeenCalledWith("http://x", "a1", true);
    expect(container.textContent).not.toContain(t("alarmFalseUndoQuestion"));
  });

  it("has the question in the eight languages", () => {
    for (const locale of locales) {
      expect(text(locale, "alarmFalseUndoQuestion").length, locale).toBeGreaterThan(20);
      expect(text(locale, "alarmFalseUndoQuestion"), locale).not.toBe("alarmFalseUndoQuestion");
    }
    expect(text("pt", "alarmFalseUndoQuestion")).toContain("Retirar a marca de falso alarme");
  });
});
