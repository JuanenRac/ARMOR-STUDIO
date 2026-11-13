// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { locales, text } from "./i18n";
import { BackupCard, EnergyBalanceCard, LoadSheddingCard, tandaError } from "./TandaCards";

const O = "http://127.0.0.1:8080";
const t = (key: string) => text("en", key);
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const seen: Array<{ url: string; method: string; body: unknown }> = [];
let routes: Record<string, () => Response> = {};
let root: Root | null = null;
const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); }); };
const host = document.createElement("div");

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  seen.length = 0; routes = {};
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input)).pathname;
    seen.push({ url, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const answer = routes[`${init?.method ?? "GET"} ${url}`];
    return answer ? answer() : json(404, { error: "none" });
  }));
});
afterEach(async () => { await act(async () => { root?.unmount(); }); root = null; vi.unstubAllGlobals(); });

async function show(element: ReturnType<typeof createElement>): Promise<HTMLElement> {
  root = createRoot(host);
  act(() => { root!.render(element); });
  await settle();
  return host;
}

const backup = (enabled: boolean, extra: Record<string, unknown> = {}) => ({
  enabled, key_set: true, running: false, last: { ok: true, at: "2026-01-01T10:00:00Z", file: "armor-backup-20260101T100000Z.armorbk", bytes: 2048, files: 3 }, last_verify: null,
  settings: { schedule: true, every_h: 12, keep: 5, destination: "/media/usb", require_mount: true, include_media: false, max_mb: 256 },
  backups: [{ name: "armor-backup-20260101T100000Z.armorbk", bytes: 2048, at: "2026-01-01T10:00:00Z" }], ...extra,
});

describe("the words of the new cards", () => {
  it("exist in the eight languages, translated and not repeated", () => {
    const keys = ["scr_save", "scr_off", "scr_err_passphrase", "bk_title", "bk_help", "bk_pass", "bk_run", "bk_verify", "ls_title", "ls_help", "ls_loads", "ls_act_shed", "ls_act_released", "eb_title", "eb_help", "eb_watch_help",
      "eb_code_grid_export_unexpected", "eb_code_meter_mismatch", "eb_code_consumption_appliance_stopped", "eb_code_consumption_standby_high", "eb_code_consumption_phase_down", "trigger_schedule", "sched_help"];
    for (const key of keys) {
      const words = new Set<string>();
      for (const locale of locales) { const phrase = text(locale, key); expect(phrase.length, `${locale} ${key}`).toBeGreaterThan(1); expect(phrase, `${locale} ${key}`).not.toBe(key); words.add(phrase); }
      expect(words.size, key).toBeGreaterThanOrEqual(6);
    }
  });
  it("say what a refusal means in the language of the person", () => {
    expect(tandaError(t, new ApiError(422, "weak_passphrase"))).toContain("12 characters");
    expect(tandaError(t, new ApiError(409, "not_mounted"))).toContain("mounted");
    expect(tandaError(t, new ApiError(500, "whatever"))).toBe(t("adm_err_generic"));
    expect(tandaError(t, new Error("x"))).toBe(t("adm_err_generic"));
  });
});

describe("the backup card", () => {
  it("says it is off while the option is off, and shows nothing it could change", async () => {
    routes["GET /api/v1/admin/backup"] = () => json(200, backup(false));
    const view = await show(createElement(BackupCard, { t, origin: O, isAdmin: true }));
    expect(view.querySelector("[data-testid=backup-off]")).not.toBeNull();
    expect(view.querySelector("[data-testid=backup-save]")).toBeNull();
  });
  it("shows the last backup and the list, lets an administrator save the settings and never sends an empty passphrase", async () => {
    routes["GET /api/v1/admin/backup"] = () => json(200, backup(true));
    routes["PUT /api/v1/admin/backup"] = () => json(200, backup(true));
    const view = await show(createElement(BackupCard, { t, origin: O, isAdmin: true }));
    expect(view.textContent).toContain("armor-backup-20260101T100000Z.armorbk");
    expect(view.querySelector("[data-testid=backup-last]")?.textContent).toContain("3 files");
    await act(async () => { (view.querySelector("[data-testid=backup-save]") as HTMLButtonElement).click(); await new Promise(resolve => setTimeout(resolve, 20)); });
    const put = seen.find(call => call.method === "PUT");
    expect(put?.body).toEqual({ schedule: true, every_h: 12, keep: 5, destination: "/media/usb", require_mount: true, include_media: false });
  });
  it("shows an operator the state and none of the controls", async () => {
    routes["GET /api/v1/admin/backup"] = () => json(200, backup(true));
    const view = await show(createElement(BackupCard, { t, origin: O, isAdmin: false }));
    expect(view.querySelector("[data-testid=backup-on]")).not.toBeNull();
    expect(view.querySelector("[data-testid=backup-save]")).toBeNull();
  });
});

