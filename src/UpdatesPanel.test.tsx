// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { UpdatesPanel } from "./UpdatesPanel";
import { text } from "./i18n";
import { fakeServer, mount, pokeAll } from "./testLive";

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ""; try { window.localStorage.clear(); } catch { /* blocked */ } });
beforeEach(() => { vi.spyOn(window, "confirm").mockReturnValue(true); });

const component = (id: string, status: string, extra: Record<string, unknown> = {}) => ({ id, repo: `ARMOR-${id.toUpperCase()}`, description: "", service: `armor-${id}`, installed: "0.1.0", latest: "0.2.0", status, published: "", error: "", installable: true, notes: "- A change\n- Another change", ...extra });
const overview = (extra: Record<string, unknown> = {}) => ({
  agent: "1.0.0", console: false, running: [], history: [], signature_mode: "off", trusted_fingerprints: [],
  components: [component("server", "update_available"), component("studio", "up_to_date", { latest: "0.1.0" }), component("voice", "unknown", { error: "rate_limited" })],
  os: { name: "Debian", kernel: "6.1", uptime_s: 90000, reboot_required: true, packages: [{ name: "curl", from: "1", to: "2" }], kept_back: ["x"], broken: ["y"] },
  ...extra,
});
const job = (state: string, extra: Record<string, unknown> = {}) => ({ id: "j1", kind: "update", label: "server", state, percent: 40, steps: [{ id: "server.download", label: "", state: "running", percent: 40 }], error: "", started: 1, finished: 0, log: ["line one"], ...extra });
const updateAll = (host: HTMLElement) => [...host.querySelectorAll("button")].find(button => button.textContent === t("mt_update_all")) ?? null;

describe("Configuration > Updates", () => {
  it("shows only the notice to a person who is not an administrator, and asks the server nothing", async () => {
    const calls = fakeServer({});
    const view = await mount(createElement(UpdatesPanel, { t, origin: O, isAdmin: false }));
    expect(view.host.textContent).toContain(t("cs_admin_only"));
    expect(calls).toHaveLength(0);
    await view.unmount();
  });

  it("says the helper is not there and shows its hint when the maintenance status says so", async () => {
    fakeServer({ "GET /api/v1/admin/maintenance/status": { available: false, hint: "turn it on" } });
    const view = await mount(createElement(UpdatesPanel, { t, origin: O, isAdmin: true }));
    expect(view.host.textContent).toContain(t("mt_unavailable"));
    expect(view.host.textContent).toContain("turn it on");
    await view.unmount();
  });

  it("lists the programs and the system, opens the notes of a release, and updates the one that can be updated after asking", async () => {
    const calls = fakeServer({
      "GET /api/v1/admin/maintenance/status": { available: true },
      "GET /api/v1/admin/updates": overview(),
      "POST /api/v1/admin/updates": job("running"),
      "GET /api/v1/admin/maintenance/jobs/j1": job("done", { percent: 100, log: [] }),
    });
    const view = await mount(createElement(UpdatesPanel, { t, origin: O, isAdmin: true }));
    expect(view.host.querySelectorAll("tbody tr").length).toBeGreaterThanOrEqual(3);
    expect(view.host.textContent).toContain("1 d 1 h");
    expect(view.host.textContent).toContain("curl");
    await view.click(view.host.querySelector<HTMLButtonElement>("button[aria-expanded]"));
    expect(view.host.textContent).toContain("A change");
    await view.click(view.host.querySelector("button[aria-expanded]"));
    await view.click(updateAll(view.host));
    expect(calls.find(call => call.method === "POST" && call.path === "/api/v1/admin/updates")?.body).toEqual({ components: ["server"], force: false });
    expect(view.host.querySelector(".mt-job")).not.toBeNull();
    await view.unmount();
  });

  it("does nothing when the question is answered no", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const calls = fakeServer({ "GET /api/v1/admin/maintenance/status": { available: true }, "GET /api/v1/admin/updates": overview() });
    const view = await mount(createElement(UpdatesPanel, { t, origin: O, isAdmin: true }));
    await view.click(updateAll(view.host));
    expect(calls.some(call => call.method === "POST")).toBe(false);
    await view.unmount();
  });

  it("says why an update was refused instead of staying silent", async () => {
    fakeServer({ "GET /api/v1/admin/maintenance/status": { available: true }, "GET /api/v1/admin/updates": overview() });
    const view = await mount(createElement(UpdatesPanel, { t, origin: O, isAdmin: true }));
    await view.click(updateAll(view.host));
    expect(view.host.querySelector("[role=alert]")?.textContent?.length).toBeGreaterThan(0);
    await view.unmount();
  });

  it("uses every control of the panel once without breaking", async () => {
    fakeServer({ "GET /api/v1/admin/maintenance/status": { available: true }, "GET /api/v1/admin/updates": overview({ history: [{ id: "h", kind: "update", label: "server", state: "done", error: "", started: 5, finished: 6 }] }) });
    const view = await mount(createElement(UpdatesPanel, { t, origin: O, isAdmin: true }));
    expect(await pokeAll(view.host)).toBeGreaterThan(5);
    expect(view.host.textContent).toContain(t("mt_title"));
    await view.unmount();
  });
});
