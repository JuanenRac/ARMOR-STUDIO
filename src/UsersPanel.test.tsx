// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { locales, text } from "./i18n";

const api = vi.hoisted(() => ({
  listUsers: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), deleteUser: vi.fn(), changeAccount: vi.fn(), setMyPin: vi.fn(), setUserPin: vi.fn(), clearUserPin: vi.fn(),
}));
vi.mock("./api", async importOriginal => ({ ...(await importOriginal<typeof import("./api")>()), ...api }));
const confirm = vi.hoisted(() => ({ ask: vi.fn() }));
vi.mock("./askConfirm", () => ({ askConfirm: confirm.ask }));

import { ApiError, type ListedUser, type Role } from "./api";
import type { SessionUser } from "./hooks";
import { SessionUserContext } from "./sessionContext";
import { UsersPanel } from "./UsersPanel";

const t = (key: string) => text("en", key);
let root: Root | null = null;
let container: HTMLElement;

const listed = (id: string, username: string, role: Role, extra: Partial<ListedUser> = {}): ListedUser => ({ id, username, role, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", current: false, hasPin: false, hasDuress: false, ...extra });
const admin = listed("u1", "boss", "admin", { current: true });
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };

async function show(session: Partial<SessionUser> | null) {
  const value: SessionUser | null = session && { user: null, known: true, reason: "", refresh: vi.fn(), ...session };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(createElement(SessionUserContext.Provider, { value }, createElement(UsersPanel, { t, origin: "http://s" }))); });
  await flush();
}

/** Types into a controlled input the way a browser does. */
async function type(input: Element, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
const field = (label: string, within: ParentNode = container): HTMLInputElement => {
  const found = [...within.querySelectorAll("label")].find(item => item.firstChild?.textContent === label);
  if (!found) throw new Error(`no field ${label}`);
  return found.querySelector("input, select") as HTMLInputElement;
};
const button = (label: string, within: ParentNode = container): HTMLButtonElement => {
  const found = [...within.querySelectorAll("button")].find(item => item.textContent === label);
  if (!found) throw new Error(`no button ${label}`);
  return found as HTMLButtonElement;
};
const click = async (target: Element) => { await act(async () => { target.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await flush(); };
const submit = async (form: Element) => { await act(async () => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); }); await flush(); };
const notice = () => container.querySelector(".users-notice")?.textContent ?? "";

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  for (const fn of [...Object.values(api), confirm.ask]) fn.mockReset();
  api.listUsers.mockResolvedValue({ users: [admin, listed("u2", "guard", "operator", { hasPin: true })], minPasswordLength: 12 });
});
afterEach(async () => { await act(async () => { root?.unmount(); }); root = null; container?.remove(); });

describe("the users screen, by who is looking at it", () => {
  it("shows an operator only their own account and never asks the server for the list of users", async () => {
    await show({ user: { id: "u2", username: "guard", role: "operator" } });
    expect(container.textContent).toContain(t("usersAdminOnly"));
    expect(api.listUsers).not.toHaveBeenCalled();
    expect(container.querySelector(".users-list")).toBeNull();
    expect(container.textContent).toContain("guard");
  });

  it("does the same for a viewer and for the wall panel", async () => {
    for (const role of ["viewer", "panel"] as const) {
      await show({ user: { id: "u3", username: "x", role } });
      expect(container.textContent, role).toContain(t("usersAdminOnly"));
      await act(async () => { root?.unmount(); }); root = null; container.remove();
    }
    expect(api.listUsers).not.toHaveBeenCalled();
  });

  it("when the server could not say who is signed in it says so, with the reason, instead of claiming 'only an administrator'", async () => {
    const refresh = vi.fn();
    await show({ user: null, known: false, reason: "the server answered 503", refresh });
    expect(container.textContent).toContain(t("usersSessionUnknown"));
    expect(container.textContent).toContain("the server answered 503");
    expect(container.textContent).not.toContain(t("usersAdminOnly"));
    expect(api.listUsers).not.toHaveBeenCalled();
  });

  it("lists the users to an administrator, marks who is who, and offers the four roles", async () => {
    await show({ user: admin });
    expect(api.listUsers).toHaveBeenCalledWith("http://s");
    const rows = [...container.querySelectorAll(".users-list li")];
    expect(rows.map(row => row.querySelector("strong")?.textContent)).toEqual(["boss", "guard"]);
    expect(rows[0]!.classList.contains("current")).toBe(true);
    expect(rows[1]!.querySelector(".role-badge")?.classList.contains("operator")).toBe(true);
    const options = [...field(t("role"), container.querySelector(".users-card:last-of-type")!).querySelectorAll("option")].map(option => option.value);
    expect(options).toEqual(["admin", "operator", "viewer", "panel"]);
  });
});

