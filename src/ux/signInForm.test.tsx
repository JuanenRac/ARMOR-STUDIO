// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ openStudioSession: vi.fn(), completeStudioSession: vi.fn() }));
vi.mock("../api", async importOriginal => ({ ...(await importOriginal<typeof import("../api")>()), ...api }));

import { StudioLogin } from "../StudioLogin";
import { reloadPrefs, setPrefs, DEFAULT_PREFS } from "../prefs";
import { text } from "../i18n";

let root: Root | null = null;
let host: HTMLElement;
const memory = new Map<string, string>();

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  memory.clear();
  Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) } });
  reloadPrefs();
  api.openStudioSession.mockReset(); api.completeStudioSession.mockReset();
});
afterEach(async () => { await act(async () => { root?.unmount(); }); root = null; host?.remove(); });

async function show(origin: string, onAuthenticated: (origin: string) => void = () => undefined) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root!.render(createElement(StudioLogin, { origin, onAuthenticated })); });
}
const type = async (input: Element, value: string) => { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); }); };
const submit = async () => { await act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await Promise.resolve(); await Promise.resolve(); }); };
const fill = async () => { await type(host.querySelector("[data-testid=login-user]")!, "ana"); await type(host.querySelector("[data-testid=login-password]")!, "a-long-password-1"); };
const notice = () => host.querySelector(".login-notice[role=alert]")?.textContent ?? "";

describe("the sign-in form checks what it can before sending the password", () => {
  it("refuses an address that is not http(s) or carries a password, and sends nothing", async () => {
    await show("ftp://armor.local");
    await fill(); await submit();
    expect(notice()).toBe(text("en", "ux_addr_scheme"));
    await type(host.querySelector("#studio-login-server")!, "http://ana:pw@192.168.0.180:18080");
    await submit();
    expect(notice()).toBe(text("en", "ux_addr_credentials"));
    await type(host.querySelector("#studio-login-server")!, "   ");
    await submit();
    expect(notice()).toBe(text("en", "ux_addr_empty"));
    expect(api.openStudioSession).not.toHaveBeenCalled();
  });

  it("warns about plain http outside the house network but lets it through by default", async () => {
    await show("http://203.0.113.9:18080");
    expect(host.querySelector("[data-testid=login-plain-warn]")?.textContent).toBe(text("en", "ux_addr_plain_warn"));
    api.openStudioSession.mockResolvedValue({ done: true });
    const opened = vi.fn();
    await act(async () => { root!.unmount(); }); host.remove();
    await show("http://203.0.113.9:18080", opened);
    await fill(); await submit();
    expect(api.openStudioSession).toHaveBeenCalledWith("http://203.0.113.9:18080", "ana", "a-long-password-1");
    expect(opened).toHaveBeenCalledWith("http://203.0.113.9:18080");
  });

  it("no warning on the house network", async () => {
    await show("http://192.168.0.180:18080");
    expect(host.querySelector("[data-testid=login-plain-warn]")).toBeNull();
  });

  it("refuses plain http outside the house network when the preference is on, before the password leaves", async () => {
    setPrefs({ refuseRemoteHttp: true });
    await show("http://203.0.113.9:18080");
    await fill(); await submit();
    expect(notice()).toBe(text("en", "ux_addr_plain_remote"));
    expect(api.openStudioSession).not.toHaveBeenCalled();
    setPrefs({ refuseRemoteHttp: DEFAULT_PREFS.refuseRemoteHttp });
  });

  it("says what went wrong when the server refuses, limits, fails or cannot be reached", async () => {
    await show("http://192.168.0.180:18080");
    await fill();
    const cases: [unknown, string][] = [
      [new Error("Studio login returned 401"), "ux_login_refused"], [new Error("Studio login returned 429"), "ux_login_rate_limited"],
      [new Error("Studio login returned 502"), "ux_login_server"], [new TypeError("Failed to fetch"), "ux_login_unreachable"],
    ];
    for (const [error, key] of cases) {
      api.openStudioSession.mockRejectedValueOnce(error);
      await submit();
      expect(notice(), key).toBe(text("en", key));
    }
  });
});
