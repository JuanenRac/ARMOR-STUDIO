// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { SecurityPanel } from "./SecurityPanel";
import { SessionUserContext } from "./sessionContext";
import { text } from "./i18n";
import { fakeServer, mount } from "./testLive";

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
const SETTINGS = { "vision.timeline": false, "vision.timeline_days": 30, "network.public_access": false, "network.lan_ca": false, "media.retention_snapshot_days": 0, "media.retention_recording_days": 0 };
const session = { user: { id: "u", username: "x", role: "admin" as const }, known: true, reason: "", refresh: () => undefined, capabilities: { version: 1, actions: { security_settings: true }, features: ["security_settings"] } };
const panel = () => createElement(SessionUserContext.Provider, { value: session as never }, createElement(SecurityPanel, { t, origin: O, isAdmin: true }));
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; });

const choose = async (select: HTMLSelectElement, value: string) => { await act(async () => { select.value = value; select.dispatchEvent(new Event("change", { bubbles: true })); }); await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); };

describe("the options that open the system to more (live)", () => {
  it("turning the timeline on asks first, sends a real boolean, and saying no sends nothing", async () => {
    const calls = fakeServer({ "GET /api/v1/security/settings": { settings: SETTINGS, locked: [] }, "PUT /api/v1/security/settings": (body: unknown) => ({ settings: { ...SETTINGS, ...(body as object) }, locked: [] }) });
    const view = await mount(panel());
    const select = () => view.host.querySelector<HTMLSelectElement>("[data-testid=security-option-vtimeline] select")!;
    window.confirm = () => false;
    await choose(select(), "true");
    expect(calls.filter(call => call.method === "PUT")).toHaveLength(0);
    window.confirm = () => true;
    await choose(select(), "true");
    expect(calls.at(-1)).toEqual({ method: "PUT", path: "/api/v1/security/settings", body: { "vision.timeline": true } });
    expect(view.host.querySelector("[data-testid=security-option-vtimeline-warning]")).not.toBeNull();
    await view.unmount();
  });

  it("the requests from outside the house are also asked about, and a refusal of the server is told in words", async () => {
    const calls = fakeServer({ "GET /api/v1/security/settings": { settings: SETTINGS, locked: [] } });
    const view = await mount(panel());
    window.confirm = () => true;
    await choose(view.host.querySelector<HTMLSelectElement>("[data-testid=security-option-publicaccess] select")!, "true");
    expect(calls.at(-1)).toEqual({ method: "PUT", path: "/api/v1/security/settings", body: { "network.public_access": true } });
    expect(view.host.querySelector("[role=status]")?.textContent?.length).toBeGreaterThan(0);
    await view.unmount();
  });

  it("an option the server does not announce is not offered", async () => {
    fakeServer({ "GET /api/v1/security/settings": { settings: { "media.retention_snapshot_days": 0, "media.retention_recording_days": 0 }, locked: [] } });
    const view = await mount(panel());
    expect(view.host.querySelector("[data-testid=security-option-vtimeline]")).toBeNull();
    expect(view.host.querySelector("[data-testid=security-option-publicaccess]")).toBeNull();
    await view.unmount();
  });

  it("the days of the timeline are saved with the other limits, only when they changed, and a number out of range is refused before anything is sent", async () => {
    const calls = fakeServer({ "GET /api/v1/security/settings": { settings: SETTINGS, locked: [] }, "PUT /api/v1/security/settings": (body: unknown) => ({ settings: { ...SETTINGS, ...(body as object) }, locked: [] }) });
    const view = await mount(panel());
    const input = () => view.host.querySelector<HTMLInputElement>("[data-testid=security-retention-timeline]")!;
    const type = async (value: string) => { await act(async () => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!; setter.call(input(), value); input().dispatchEvent(new Event("input", { bubbles: true })); }); };
    const submit = async () => { await act(async () => { view.host.querySelector("[data-testid=security-retention] form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); }); await view.settle(); };
    await type("0");
    await submit();
    expect(calls.filter(call => call.method === "PUT")).toHaveLength(0);
    expect(view.host.querySelector("[data-testid=security-retention] [role=alert]")).not.toBeNull();
    await type("60");
    await submit();
    expect(calls.at(-1)).toEqual({ method: "PUT", path: "/api/v1/security/settings", body: { "vision.timeline_days": 60 } });
    await view.unmount();
  });
});
