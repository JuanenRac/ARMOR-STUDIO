// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askConfirm, ConfirmHost } from "./askConfirm";

const t = (key: string) => ({ askConfirmTitle: "Sure?", askConfirmYes: "Yes, go" } as Record<string, string>)[key] ?? key;
let root: Root | null = null;
let host: HTMLElement | null = null;

describe("a question asked in the page", () => {
  beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
  afterEach(async () => {
    await act(async () => { root?.unmount(); });
    host?.remove(); root = null; host = null;
    vi.unstubAllGlobals();
  });

  it("falls back to the question of the browser while no host is mounted, and to no when there is none", async () => {
    const confirm = vi.fn(() => true);
    vi.stubGlobal("confirm", confirm);
    expect(await askConfirm("Delete?", t)).toBe(true);
    expect(confirm).toHaveBeenCalledWith("Delete?");
    vi.stubGlobal("confirm", undefined);
    expect(await askConfirm("Delete?", t)).toBe(false);
  });

  it("draws the dialog, answers yes on the confirm button and no on Escape, and goes back to the fallback when the host goes away", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => { root!.render(createElement(ConfirmHost)); });
    expect(host.querySelector("button")).toBeNull();

    let answer: Promise<boolean> | undefined;
    await act(async () => { answer = askConfirm("Really remove the camera?", t); });
    expect(host.textContent).toContain("Really remove the camera?");
    expect(host.textContent).toContain("Sure?");
    const confirm = Array.from(host.querySelectorAll("button")).find(button => button.textContent === "Yes, go")!;
    await act(async () => { confirm.click(); });
    expect(await answer).toBe(true);
    expect(host.querySelector("button")).toBeNull();

    await act(async () => { answer = askConfirm("Another?", t); });
    await act(async () => { (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })); });
    expect(await answer).toBe(false);
    expect(host.querySelector("button")).toBeNull();

    await act(async () => { root!.unmount(); });
    root = null;
    const browser = vi.fn(() => true);
    vi.stubGlobal("confirm", browser);
    expect(await askConfirm("After unmount", t)).toBe(true);
    expect(browser).toHaveBeenCalledTimes(1);
  });
});
