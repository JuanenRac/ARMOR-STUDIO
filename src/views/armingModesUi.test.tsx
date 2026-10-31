// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { locales, text } from "../i18n";
import type { ArmingModesState } from "../api";
import { ArmingModeDialog } from "./ArmingModeDialog";
import { ArmingModesEditor } from "./ArmingModesEditor";

const t = (key: string) => text("en", key);
const state = (extra: Partial<ArmingModesState> = {}): ArmingModesState => ({
  enabled: true, current: "disarmed", available: ["disarmed", "away", "home", "night"], unassigned: ["night"], downgrade_pin_required: true, schedule_enabled: false, schedule_may_lower: false, max_schedule: 16,
  revision: 3, updated_at: "2026-01-01T00:00:00.000Z", updated_by: "admin", modes: { away: {}, home: { defends: ["zone:Hall"] }, night: {} }, schedule: [], ...extra,
});
const universe = { zones: ["Hall", "Kitchen"], devices: [{ id: "door-1", name: "Front door", location: "Hall" }], nodes: ["radar-1"], cameras: [{ id: "garden", name: "Garden" }] };

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;
let container: HTMLElement;
const calls: Array<{ url: string; method: string; body: Record<string, unknown> }> = [];
let replies: Array<{ status: number; body: unknown }> = [];
beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  calls.length = 0; replies = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), method: String(init.method), body: JSON.parse(String(init.body ?? "{}")) as Record<string, unknown> });
    const reply = replies.shift() ?? { status: 200, body: { mode: "armed", arming_mode: "home", revision: 1, nodes: {}, updated_at: "" } };
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { "Content-Type": "application/json" } });
  }));
});
afterEach(() => { act(() => root?.unmount()); root = null; container.remove(); vi.unstubAllGlobals(); });

const mount = (element: ReturnType<typeof createElement>) => { root = createRoot(container); act(() => root!.render(element)); };
const click = async (selector: string) => { await act(async () => { (container.querySelector(selector) as HTMLElement).click(); await Promise.resolve(); await Promise.resolve(); }); };
const done = vi.fn();
const dialog = (modes: ArmingModesState, armed = false) => createElement(ArmingModeDialog, { t, origin: "http://x", modes, armed, onDone: done, onDisarm: vi.fn(), cancel: vi.fn() });

