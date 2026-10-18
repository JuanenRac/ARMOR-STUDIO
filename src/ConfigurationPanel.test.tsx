// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { text } from "./i18n";

const api = vi.hoisted(() => ({ readConnection: vi.fn(), saveConnection: vi.fn() }));
vi.mock("./api", async importOriginal => ({ ...(await importOriginal<typeof import("./api")>()), ...api }));
// The tabs have their own tests: here only the panel that holds them is looked at.
for (const [path, name] of [["./UsersPanel", "UsersPanel"], ["./AdminPanel", "BrokerPanel,FilesPanel,ServicesPanel"], ["./FirmwarePanel", "FirmwarePanel"], ["./CapturePanel", "CapturePanel"], ["./NotificationsPanel", "NotificationsPanel"], ["./InstallationPanel", "InstallationPanel"], ["./UpdatesPanel", "UpdatesPanel"], ["./ConsolePanel", "ConsolePanel"], ["./PreferencesPanel", "PreferencesPanel"], ["./SecurityPanel", "SecurityPanel"]] as const) {
  vi.doMock(path, () => Object.fromEntries(name.split(",").map(item => [item, () => createElement("div", { "data-panel": item })])));
}

const t = (key: string) => text("en", key);
let root: Root | null = null;
let container: HTMLElement;
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

type Overrides = Partial<{ isAdmin: boolean; isViewer: boolean; origin: string }>;
async function show(overrides: Overrides = {}) {
  const { ConfigurationPanel } = await import("./ConfigurationPanel");
  const setOrigin = vi.fn();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(createElement(ConfigurationPanel, {
      t, origin: overrides.origin ?? "http://armor.local:8080", setOrigin, theme: "Night", themes: ["Night", "Day"], setTheme: vi.fn(), language: "en", languages: [{ code: "en", name: "English" }], setLanguage: vi.fn(),
      connection: "synced", savePreferences: vi.fn(), exportSite: vi.fn(), operatorUnlocked: true, isAdmin: overrides.isAdmin ?? false, isViewer: overrides.isViewer,
    }));
  });
  await flush();
  return { setOrigin };
}
const tabNames = () => [...container.querySelectorAll("[data-tour^=tab-]")].map(item => item.getAttribute("data-tour")!.slice(4));
const click = async (target: Element) => { await act(async () => { target.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await flush(); };

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetModules();
  for (const fn of Object.values(api)) fn.mockReset();
  api.readConnection.mockResolvedValue({ active: { host: "0.0.0.0", port: 8080, tls: false, studio_origins: [] }, saved: { port: 9000 }, restart_required: false });
});
afterEach(async () => { await act(async () => { root?.unmount(); }); root = null; container?.remove(); });

describe("the configuration screen, by who is looking at it", () => {
  it("offers every tab to someone who can change the installation, grouped from the person's own to the system's", async () => {
    await show({ isAdmin: true });
    expect(tabNames()).toEqual(["general", "preferences", "users", "security", "notifications", "capture", "firmware", "updates", "services", "broker", "files", "installation", "console"]);
    expect(container.querySelectorAll(".tab-sep")).toHaveLength(3);
  });

  it("offers a viewer only the tabs that do not change anything, with no separator left over", async () => {
    await show({ isViewer: true });
    expect(tabNames()).toEqual(["general", "preferences", "users", "security"]);
    expect(container.querySelectorAll(".tab-sep")).toHaveLength(1);
    for (const hidden of ["console", "files", "broker", "installation", "firmware", "updates", "services", "notifications", "capture"]) expect(container.querySelector(`[data-tour=tab-${hidden}]`), hidden).toBeNull();
  });

  it("shows the panel of the tab that is chosen and only that one", async () => {
    await show({ isAdmin: true });
    expect(container.querySelector("[data-panel]")).toBeNull();   // general draws its own cards
    await click(container.querySelector("[data-tour=tab-users]")!);
    expect([...container.querySelectorAll("[data-panel]")].map(item => item.getAttribute("data-panel"))).toEqual(["UsersPanel"]);
    await click(container.querySelector("[data-tour=tab-console]")!);
    expect([...container.querySelectorAll("[data-panel]")].map(item => item.getAttribute("data-panel"))).toEqual(["ConsolePanel"]);
  });
});

describe("the address of the server", () => {
  const input = () => [...container.querySelectorAll("label")].find(item => item.firstChild?.textContent === t("serverOrigin"))!.querySelector("input") as HTMLInputElement;
  const type = async (value: string) => { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input(), value); input().dispatchEvent(new Event("input", { bubbles: true })); }); };
  const leave = async () => { await act(async () => { input().dispatchEvent(new FocusEvent("focusout", { bubbles: true })); }); };

  it("is applied when the person leaves the box, not on every key, and as a clean address", async () => {
    const { setOrigin } = await show();
    await type("http://10.0.0.5:8080/");
    expect(setOrigin).not.toHaveBeenCalled();
    await leave();
    expect(setOrigin).toHaveBeenCalledTimes(1);
    expect(setOrigin.mock.calls[0]![0]).toMatch(/^http:\/\/10\.0\.0\.5:8080\/?$/);
  });

  it("something that is not an address puts the one in use back and changes nothing", async () => {
    const { setOrigin } = await show();
    await type("not an address at all");
    await leave();
    expect(setOrigin).not.toHaveBeenCalled();
    expect(input().value).toBe("http://armor.local:8080");
  });

  it("the same address again is not a change of server", async () => {
    const { setOrigin } = await show();
    await type("http://armor.local:8080");
    await leave();
    expect(setOrigin).not.toHaveBeenCalled();
  });
});

describe("the technical settings of the server", () => {
  it("are the administrator's: anybody else reads that they are, and the server is not even asked", async () => {
    await show({ isAdmin: false });
    expect(container.textContent).toContain(t("cs_admin_only"));
    expect(api.readConnection).not.toHaveBeenCalled();
  });

  it("show what is in use and what is saved to an administrator, and save blank fields as 'leave it as it is'", async () => {
    await show({ isAdmin: true });
    expect(api.readConnection).toHaveBeenCalledWith("http://armor.local:8080");
    expect(container.textContent).toContain("0.0.0.0:8080");
    const fields = [...container.querySelectorAll(".camera-form input")] as HTMLInputElement[];
    expect(fields.map(item => item.value)).toEqual(["", "9000", ""]);
    api.saveConnection.mockResolvedValue({ active: { host: "0.0.0.0", port: 8080, tls: true, studio_origins: [] }, saved: { port: 9000 }, restart_required: true });
    await click([...container.querySelectorAll("button")].find(item => item.textContent === t("cs_save"))!);
    expect(api.saveConnection).toHaveBeenCalledWith("http://armor.local:8080", { host: undefined, port: 9000, studio_port: undefined });
    expect(container.textContent).toContain(t("cs_restart"));
    expect(container.textContent).toContain(t("cs_done"));
    expect(container.textContent).toContain("(https)");
  });

  it("a refusal is shown with its reason and does not look like a success", async () => {
    await show({ isAdmin: true });
    api.saveConnection.mockRejectedValue(new Error("port in use"));
    await click([...container.querySelectorAll("button")].find(item => item.textContent === t("cs_save"))!);
    expect(container.textContent).toContain(`${t("cs_error")}port in use`);
    expect(container.textContent).not.toContain(t("cs_done"));
  });
});
