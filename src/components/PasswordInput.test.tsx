// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PasswordInput } from "./PasswordInput";
import { locales, text } from "../i18n";

let root: Root | null = null;
let host: HTMLElement | null = null;

const draw = async (props: Record<string, unknown>, locale: (typeof locales)[number] = "en") => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  const t = (key: string) => text(locale, key);
  await act(async () => { root!.render(createElement(PasswordInput, { t, ...props })); });
  return host;
};

describe("the password field with an eye", () => {
  beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
  afterEach(async () => { await act(async () => { root?.unmount(); }); host?.remove(); root = null; host = null; });

  it("starts hidden and the eye shows and hides what was typed", async () => {
    const view = await draw({ value: "secret", onChange: () => undefined });
    const input = view.querySelector("input")!;
    const eye = view.querySelector("button")!;
    expect(input.type).toBe("password");
    expect(eye.getAttribute("aria-pressed")).toBe("false");
    await act(async () => { eye.click(); });
    expect(input.type).toBe("text");
    expect(eye.getAttribute("aria-pressed")).toBe("true");
    await act(async () => { eye.click(); });
    expect(input.type).toBe("password");
  });

  it("keeps the attributes of the input and does not submit a form when the eye is pressed", async () => {
    const view = await draw({ value: "", onChange: () => undefined, maxLength: 10, inputMode: "numeric", autoComplete: "off", placeholder: "PIN" });
    const input = view.querySelector("input")!;
    expect(input.maxLength).toBe(10);
    expect(input.getAttribute("inputmode")).toBe("numeric");
    expect(input.placeholder).toBe("PIN");
    expect(view.querySelector("button")!.type).toBe("button");
  });

  it("names the button in the language of the console, in all eight", async () => {
    for (const locale of locales) {
      const view = await draw({ value: "", onChange: () => undefined }, locale);
      const eye = view.querySelector("button")!;
      expect(eye.getAttribute("aria-label")).toBeTruthy();
      expect(eye.getAttribute("aria-label")).not.toBe("pw_show");
      await act(async () => { root?.unmount(); });
      view.remove();
      root = null;
      host = null;
    }
  });

  it("is a plain text field without the eye when the content is not a secret", async () => {
    const view = await draw({ value: "name", onChange: () => undefined, secret: false });
    expect(view.querySelector("input")!.type).toBe("text");
    expect(view.querySelector("button")).toBeNull();
  });
});
