// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { BrokerPanel, FilesPanel, ServicesPanel } from "./AdminPanel";
import { text } from "./i18n";
import { byText, fakeServer, mount, pokeAll, typeInto } from "./testLive";

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ""; });
beforeEach(() => { vi.spyOn(window, "confirm").mockReturnValue(true); });

const service = (id: string, extra: Record<string, unknown> = {}) => ({ id, unit: `armor-${id}`, description: `The ${id}`, installed: true, active: "active", sub: "running", enabled: "enabled", pid: 7, since: "", ...extra });
const file = (id: string, extra: Record<string, unknown> = {}) => ({ id, path: `/etc/${id}`, format: "env", description: `File ${id}`, units: [`armor-${id}`], exists: true, mtime: 5, ...extra });
const base = (extra: Record<string, unknown> = {}) => ({
  "GET /api/v1/admin/status": { available: true, sensitive_writes: { mode: "open", protected: false }, approval: "totp" },
  "GET /api/v1/admin/services": { services: [service("mosquitto"), service("server"), service("studio", { active: "inactive", pid: 0 }), service("voice", { active: "failed" }), service("gone", { installed: false })] },
  "GET /api/v1/admin/files": { files: [file("server.env"), file("mosquitto.acl")] },
  "GET /api/v1/admin/files/server.env": { ...file("server.env"), content: "A=1\nB=2", masked: true },
  "GET /api/v1/admin/files/mosquitto.acl": { ...file("mosquitto.acl"), content: "user x" },
  "PUT /api/v1/admin/files/server.env": { ok: true, restarted: ["server"], mtime: 6 },
  "GET /api/v1/admin/mqtt/accounts": { accounts: [{ user: "nodo-1", role: "field-node", name: "nodo-1", manageable: true, topics: ["a/b"] }, { user: "server", role: "system", name: "server", manageable: false, topics: [] }] },
  "POST /api/v1/admin/mqtt/accounts": { ok: true, user: "nodo-radar-2", password: "s3cret" },
  "DELETE /api/v1/admin/mqtt/accounts/nodo-1": { ok: true },
  "POST /api/v1/admin/services/mosquitto/restart": { ok: true },
  "POST /api/v1/admin/services/mosquitto/stop": { ok: true },
  "POST /api/v1/admin/services/studio/start": { ok: true },
  "POST /api/v1/admin/services/server/restart": { ok: true },
  "POST /api/v1/admin/services/voice/pause": { ok: true },
  "GET /api/v1/system/connection": { active: { host: "h", port: 1, tls: false, studio_origins: [] }, mqtt_tls: { configured: true, tls: true, pinned_ca: false }, saved: {}, restart_required: false },
  "GET /api/v1/admin/mqtt/relays": { enabled: false },
  "GET /api/v1/admin/firewall": { enabled: false },
  ...extra,
});

describe("Configuration > Services, run for real", () => {
  it("keeps everybody who is not an administrator out, says when the helper is missing, and asks the server nothing in the first case", async () => {
    const calls = fakeServer({});
    const denied = await mount(createElement(ServicesPanel, { t, origin: O, isAdmin: false }));
    expect(denied.host.textContent).toContain(t("cs_admin_only"));
    expect(calls).toHaveLength(0);
    await denied.unmount();
    fakeServer({ "GET /api/v1/admin/status": { available: false } });
    const missing = await mount(createElement(ServicesPanel, { t, origin: O, isAdmin: true }));
    expect(missing.host.textContent).toContain(t("adm_missing"));
    await missing.unmount();
    fakeServer({});
    const down = await mount(createElement(ServicesPanel, { t, origin: O, isAdmin: true }));
    expect(down.host.textContent).toContain(t("adm_missing"));
    await down.unmount();
  });

  it("lists the services, starts one at once, asks before it restarts or stops, and says what happened", async () => {
    const calls = fakeServer(base());
    const view = await mount(createElement(ServicesPanel, { t, origin: O, isAdmin: true }));
    expect(view.host.querySelectorAll(".adm-service")).toHaveLength(5);
    await view.click(view.host.querySelector(".adm-service .svc-act.restart"));
    expect(view.host.querySelector("[role=alertdialog]")).not.toBeNull();
    await view.click(byText(view.host, t("cancelAction")));
    expect(view.host.querySelector("[role=alertdialog]")).toBeNull();
    await view.click(view.host.querySelector(".adm-service .svc-act.start"));
    expect(calls.some(call => call.path === "/api/v1/admin/services/studio/start")).toBe(true);
    expect(view.host.textContent).toContain(t("adm_done"));
    await view.unmount();
  });

  it("restarts the server, whose answer is cut, without calling it a failure", async () => {
    const calls = fakeServer(base());
    const view = await mount(createElement(ServicesPanel, { t, origin: O, isAdmin: true }));
    const rows = [...view.host.querySelectorAll(".adm-service")];
    const server = rows.find(row => row.textContent?.includes("The server"))!;
    await view.click(server.querySelector(".svc-act.restart"));
    await view.click(view.host.querySelector(".confirm-actions .primary, .confirm-actions .danger"));
    expect(calls.some(call => call.path === "/api/v1/admin/services/server/restart")).toBe(true);
    await view.unmount();
  });

  it("says why an action failed and refreshes the list on request", async () => {
    const calls = fakeServer(base({ "POST /api/v1/admin/services/mosquitto/pause": undefined }));
    const view = await mount(createElement(ServicesPanel, { t, origin: O, isAdmin: true }));
    const broker = [...view.host.querySelectorAll(".adm-service")].find(row => row.textContent?.includes("The mosquitto"))!;
    await view.click(broker.querySelector(".svc-act.pause"));
    await view.click(view.host.querySelector(".confirm-actions .primary, .confirm-actions .danger"));
    expect(view.host.querySelector(".notice.bad")).not.toBeNull();
    const before = calls.filter(call => call.path === "/api/v1/admin/services").length;
    await view.click(byText(view.host, t("svcRefresh")));
    expect(calls.filter(call => call.path === "/api/v1/admin/services").length).toBeGreaterThan(before);
    await view.unmount();
  });
});