describe("creating and editing users", () => {
  it("creating needs a name and a password, trims the name, defaults to operator and says so when done", async () => {
    await show({ user: admin });
    const add = container.querySelector(".users-card:last-of-type")!;
    expect(button(t("createUser"), add).disabled).toBe(true);
    await type(field(t("userName"), add), "   ");
    await type(field(t("newPassword"), add), "a-long-password-1");
    expect(button(t("createUser"), add).disabled).toBe(true);
    await type(field(t("userName"), add), "  night-guard  ");
    expect(button(t("createUser"), add).disabled).toBe(false);
    api.createUser.mockResolvedValue({ id: "u9", username: "night-guard", role: "operator" });
    await submit(add.querySelector("form")!);
    expect(api.createUser).toHaveBeenCalledWith("http://s", { username: "night-guard", password: "a-long-password-1", role: "operator" });
    expect(notice()).toBe(t("userCreated"));
    expect(api.listUsers).toHaveBeenCalledTimes(2);
    expect(field(t("userName"), add).value).toBe("");
  });

  it("a refusal is explained in words of the screen, and a code it does not know is the general sentence", async () => {
    await show({ user: admin });
    const add = container.querySelector(".users-card:last-of-type")!;
    await type(field(t("userName"), add), "bob");
    await type(field(t("newPassword"), add), "x");
    api.createUser.mockRejectedValueOnce(new ApiError(422, "weak_password")).mockRejectedValueOnce(new ApiError(409, "username_taken")).mockRejectedValueOnce(new ApiError(500, "brand_new_code")).mockRejectedValueOnce(new Error("network"));
    const sentences: string[] = [];
    for (let index = 0; index < 4; index += 1) { await submit(add.querySelector("form")!); sentences.push(notice()); }
    expect(sentences).toEqual([t("userErr_weak_password"), t("userErr_username_taken"), t("userErr_generic"), t("userErr_generic")]);
    expect(container.querySelector(".users-notice")?.classList.contains("bad")).toBe(true);
    expect(field(t("userName"), add).value).toBe("bob");   // nothing typed is lost on a refusal
  });

  it("editing sends only what changed: nothing at all when nothing did", async () => {
    await show({ user: admin });
    const guard = container.querySelectorAll(".users-list li")[1]!;
    await click(button(t("editUser"), guard));
    const editor = container.querySelector(".users-edit")!;
    await click(button(t("saveUser"), editor));
    expect(api.updateUser).not.toHaveBeenCalled();
    expect(api.setUserPin).not.toHaveBeenCalled();
    expect(container.querySelector(".users-edit")).toBeNull();

    await click(button(t("editUser"), container.querySelectorAll(".users-list li")[1]!));
    const again = container.querySelector(".users-edit")!;
    await act(async () => {
      const select = field(t("role"), again) as unknown as HTMLSelectElement;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(select, "viewer");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    api.updateUser.mockResolvedValue({});
    await click(button(t("saveUser"), again));
    expect(api.updateUser).toHaveBeenCalledWith("http://s", "u2", { role: "viewer" });
    expect(api.setUserPin).not.toHaveBeenCalled();
    expect(notice()).toBe(t("userUpdated"));
  });

  it("a PIN typed while editing is sent with its duress PIN, digits only, and the duress one is left out when empty", async () => {
    await show({ user: admin });
    await click(button(t("editUser"), container.querySelectorAll(".users-list li")[1]!));
    const editor = container.querySelector(".users-edit")!;
    await type(field(t("pinValue"), editor), "24a68b");
    expect(field(t("pinValue"), editor).value).toBe("2468");
    api.setUserPin.mockResolvedValue({});
    await click(button(t("saveUser"), editor));
    expect(api.setUserPin).toHaveBeenCalledWith("http://s", "u2", "2468", undefined);
    await click(button(t("editUser"), container.querySelectorAll(".users-list li")[1]!));
    const second = container.querySelector(".users-edit")!;
    await type(field(t("pinValue"), second), "1357");
    await type(field(t("duressValue"), second), "9753");
    await click(button(t("saveUser"), second));
    expect(api.setUserPin).toHaveBeenLastCalledWith("http://s", "u2", "1357", "9753");
  });

  it("deleting asks first, and does nothing when the answer is no", async () => {
    await show({ user: admin });
    const deleteButton = () => [...container.querySelectorAll(".users-list li")[1]!.querySelectorAll("button")].find(item => item.className.includes("danger") || item.textContent === t("deleteUser"))!;
    confirm.ask.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    api.deleteUser.mockResolvedValue(undefined);
    await click(deleteButton());
    expect(confirm.ask).toHaveBeenCalledTimes(1);
    expect(confirm.ask.mock.calls[0]![0]).toContain("guard");
    expect(api.deleteUser).not.toHaveBeenCalled();
    await click(deleteButton());
    expect(api.deleteUser).toHaveBeenCalledWith("http://s", "u2");
    expect(notice()).toBe(t("userDeleted"));
  });

  it("clearing somebody's PIN is offered only for a user who has one", async () => {
    await show({ user: admin });
    const rows = container.querySelectorAll(".users-list li");
    const clearLabel = t("pinClear");
    expect([...rows[0]!.querySelectorAll("button")].some(item => item.textContent === clearLabel)).toBe(false);
    api.clearUserPin.mockResolvedValue({});
    await click([...rows[1]!.querySelectorAll("button")].find(item => item.textContent === clearLabel)!);
    expect(api.clearUserPin).toHaveBeenCalledWith("http://s", "u2");
  });
});

describe("your own account", () => {
  it("the passwords must match before anything is sent, and the current one is needed to save", async () => {
    await show({ user: { id: "u2", username: "guard", role: "operator" } });
    const form = container.querySelector(".users-form")!;
    expect(button(t("saveAccount")).disabled).toBe(true);
    await type(field(t("currentPassword"), form), "old-password-1");
    expect(button(t("saveAccount")).disabled).toBe(false);
    await type(field(t("newPassword"), form), "new-password-123");
    await type(field(t("confirmPassword"), form), "new-password-124");
    await submit(form);
    expect(api.changeAccount).not.toHaveBeenCalled();
    expect(notice()).toBe(t("passwordsDontMatch"));
  });

  it("sends the new name only when it changed and the new password only when typed, then empties the password fields", async () => {
    await show({ user: { id: "u2", username: "guard", role: "operator" } });
    const form = container.querySelector(".users-form")!;
    api.changeAccount.mockResolvedValue({});
    await type(field(t("currentPassword"), form), "old-password-1");
    await submit(form);
    expect(api.changeAccount).toHaveBeenLastCalledWith("http://s", { currentPassword: "old-password-1" });
    expect(field(t("currentPassword"), form).value).toBe("");
    await type(field(t("currentPassword"), form), "old-password-1");
    await type(field(t("userName"), form), "  guard-2 ");
    await type(field(t("newPassword"), form), "new-password-123");
    await type(field(t("confirmPassword"), form), "new-password-123");
    await submit(form);
    expect(api.changeAccount).toHaveBeenLastCalledWith("http://s", { currentPassword: "old-password-1", username: "guard-2", newPassword: "new-password-123" });
    expect(notice()).toBe(t("accountSaved"));
    expect([field(t("currentPassword"), form).value, field(t("newPassword"), form).value, field(t("confirmPassword"), form).value]).toEqual(["", "", ""]);
  });

  it("a wrong current password is explained and keeps what was typed", async () => {
    await show({ user: { id: "u2", username: "guard", role: "operator" } });
    const form = container.querySelector(".users-form")!;
    api.changeAccount.mockRejectedValue(new ApiError(403, "wrong_password"));
    await type(field(t("currentPassword"), form), "nope");
    await submit(form);
    expect(notice()).toBe(t("userErr_wrong_password"));
    expect(field(t("currentPassword"), form).value).toBe("nope");
  });

  it("the PIN needs the current password and at least four digits, takes digits only, and can be cleared", async () => {
    await show({ user: { id: "u2", username: "guard", role: "operator" } });
    const pinBox = container.querySelectorAll(".users-form")[1]!;
    const save = button(t("pinSave"));
    await type(field(t("currentPassword")), "old-password-1");
    await type(field(t("pinValue"), pinBox), "12");
    expect(save.disabled).toBe(true);
    await type(field(t("pinValue"), pinBox), "12x34");
    expect(field(t("pinValue"), pinBox).value).toBe("1234");
    expect(save.disabled).toBe(false);
    api.setMyPin.mockResolvedValue({});
    await click(save);
    expect(api.setMyPin).toHaveBeenLastCalledWith("http://s", { currentPassword: "old-password-1", pin: "1234" });
    expect(notice()).toBe(t("pinSaved"));
    expect(field(t("currentPassword")).value).toBe("");
    await type(field(t("currentPassword")), "old-password-1");
    await click(button(t("pinClear")));
    expect(api.setMyPin).toHaveBeenLastCalledWith("http://s", { currentPassword: "old-password-1", clear: true });
    expect(notice()).toBe(t("pinCleared"));
  });
});

describe("the words of the screen", () => {
  it("every error the users routes can give, and every label of the screen, exists in the eight languages", () => {
    const codes = ["invalid_username", "username_taken", "weak_password", "invalid_password", "invalid_role", "last_admin", "self_delete", "wrong_password", "too_many_users", "nothing_to_change", "forbidden", "invalid_pin", "same_pin", "generic"];
    const keys = [...codes.map(code => `userErr_${code}`), "usersAdminOnly", "usersSessionUnknown", "passwordsDontMatch", "userCreated", "userUpdated", "userDeleted", "accountSaved", "pinSaved", "pinCleared", "roleHelp_admin", "roleHelp_operator", "roleHelp_viewer", "roleHelp_panel"];
    for (const locale of locales) for (const key of keys) {
      const sentence = text(locale, key);
      expect(sentence.trim().length, `${locale} ${key}`).toBeGreaterThan(0);
      expect(sentence, `${locale} ${key} is not the key itself`).not.toBe(key);
    }
  });
});
