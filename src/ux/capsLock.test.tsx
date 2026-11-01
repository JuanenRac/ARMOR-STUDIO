// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { capsLockOn, PasswordInput } from "../components/PasswordInput";
import { locales, text } from "../i18n";

let root: Root | null = null;
let host: HTMLElement | null = null;

const draw = async (locale: (typeof locales)[number] = "en") => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root!.render(createElement(PasswordInput, { t: (key: string) => text(locale, key), value: "", onChange: () => undefined })); });
  return host;
};
const key = async (input: Element, type: "keydown" | "keyup", caps: boolean) => {
  await act(async () => {
    const event = new KeyboardEvent(type, { bubbles: true, key: "a", modifierCaps: caps } as KeyboardEventInit);
    Object.defineProperty(event, "getModifierState", { value: (name: string) => name === "CapsLock" && caps });
    input.dispatchEvent(event);
  });
};

describe("the Caps Lock warning of the password field", () => {
  beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
  afterEach(async () => { await act(async () => { root?.unmount(); }); host?.remove(); root = null; host = null; });

  it("shows the warning, announced and tied to the field, while Caps Lock is on, and takes it away when it is off", async () => {
    const view = await draw();
    const input = view.querySelector("input")!;
    expect(view.querySelector(".password-caps")).toBeNull();
    await key(input, "keydown", true);
    const note = view.querySelector(".password-caps")!;
    expect(note.textContent).toBe(text("en", "pw_caps"));
    expect(note.getAttribute("role")).toBe("status");
    expect(input.getAttribute("aria-describedby")).toContain(note.id);
    await key(input, "keyup", false);
    expect(view.querySelector(".password-caps")).toBeNull();
    expect(input.getAttribute("aria-describedby")).toBeNull();
  });

  it("goes away when the field loses the focus", async () => {
    const view = await draw();
    const input = view.querySelector("input")!;
    await key(input, "keydown", true);
    expect(view.querySelector(".password-caps")).not.toBeNull();
    await act(async () => { input.dispatchEvent(new FocusEvent("focusout", { bubbles: true })); });
    expect(view.querySelector(".password-caps")).toBeNull();
  });

  it("is told in every language, and a browser that cannot say counts as off", async () => {
    for (const locale of locales) {
      const view = await draw(locale);
      await key(view.querySelector("input")!, "keydown", true);
      expect(view.querySelector(".password-caps")!.textContent, locale).toBe(text(locale, "pw_caps"));
      await act(async () => { root?.unmount(); }); host?.remove(); root = null; host = null;
    }
    expect(capsLockOn({} as Pick<KeyboardEvent, "getModifierState">)).toBe(false);
  });
});
