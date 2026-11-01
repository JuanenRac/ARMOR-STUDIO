// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { text } from "../i18n";

const api = vi.hoisted(() => ({
  listUsers: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), deleteUser: vi.fn(), changeAccount: vi.fn(), setMyPin: vi.fn(), setUserPin: vi.fn(), clearUserPin: vi.fn(),
}));
vi.mock("../api", async importOriginal => ({ ...(await importOriginal<typeof import("../api")>()), ...api }));
vi.mock("../askConfirm", () => ({ askConfirm: vi.fn() }));

import type { ListedUser } from "../api";
import { SessionUserContext } from "../sessionContext";
import { UsersPanel } from "../UsersPanel";

const t = (key: string) => text("en", key);
let root: Root | null = null;
let container: HTMLElement;
const admin: ListedUser = { id: "u1", username: "boss", role: "admin", createdAt: "2000-01-01T00:00:00Z", updatedAt: "2000-01-01T00:00:00Z", current: true, hasPin: false } as ListedUser;
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

async function show() {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const value = { user: admin, known: true, reason: "", refresh: vi.fn() };
  await act(async () => { root!.render(createElement(SessionUserContext.Provider, { value: value as never }, createElement(UsersPanel, { t, origin: "http://s" }))); });
  await flush();
}
const type = async (input: Element, value: string) => { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); }); };
const field = (label: string, within: ParentNode): HTMLInputElement => {
  const found = [...within.querySelectorAll("label")].find(item => item.firstChild?.textContent === label);
  if (!found) throw new Error(`no field ${label}`);
  return found.querySelector("input, select") as HTMLInputElement;
};
const button = (label: string, within: ParentNode): HTMLButtonElement => [...within.querySelectorAll("button")].find(item => item.textContent === label) as HTMLButtonElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  for (const fn of Object.values(api)) fn.mockReset();
  api.listUsers.mockResolvedValue({ users: [admin], minPasswordLength: 12 });
});
afterEach(async () => { await act(async () => { root?.unmount(); }); root = null; container?.remove(); });

describe("the rules of passwords and PINs, told while typing", () => {
  it("a new user's password that is too short or equal to the name says why and cannot be created", async () => {
    await show();
    const add = container.querySelector(".users-card:last-of-type")!;
    await type(field(t("userName"), add), "night-guard");
    await type(field(t("newPassword"), add), "short");
    expect(add.querySelector("[data-testid=users-issues]")?.textContent).toBe(text("en", "ux_pw_short").replace("{0}", "12"));
    expect(button(t("createUser"), add).disabled).toBe(true);
    await type(field(t("newPassword"), add), "night-guard");
    expect(add.querySelector("[data-testid=users-issues]")?.textContent).toContain(text("en", "ux_pw_is_name"));
    await type(field(t("newPassword"), add), "a-long-password-1");
    expect(add.querySelector("[data-testid=users-issues]")).toBeNull();
    expect(button(t("createUser"), add).disabled).toBe(false);
  });

  it("the own account needs the two new passwords to agree, but only complains once the second is being typed", async () => {
    await show();
    const mine = container.querySelector(".users-card")!;
    await type(field(t("currentPassword"), mine), "the-current-one");
    await type(field(t("newPassword"), mine), "a-long-password-1");
    expect(mine.querySelector("[data-testid=users-issues]")).toBeNull();
    expect(button(t("saveAccount"), mine).disabled).toBe(true);
    await type(field(t("confirmPassword"), mine), "a-long-password-2");
    expect(mine.querySelector("[data-testid=users-issues]")?.textContent).toBe(text("en", "ux_pw_mismatch"));
    await type(field(t("confirmPassword"), mine), "a-long-password-1");
    expect(button(t("saveAccount"), mine).disabled).toBe(false);
  });

  it("the PIN needs its digits and the duress PIN has to differ", async () => {
    await show();
    const mine = container.querySelector(".users-card")!;
    await type(field(t("currentPassword"), mine), "the-current-one");
    await type(field(t("pinValue"), mine), "12");
    expect(mine.querySelector("[data-testid=users-issues]")?.textContent).toBe(text("en", "ux_pin_short").replace("{0}", "4"));
    expect(button(t("pinSave"), mine).disabled).toBe(true);
    await type(field(t("pinValue"), mine), "1234");
    await type(field(t("duressValue"), mine), "1234");
    expect(mine.querySelector("[data-testid=users-issues]")?.textContent).toBe(text("en", "ux_pin_same"));
    expect(button(t("pinSave"), mine).disabled).toBe(true);
    await type(field(t("duressValue"), mine), "4321");
    expect(button(t("pinSave"), mine).disabled).toBe(false);
  });
});
