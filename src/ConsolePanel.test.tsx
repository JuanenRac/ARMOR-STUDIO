// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { ConsolePanel, QUICK, TIME_LIMITS } from "./ConsolePanel";
import { text } from "./i18n";
import { fakeServer, mount, pokeAll } from "./testLive";

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; });

describe("the root console", () => {
  it("keeps a person who is not an administrator out and asks the server nothing", async () => {
    const calls = fakeServer({});
    const view = await mount(createElement(ConsolePanel, { t, origin: O, isAdmin: false }));
    expect(view.host.textContent).toContain(t("cs_admin_only"));
    expect(calls).toHaveLength(0);
    await view.unmount();
  });

  it("says when the helper is missing", async () => {
    fakeServer({ "GET /api/v1/admin/console": { available: false, enabled: false, unlocked_until: 0 } });
    const view = await mount(createElement(ConsolePanel, { t, origin: O, isAdmin: true }));
    expect(view.host.textContent).toContain(t("mc_unavailable"));
    await view.unmount();
  });

  it("says when the console is switched off", async () => {
    fakeServer({ "GET /api/v1/admin/console": { available: true, enabled: false, unlocked_until: 0 } });
    const view = await mount(createElement(ConsolePanel, { t, origin: O, isAdmin: true }));
    expect(view.host.textContent).toContain(t("mc_off"));
    await view.unmount();
  });

  it("asks for the password while it is locked and says when it is wrong", async () => {
    const calls = fakeServer({ "GET /api/v1/admin/console": { available: true, enabled: true, unlocked_until: 0 } });
    const view = await mount(createElement(ConsolePanel, { t, origin: O, isAdmin: true }));
    expect(view.host.textContent).toContain(t("mc_lock_title"));
    expect(view.host.querySelector<HTMLButtonElement>("button[type=submit]")?.disabled).toBe(true);
    await pokeAll(view.host);
    expect(calls.some(call => call.path === "/api/v1/admin/console/unlock")).toBe(true);
    await view.unmount();
  });

  it("runs a command once unlocked, shows its output and offers the quick commands and the time limits", async () => {
    const calls = fakeServer({
      "GET /api/v1/admin/console": { available: true, enabled: true, unlocked_until: Date.now() + 600_000 },
      "POST /api/v1/admin/console/run": { id: "c1", command: "ls", state: "done", code: 2, cwd: "/root", output: "listing\n", offset: 8, truncated: false },
      "POST /api/v1/admin/console/lock": { unlocked_until: 0 },
    });
    const view = await mount(createElement(ConsolePanel, { t, origin: O, isAdmin: true }));
    expect(view.host.querySelectorAll(".mc-quick button")).toHaveLength(QUICK.length);
    expect(view.host.querySelectorAll("select option")).toHaveLength(TIME_LIMITS.length);
    await view.click(view.host.querySelector(".mc-quick button"));
    expect(view.host.querySelector<HTMLInputElement>(".mc-input input")?.value).toBe(QUICK[0].command);
    await view.click(view.host.querySelector<HTMLButtonElement>("button[type=submit]"));
    expect(calls.find(call => call.path === "/api/v1/admin/console/run")?.body).toMatchObject({ command: QUICK[0].command, cwd: "/root", timeout: 120 });
    expect(view.host.textContent).toContain("listing");
    expect(view.host.textContent).toContain(`${t("mc_exit")} 2`);
    await view.click([...view.host.querySelectorAll<HTMLButtonElement>(".mc-input button")].find(button => button.textContent === t("mc_clear")) ?? null);
    expect(view.host.querySelector(".mc-entry")).toBeNull();
    await view.click([...view.host.querySelectorAll("button")].find(button => button.textContent === t("mc_close")) ?? null);
    expect(calls.some(call => call.path === "/api/v1/admin/console/lock")).toBe(true);
    await view.unmount();
  });

  it("uses every control of the unlocked console once without breaking", async () => {
    fakeServer({ "GET /api/v1/admin/console": { available: true, enabled: true, unlocked_until: Date.now() + 600_000 } });
    const view = await mount(createElement(ConsolePanel, { t, origin: O, isAdmin: true }));
    await pokeAll(view.host);   // the lock call is a 404 here: closing must not throw, it says the person must confirm again
    expect(view.host.textContent).toContain(t("mc_title"));
    expect(view.host.querySelector("p.notice[role=status]")?.textContent).toBe(t("mc_lock_title"));
    await view.unmount();
  });
});
