// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NodeSettingsDialog, parseLoginLimit, whyKey } from "./NodeSettingsDialog";
import { NodeToolbar, type ToolbarProps } from "./NodeToolbar";
import { text } from "../i18n";
import { nodeSettingsCatalogues } from "../nodeSettingsText";

const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
vi.mock("../api/transport", async importOriginal => {
  const real = await importOriginal<typeof import("../api/transport")>();
  return { ...real, userCall: vi.fn(async (_origin: string, _method: string, url: string, body: Record<string, unknown>) => {
    calls.push({ url, body });
    if (body.panel_password === "wrong") return { ok: false, written: false, why: "panel_login_refused" };
    return { ok: true, written: body.login_limit_per_minute !== undefined, why: "", login_limit_per_minute: (body.login_limit_per_minute as number | undefined) ?? 30 };
  }) };
});

let root: Root | null = null;
let host: HTMLElement | null = null;
const t = (key: string) => text("en", key);
const mount = async (node: ReturnType<typeof createElement>) => {
  host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
  await act(async () => { root!.render(node); });
  return document.body;
};
const type = async (input: HTMLInputElement, value: string) => {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

describe("the settings of a node", () => {
  beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; calls.length = 0; });
  afterEach(async () => { await act(async () => { root?.unmount(); }); host?.remove(); root = null; host = null; });

  it("accepts a whole limit from 0 to 120 and nothing else", () => {
    expect([parseLoginLimit("0"), parseLoginLimit(" 30 "), parseLoginLimit("120")]).toEqual([0, 30, 120]);
    for (const bad of ["", "121", "-1", "1.5", "abc", "1000"]) expect(parseLoginLimit(bad)).toBeNull();
    expect(whyKey("panel_login_refused")).toBe("ns_why_panel_login_refused");
    expect(whyKey("something else")).toBe("ns_err_generic");
  });

  it("has every phrase in the eight languages", () => {
    for (const code of ["en", "es", "de", "fr", "it", "ja", "zh", "pt"] as const) {
      const catalogue = nodeSettingsCatalogues[code]!;
      expect(Object.keys(catalogue).sort(), code).toEqual(Object.keys(nodeSettingsCatalogues.en).sort());
      for (const value of Object.values(catalogue)) expect(value.trim()).not.toBe("");
    }
  });

  it("reads the setting and writes the new one through the server with the login given", async () => {
    const view = await mount(createElement(NodeSettingsDialog, { t, origin: "http://srv", id: "hmi-1", address: "192.168.0.50", close: () => undefined }));
    const [user, password, limit] = [...view.querySelectorAll("input")] as HTMLInputElement[];
    expect(user.value).toBe("admin");
    const [, read, save] = [...view.querySelectorAll(".confirm-actions button")] as HTMLButtonElement[];
    expect([read.disabled, save.disabled]).toEqual([true, true]);
    await type(password, "node-pass");
    await act(async () => { read.click(); });
    expect(calls[0]).toEqual({ url: "/api/v1/admin/nodes/settings", body: { node_id: "hmi-1", address: "192.168.0.50", panel_user: "admin", panel_password: "node-pass" } });
    expect(limit.value).toBe("30");
    expect(view.querySelector("[role=status]")?.textContent).toContain("30");
    await type(password, "node-pass");
    await type(limit, "0");
    await act(async () => { save.click(); });
    expect(calls[1]!.body.login_limit_per_minute).toBe(0);
    expect(password.value).toBe("");
  });

  it("says why the node's panel refused", async () => {
    const view = await mount(createElement(NodeSettingsDialog, { t, origin: "http://srv", id: "hmi-1", address: "192.168.0.50", close: () => undefined }));
    const inputs = [...view.querySelectorAll("input")] as HTMLInputElement[];
    await type(inputs[1]!, "wrong");
    await act(async () => { ([...view.querySelectorAll(".confirm-actions button")][1] as HTMLButtonElement).click(); });
    expect(view.querySelector("[role=alert]")?.textContent).toBe(t("ns_why_panel_login_refused"));
  });

  it("puts the button in the toolbar only for an administrator who knows where the panel is", async () => {
    const base: ToolbarProps = { t, origin: "http://srv", id: "hmi-1", panel: { ip: "192.168.0.50", port: 80 }, silent: false, registered: true, editAddress: () => undefined, settings: () => undefined, health: null, isAdmin: true, detailsOpen: false, toggleDetails: () => undefined, control: () => undefined, forget: () => undefined };
    const view = await mount(createElement(NodeToolbar, base));
    expect([...view.querySelectorAll(".nt-btn")].map(item => item.getAttribute("aria-label"))).toContain(t("ns_open"));
    await act(async () => { root!.render(createElement(NodeToolbar, { ...base, isAdmin: false })); });
    expect([...view.querySelectorAll(".nt-btn")].map(item => item.getAttribute("aria-label"))).not.toContain(t("ns_open"));
  });
});