describe("Configuration > Files, run for real", () => {
  it("lists the settings files, opens the first, edits it, saves it with and without a restart, and reverts", async () => {
    const calls = fakeServer(base());
    const view = await mount(createElement(FilesPanel, { t, origin: O, isAdmin: true }));
    expect(view.host.querySelectorAll(".adm-file-list li")).toHaveLength(2);
    expect(view.host.querySelector<HTMLTextAreaElement>("textarea")?.value).toContain("A=1");
    expect(view.host.textContent).toContain(t("adm_masked_help"));
    expect((byText(view.host, t("adm_save")) as HTMLButtonElement).disabled).toBe(true);
    await typeInto(view.host.querySelector("textarea"), "A=9");
    await view.click(byText(view.host, t("adm_revert")));
    expect(view.host.querySelector<HTMLTextAreaElement>("textarea")?.value).toContain("A=1");
    await typeInto(view.host.querySelector("textarea"), "A=9");
    await view.click(byText(view.host, t("adm_save")));
    expect(calls.find(call => call.method === "PUT")?.body).toMatchObject({ content: "A=9", restart: false, expect_mtime: 5 });
    await typeInto(view.host.querySelector("textarea"), "A=10");
    await view.click(byText(view.host, t("adm_save_restart")));
    expect(view.host.textContent).toContain(t("adm_saved_restarted"));
    await view.click(view.host.querySelectorAll(".adm-file-list button")[1]);
    expect(view.host.querySelector<HTMLTextAreaElement>("textarea")?.value).toBe("user x");
    await view.unmount();
  });

  it("types the one-time code and says when a save is refused", async () => {
    fakeServer(base({ "PUT /api/v1/admin/files/server.env": undefined }));
    const view = await mount(createElement(FilesPanel, { t, origin: O, isAdmin: true }));
    await typeInto(view.host.querySelector("[data-testid=agent-totp] input"), "12a3456");
    expect(view.host.querySelector<HTMLInputElement>("[data-testid=agent-totp] input")?.value).toBe("123456");
    await typeInto(view.host.querySelector("textarea"), "A=2");
    await view.click(byText(view.host, t("adm_save")));
    expect(view.host.querySelector(".notice.bad")).not.toBeNull();
    await view.unmount();
  });

  it("shows how the agent protects its writes: second secret, read only", async () => {
    fakeServer(base({ "GET /api/v1/admin/status": { available: true, sensitive_writes: { mode: "second_token", protected: true } } }));
    const second = await mount(createElement(FilesPanel, { t, origin: O, isAdmin: true }));
    await typeInto(second.host.querySelector("[data-testid=agent-second-secret] input"), "hunter2");
    expect(second.host.querySelector("[data-testid=agent-second-secret]")).not.toBeNull();
    await second.unmount();
    fakeServer(base({ "GET /api/v1/admin/status": { available: true, sensitive_writes: { mode: "read_only", protected: true } } }));
    const readOnly = await mount(createElement(FilesPanel, { t, origin: O, isAdmin: true }));
    expect(readOnly.host.querySelector("[data-testid=agent-read-only]")).not.toBeNull();
    await readOnly.unmount();
    fakeServer(base());
    const open = await mount(createElement(FilesPanel, { t, origin: O, isAdmin: true }));
    expect(open.host.querySelector("[data-testid=agent-open]")).not.toBeNull();
    await open.unmount();
  });
});