describe("the load shedding card", () => {
  const state = (enabled: boolean) => ({ enabled, settings: { limit_w: 4000, restore_w: 3000, hold_s: 30, step_s: 20, loads: ["heater", "boiler"] }, shed: ["heater"], grid_w: 4200, log: [{ at: "2026-01-01T10:00:00Z", action: "shed", device: "heater", grid_w: 4200 }] });
  it("shows what is shed and the log, says when the option is off, and saves the loads as a list", async () => {
    routes["GET /api/v1/electrical/load-shedding"] = () => json(200, state(false));
    routes["PUT /api/v1/electrical/load-shedding"] = () => json(200, state(false));
    const view = await show(createElement(LoadSheddingCard, { t, origin: O, isAdmin: true }));
    expect(view.querySelector("[data-testid=shedding-off]")).not.toBeNull();
    expect(view.querySelector("[data-testid=shedding-now]")?.textContent).toContain("heater");
    expect(view.querySelector("[data-testid=shedding-log]")?.textContent).toContain("switched off");
    await act(async () => { (view.querySelector("[data-testid=shedding-save]") as HTMLButtonElement).click(); await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(seen.find(call => call.method === "PUT")?.body).toEqual({ limit_w: 4000, restore_w: 3000, hold_s: 30, step_s: 20, loads: ["heater", "boiler"] });
  });
  it("explains a refusal of the settings", async () => {
    routes["GET /api/v1/electrical/load-shedding"] = () => json(200, state(true));
    routes["PUT /api/v1/electrical/load-shedding"] = () => json(422, { error: "restore_w too high", code: "invalid_settings" });
    const view = await show(createElement(LoadSheddingCard, { t, origin: O, isAdmin: true }));
    await act(async () => { (view.querySelector("[data-testid=shedding-save]") as HTMLButtonElement).click(); await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(view.textContent).toContain(t("scr_err_invalid"));
  });
});

describe("the energy balance card", () => {
  const balance = { enabled: true, settings: { allow_export: false, export_alert_w: 300, hold_s: 120, mismatch_pct: 40, mismatch_min_w: 500, stopped_h: 6, watch_channels: ["electrical-1/fridge"] },
    balance: { production_w: 3000, consumption_w: 1500, import_w: 0, export_w: 1000, battery_charge_w: 500, self_consumption_pct: 66.7, autarky_pct: 100, reported_load_w: 1500 },
    findings: [{ code: "grid_export_unexpected", key: "balance:export", source: "grid", detail: {} }] };
  it("says it is off when the server answers 404", async () => {
    const view = await show(createElement(EnergyBalanceCard, { t, origin: O, isAdmin: true }));
    expect(view.querySelector("[data-testid=balance-off]")).not.toBeNull();
  });
  it("shows the figures and the open warnings in words, and saves the watched channels", async () => {
    routes["GET /api/v1/electrical/balance"] = () => json(200, balance);
    routes["PUT /api/v1/electrical/balance"] = () => json(200, balance);
    const view = await show(createElement(EnergyBalanceCard, { t, origin: O, isAdmin: true }));
    expect(view.querySelector("[data-testid=balance-figures]")?.textContent).toContain("3000 W");
    expect(view.querySelector("[data-testid=balance-findings]")?.textContent).toContain("feeding the grid");
    await act(async () => { (view.querySelector("[data-testid=balance-save]") as HTMLButtonElement).click(); await new Promise(resolve => setTimeout(resolve, 20)); });
    expect(seen.find(call => call.method === "PUT")?.body).toEqual({ allow_export: false, export_alert_w: 300, hold_s: 120, watch_channels: ["electrical-1/fridge"] });
  });
});
