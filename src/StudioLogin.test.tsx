// @vitest-environment jsdom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { REMEMBER_USER_KEY, rememberedUser, storeRememberedUser, StudioLogin } from "./StudioLogin";
import { locales, text } from "./i18n";

const memory = new Map<string, string>();
beforeEach(() => {
  memory.clear();
  Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k) } });
});

describe("the sign-in form", () => {
  it("is a real form with the attributes a password manager looks for", () => {
    const html = renderToStaticMarkup(createElement(StudioLogin, { origin: "http://x", onAuthenticated: () => undefined }));
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain('name="username"');
    expect(html).toContain('name="password"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('data-testid="login-pm-note"');
  });

  it("remembers only the user name, and forgets it when the box is unticked", () => {
    storeRememberedUser(true, "ana");
    expect(rememberedUser()).toBe("ana");
    expect(memory.get(REMEMBER_USER_KEY)).not.toMatch(/pass/i);
    storeRememberedUser(false, "ana");
    expect(rememberedUser()).toBe("");
    expect(memory.has(REMEMBER_USER_KEY)).toBe(false);
  });

  it("works without storage", () => {
    Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("blocked"); } });
    expect(rememberedUser()).toBe("");
    expect(() => storeRememberedUser(true, "ana")).not.toThrow();
  });

  it("has the new phrases in all eight languages", () => {
    for (const locale of locales) for (const key of ["login_remember", "login_pm_note"]) expect(text(locale, key).length, `${locale} ${key}`).toBeGreaterThan(4);
  });
});