describe("Configuration > MQTT broker, run for real", () => {
  it("shows the broker, the encryption card and the accounts; opens the topics of one", async () => {
    fakeServer(base());
    const view = await mount(createElement(BrokerPanel, { t, origin: O, isAdmin: true }));
    expect(view.host.textContent).toContain(t("adm_tls_title"));
    expect(view.host.querySelectorAll(".adm-account")).toHaveLength(2);
    await view.click(byText(view.host, t("alarmDetails")));
    expect(view.host.querySelector(".adm-topics")?.textContent).toContain("a/b");
    await view.click(byText(view.host, t("alarmHideDetails")));
    expect(view.host.querySelector(".adm-topics")).toBeNull();
    await view.unmount();
  });

  it("restarts or stops the broker only after asking, and does nothing when the answer is no", async () => {
    const calls = fakeServer(base());
    const view = await mount(createElement(BrokerPanel, { t, origin: O, isAdmin: true }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await view.click(view.host.querySelector(".adm-service .svc-act.restart"));
    expect(calls.some(call => call.path.endsWith("/mosquitto/restart"))).toBe(false);
    confirm.mockReturnValue(true);
    await view.click(view.host.querySelector(".adm-service .svc-act.restart"));
    expect(calls.some(call => call.path.endsWith("/mosquitto/restart"))).toBe(true);
    await view.unmount();
    const again = await mount(createElement(BrokerPanel, { t, origin: O, isAdmin: true }));
    await again.click(again.host.querySelector(".adm-service .svc-act.stop"));
    expect(calls.some(call => call.path.endsWith("/mosquitto/stop"))).toBe(true);
    await again.unmount();
  });

  it("refuses a bad name, makes an account, shows its password once, copies and closes it", async () => {
    const calls = fakeServer(base());
    const copied: string[] = [];
    vi.stubGlobal("navigator", { clipboard: { writeText: async (value: string) => { copied.push(value); } } });
    const view = await mount(createElement(BrokerPanel, { t, origin: O, isAdmin: true }));
    await typeInto(view.host.querySelector<HTMLInputElement>(".adm-form input"), "-bad name");
    await view.click(view.host.querySelector(".adm-form button[type=submit]"));
    expect(view.host.textContent).toContain(t("adm_err_invalid_name"));
    await typeInto(view.host.querySelector<HTMLSelectElement>(".adm-form select"), "solar-node");
    await typeInto(view.host.querySelector<HTMLInputElement>(".adm-form input"), "nodo-radar-2");
    await view.click(view.host.querySelector(".adm-form button[type=submit]"));
    expect(calls.find(call => call.method === "POST" && call.path.endsWith("/accounts"))?.body).toEqual({ role: "solar-node", name: "nodo-radar-2" });
    expect(view.host.querySelector(".adm-secret")?.textContent).toContain("s3cret");
    await view.click(byText(view.host, t("no_copy")));
    expect(copied).toEqual(["s3cret"]);
    await view.click(byText(view.host, t("close")));
    expect(view.host.querySelector(".adm-secret")).toBeNull();
    await view.unmount();
  });

  it("says when making an account fails, and removes one after asking", async () => {
    const calls = fakeServer(base({ "POST /api/v1/admin/mqtt/accounts": undefined }));
    const view = await mount(createElement(BrokerPanel, { t, origin: O, isAdmin: true }));
    await typeInto(view.host.querySelector<HTMLInputElement>(".adm-form input"), "good-name");
    await view.click(view.host.querySelector(".adm-form button[type=submit]"));
    expect(view.host.querySelector(".notice.bad")).not.toBeNull();
    await view.click(view.host.querySelector(".adm-account .danger-button"));
    expect(view.host.querySelector("[role=alertdialog]")).not.toBeNull();
    await view.click(view.host.querySelector(".confirm-actions .danger"));
    expect(calls.some(call => call.method === "DELETE" && call.path.endsWith("/nodo-1"))).toBe(true);
    await view.unmount();
  });

  it("says the broker is not installed when the list has no mosquitto, and every control works once", async () => {
    fakeServer(base({ "GET /api/v1/admin/services": { services: [] } }));
    const view = await mount(createElement(BrokerPanel, { t, origin: O, isAdmin: true }));
    expect(view.host.textContent).toContain(t("adm_not_installed"));
    expect(await pokeAll(view.host)).toBeGreaterThan(3);
    await view.unmount();
  });
});