describe("the dialog that arms in a mode", () => {
  beforeEach(() => done.mockClear());

  it("offers the three modes with what each defends, and arms in the one chosen without a PIN when nothing is lowered", async () => {
    mount(dialog(state()));
    expect(container.textContent).toContain("Away");
    expect(container.textContent).toContain("defends everything");
    expect(container.textContent).toContain("1 marked");
    expect(container.textContent).toContain("nothing assigned yet");
    expect(container.querySelector('[data-testid="arming-mode-disarm"]')).toBeNull();
    await click('[data-testid="arming-mode-home"]');
    expect(calls).toEqual([{ url: "http://x/api/v1/mode", method: "POST", body: { mode: "home" } }]);
    expect(done).toHaveBeenCalledTimes(1);
    expect(done.mock.calls[0]![1]).toBe("home");
  });

  it("asks to confirm a mode with nothing assigned and only then arms it, sending confirm_unassigned", async () => {
    replies = [{ status: 409, body: { error: "x", code: "no_zones_assigned" } }];
    mount(dialog(state()));
    await click('[data-testid="arming-mode-night"]');
    expect(done).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Nothing assigned to Night");
    expect((container.querySelector('[data-testid="arming-mode-confirm"]') as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { (container.querySelector('input[type="checkbox"]') as HTMLInputElement).click(); });
    await click('[data-testid="arming-mode-confirm"]');
    expect(calls[1]!.body).toEqual({ mode: "night", confirm_unassigned: true });
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("asks for the PIN when the server says the change defends less, and sends it with the retry; a wrong PIN says so", async () => {
    replies = [{ status: 403, body: { error: "x", code: "wrong_pin" } }, { status: 403, body: { error: "x", code: "wrong_pin" } }];
    mount(dialog(state({ current: "away" }), true));
    expect(container.querySelector('[data-testid="arming-mode-disarm"]')).not.toBeNull();
    await click('[data-testid="arming-mode-home"]');
    expect(container.textContent).toContain("PIN needed");
    const input = container.querySelector("input") as HTMLInputElement;
    await act(async () => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!; setter.call(input, "1234"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    await click('[data-testid="arming-mode-pin-go"]');
    expect(calls[1]!.body).toEqual({ mode: "home", pin: "1234" });
    expect(container.textContent).toContain(t("mode_wrong_pin"));
    expect(done).not.toHaveBeenCalled();
  });

  it("does not offer the mode already in force and offers disarming only while armed", () => {
    mount(dialog(state({ current: "home" }), true));
    expect((container.querySelector('[data-testid="arming-mode-home"]') as HTMLButtonElement).disabled).toBe(true);
    expect(container.textContent).toContain("in force");
    expect((container.querySelector('[data-testid="arming-mode-away"]') as HTMLButtonElement).disabled).toBe(false);
  });

  it("is written in every language without a key left bare", () => {
    for (const language of locales) {
      const html = renderToStaticMarkup(createElement(ArmingModeDialog, { t: (key: string) => text(language, key), origin: "http://x", modes: state(), armed: true, onDone: done, onDisarm: vi.fn(), cancel: vi.fn() }));
      expect(html, language).not.toMatch(/am_[a-z_]+/);
    }
  });
});

describe("the editor of the modes in the Alarm Designer", () => {
  it("shows what Home and Night defend and the places, sensors, nodes and cameras to mark; Away only has delays", () => {
    mount(createElement(ArmingModesEditor, { t, origin: "http://x", current: state(), universe, isAdmin: true, onSaved: vi.fn(), onConflict: vi.fn() }));
    expect(container.querySelector('[data-testid="arming-mode-def-away"]')!.querySelectorAll('input[type="checkbox"]').length).toBe(0);
    const hall = container.querySelector('[data-testid="arming-ref-home-zone:Hall"]') as HTMLInputElement;
    expect(hall.checked).toBe(true);
    expect((container.querySelector('[data-testid="arming-ref-night-zone:Hall"]') as HTMLInputElement).checked).toBe(false);
    expect(container.textContent).toContain("Nothing assigned: arming this mode asks for confirmation");
    for (const ref of ["device:door-1", "node:radar-1", "camera:garden"]) expect(container.querySelector(`[data-testid="arming-ref-night-${ref}"]`)).not.toBeNull();
  });

  it("saves the whole document with the revision read; a conflict reloads and says so", async () => {
    const onSaved = vi.fn(), onConflict = vi.fn();
    mount(createElement(ArmingModesEditor, { t, origin: "http://x", current: state(), universe, isAdmin: true, onSaved, onConflict }));
    await click('[data-testid="arming-ref-night-zone:Kitchen"]');
    replies = [{ status: 200, body: state({ revision: 4 }) }];
    await click('[data-testid="arming-modes-save"]');
    expect(calls[0]!.method).toBe("PUT");
    expect(calls[0]!.url).toBe("http://x/api/v1/alarm/modes");
    expect(calls[0]!.body).toMatchObject({ revision: 3, modes: { away: {}, home: { defends: ["zone:Hall"] }, night: { defends: ["zone:Kitchen"] } } });
    expect(onSaved).toHaveBeenCalledTimes(1);
    replies = [{ status: 409, body: { error: "conflict", code: "conflict" } }];
    await click('[data-testid="arming-modes-save"]');
    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Somebody changed the modes meanwhile");
  });

  it("only reads for a person who is not an administrator, and says the modes are off when the server has them off (they can still be prepared)", () => {
    mount(createElement(ArmingModesEditor, { t, origin: "http://x", current: state({ enabled: false }), universe, isAdmin: false, onSaved: vi.fn(), onConflict: vi.fn() }));
    expect(container.querySelector('[data-testid="arming-modes-save"]')).toBeNull();
    expect(container.textContent).toContain("Only an administrator can change the modes.");
    expect(container.textContent).toContain("The arming modes are off in the server");
    expect((container.querySelector('[data-testid="arming-ref-home-zone:Hall"]') as HTMLInputElement).matches(":disabled")).toBe(true);
  });

  it("keeps Save off while the document has a problem and names it", async () => {
    mount(createElement(ArmingModesEditor, { t, origin: "http://x", current: state({ schedule: [{ mode: "home", days: [1], at: "22:00" }] }), universe, isAdmin: true, onSaved: vi.fn(), onConflict: vi.fn() }));
    const delay = container.querySelector('[data-testid="arming-mode-def-home"] input[type="number"]') as HTMLInputElement;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(delay, "999"); delay.dispatchEvent(new Event("input", { bubbles: true })); });
    expect((container.querySelector('[data-testid="arming-modes-save"]') as HTMLButtonElement).disabled).toBe(true);
    expect(container.textContent).toContain("from 0 to 300 seconds");
  });

  it("is written in every language without a key left bare", () => {
    for (const language of locales) {
      const html = renderToStaticMarkup(createElement(ArmingModesEditor, { t: (key: string) => text(language, key), origin: "http://x", current: state({ schedule: [{ mode: "home", days: [1, 2], at: "22:00" }] }), universe, isAdmin: true, onSaved: vi.fn(), onConflict: vi.fn() }));
      expect(html, language).not.toMatch(/\bam_[a-z_]+\b/);
    }
  });
});
