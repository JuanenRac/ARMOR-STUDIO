// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { askTotp, TotpHost } from "./askTotp";

const t = (key: string) => key;
let root: Root | null = null;
let host: HTMLElement | null = null;

describe("the question for the code of the authenticator", () => {
  beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
  afterEach(async () => {
    await act(async () => { root?.unmount(); });
    host?.remove(); root = null; host = null;
  });

  it("answers null while no host is mounted", async () => {
    expect(await askTotp(t)).toBeNull();
  });

  it("only confirms six digits, hands them on, and answers null on cancel", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => { root!.render(createElement(TotpHost)); });
    let answer: Promise<string | null> | undefined;
    await act(async () => { answer = askTotp(t); });
    expect(host.textContent).toContain("totp_ask_title");
    const input = host.querySelector<HTMLInputElement>("[data-testid='totp-code']")!;
    const confirm = Array.from(host.querySelectorAll("button")).find(button => button.textContent === "totp_ask_confirm")!;
    expect(confirm.disabled).toBe(true);
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    await act(async () => { set.call(input, "12a345"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    expect(input.value).toBe("12345");
    expect(confirm.disabled).toBe(true);
    await act(async () => { set.call(input, "123456"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    expect(confirm.disabled).toBe(false);
    await act(async () => { confirm.click(); });
    expect(await answer).toBe("123456");
    expect(host.querySelector("button")).toBeNull();

    await act(async () => { answer = askTotp(t, true); });
    expect(host.textContent).toContain("adm_err_totp_invalid");
    const cancel = Array.from(host.querySelectorAll("button")).find(button => button.textContent === "cancelAction")!;
    await act(async () => { cancel.click(); });
    expect(await answer).toBeNull();
  });
});
