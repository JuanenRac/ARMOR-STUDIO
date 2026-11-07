// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { AutoUpdatesCard } from "./AutoUpdatesCard";
import { FieldHttpCard } from "./FieldHttpCard";
import { StagingCard } from "./StagingCard";
import { text } from "./i18n";
import { fakeServer, mount } from "./testLive";

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; });

describe("the card of the trial of a new server", () => {
  it("shows the choice, says who decides, and sends a real boolean when it is changed", async () => {
    const calls = fakeServer({ "GET /api/v1/admin/maintenance/staging": { enabled: false, source: "env", wait_s: 30 }, "PUT /api/v1/admin/maintenance/staging": (body: unknown) => ({ enabled: (body as { enabled: boolean }).enabled, source: "studio", wait_s: 30 }) });
    const view = await mount(createElement(StagingCard, { t, origin: O }));
    const box = view.host.querySelector<HTMLInputElement>("input[type=checkbox]");
    expect(box?.checked).toBe(false);
    expect(view.host.textContent).toContain(t("mt_staging_env"));
    await view.click(box);
    expect(calls.at(-1)).toEqual({ method: "PUT", path: "/api/v1/admin/maintenance/staging", body: { enabled: true } });
    expect(view.host.querySelector<HTMLInputElement>("input[type=checkbox]")?.checked).toBe(true);
    expect(view.host.textContent).toContain(t("mt_au_saved"));
    expect(view.host.textContent).not.toContain(t("mt_staging_env"));
    await view.unmount();
  });

  it("explains a refusal in the words of the person and keeps the old state", async () => {
    fakeServer({ "GET /api/v1/admin/maintenance/staging": { enabled: false, source: "env", wait_s: 30 } });
    const view = await mount(createElement(StagingCard, { t, origin: O }));
    await view.click(view.host.querySelector("input[type=checkbox]"));
    expect(view.host.querySelector<HTMLInputElement>("input[type=checkbox]")?.checked).toBe(false);
    expect(view.host.querySelector("[role=status]")?.textContent?.length).toBeGreaterThan(0);
    await view.unmount();
  });

  it("shows nothing at all when the helper does not answer", async () => {
    fakeServer({});
    const view = await mount(createElement(StagingCard, { t, origin: O }));
    expect(view.host.innerHTML).toBe("");
    await view.unmount();
  });
});

describe("the card of the field HTTP rule of the firewall", () => {
  it("says it is off, and offers no control, while the option is off", async () => {
    fakeServer({ "GET /api/v1/admin/firewall": { enabled: false } });
    const view = await mount(createElement(FieldHttpCard, { t, origin: O }));
    expect(view.host.querySelector("[data-testid=fhttp-off]")).not.toBeNull();
    expect(view.host.querySelector("button")).toBeNull();
    await view.unmount();
  });

  it("offers only the button that makes sense, and says when the rules were never loaded", async () => {
    fakeServer({ "GET /api/v1/admin/firewall": { enabled: true, installed: true, field_http: false, approval: "totp" } });
    let view = await mount(createElement(FieldHttpCard, { t, origin: O }));
    const buttons = [...view.host.querySelectorAll("button")] as HTMLButtonElement[];
    expect(buttons.map(button => button.disabled)).toEqual([false, true]);
    await view.unmount();
    fakeServer({ "GET /api/v1/admin/firewall": { enabled: true, installed: false, approval: "not_enrolled" } });
    view = await mount(createElement(FieldHttpCard, { t, origin: O }));
    expect(view.host.textContent).toContain(t("adm_fhttp_missing"));
    expect(view.host.textContent).toContain(t("adm_err_totp_not_enrolled"));
    expect([...view.host.querySelectorAll("button")].every(button => (button as HTMLButtonElement).disabled)).toBe(true);
    await view.unmount();
  });

  it("keeps the code to six digits only", async () => {
    fakeServer({ "GET /api/v1/admin/firewall": { enabled: true, installed: true, field_http: true, approval: "totp" } });
    const view = await mount(createElement(FieldHttpCard, { t, origin: O }));
    const input = view.host.querySelector<HTMLInputElement>("input[inputmode=numeric]");
    expect(input?.maxLength).toBe(6);
    expect([...view.host.querySelectorAll("button")].map(button => (button as HTMLButtonElement).disabled)).toEqual([true, false]);
    await view.unmount();
  });

  it("shows the refusal when the server cannot be asked", async () => {
    fakeServer({});
    const view = await mount(createElement(FieldHttpCard, { t, origin: O }));
    expect(view.host.querySelector("[role=status]")?.textContent?.length).toBeGreaterThan(0);
    await view.unmount();
  });
});

describe("the card of the automatic security updates", () => {
  const state = (patch: object = {}) => ({ settings: { enabled: true, reboot: "disarmed", window_start: "03:00", window_end: "05:00" }, package: true, applied: [{ at: "2026-01-01 03:10", packages: ["openssl"], state: "installed" }], reboot_required: true, reboot_note: "armed", last_reboot: 0, health: { checked: 3, ok: false, down: ["armor-server"] }, conf_written: true, ...patch });

  it("shows what was applied, the pending reboot and the services that are down", async () => {
    fakeServer({ "GET /api/v1/admin/system/auto-updates": state() });
    const view = await mount(createElement(AutoUpdatesCard, { t, origin: O, signatureMode: "either", fingerprints: ["SHA256:abc"] }));
    const html = view.host.textContent ?? "";
    expect(html).toContain("openssl");
    expect(html).toContain("armor-server");
    expect(html).toContain(t("mt_au_reboot_required"));
    expect(html).toContain("SHA256:abc");
    await view.unmount();
  });

  it("sends only what changed: the switch alone, and the window with its save button", async () => {
    const calls = fakeServer({ "GET /api/v1/admin/system/auto-updates": state({ health: { checked: 3, ok: true }, reboot_required: false }), "PUT /api/v1/admin/system/auto-updates": state({ health: { checked: 3, ok: true }, reboot_required: false, settings: { enabled: false, reboot: "disarmed", window_start: "03:00", window_end: "05:00" } }) });
    const view = await mount(createElement(AutoUpdatesCard, { t, origin: O }));
    const [enabled] = [...view.host.querySelectorAll<HTMLInputElement>("input[type=checkbox]")];
    await view.click(enabled ?? null);
    expect(calls.at(-1)).toEqual({ method: "PUT", path: "/api/v1/admin/system/auto-updates", body: { enabled: false } });
    expect(view.host.textContent).toContain(t("mt_au_health_ok"));
    const never = view.host.querySelector<HTMLInputElement>("input[name=au-reboot]");
    await view.click(never);
    const save = view.host.querySelector<HTMLButtonElement>("button.primary");
    expect(save?.disabled).toBe(false);
    await view.click(save ?? null);
    expect(calls.at(-1)?.body).toEqual({ reboot: "never" });
    await view.unmount();
  });

  it("says when the package is missing, and shows nothing when the helper does not answer", async () => {
    fakeServer({ "GET /api/v1/admin/system/auto-updates": state({ package: false, applied: [], reboot_required: false, health: {} }) });
    let view = await mount(createElement(AutoUpdatesCard, { t, origin: O }));
    expect(view.host.textContent).toContain(t("mt_au_nopackage"));
    expect(view.host.textContent).toContain(t("mt_au_none"));
    await view.unmount();
    fakeServer({});
    view = await mount(createElement(AutoUpdatesCard, { t, origin: O }));
    expect(view.host.innerHTML).toBe("");
    await view.unmount();
  });
});
