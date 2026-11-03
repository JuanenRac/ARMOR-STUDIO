import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Alarm } from "../api";
import { text } from "../i18n";
import { AlarmsView } from "./AlarmsView";

const NOW = Date.parse("2026-01-01T12:00:00Z");
const alarm: Alarm = { id: "a1", key: "k", source: { type: "device", id: "door-1" }, severity: "high", code: "door_open", raised_at: new Date(NOW - 60_000).toISOString() };
const view = (extra: { readOnly?: boolean; modeLocked?: boolean; ackLocked?: boolean }, mode: "armed" | "disarmed" = "disarmed") =>
  renderToStaticMarkup(createElement(AlarmsView, { t: (key: string) => text("en", key), origin: "http://x", alarms: { active: [alarm], recent: [] }, reload: () => undefined, devices: [], cameraNames: {}, mode, toggleMode: () => undefined, now: NOW, isAdmin: false, ...extra }));
const button = (html: string, label: string) => { const found = html.match(new RegExp(`<button[^>]*>${label}`))?.[0]; expect(found, label).toBeDefined(); return found!; };

describe("the alarm screen asks for the permission of each step", () => {
  it("leaves everything on for a person who may do it all", () => {
    const html = view({});
    expect(button(html, "Arm the system")).not.toContain("disabled");
    expect(button(html, "Acknowledge")).not.toContain("disabled");
  });
  it("locks only the big arm or disarm button when that step is not allowed", () => {
    const html = view({ modeLocked: true });
    expect(button(html, "Arm the system")).toContain("disabled");
    expect(button(html, "Acknowledge")).not.toContain("disabled");
  });
  it("locks only the acknowledge buttons when acknowledging is not allowed", () => {
    const html = view({ ackLocked: true }, "armed");
    expect(button(html, "Disarm the system")).not.toContain("disabled");
    expect(button(html, "Acknowledge")).toContain("disabled");
  });
});
