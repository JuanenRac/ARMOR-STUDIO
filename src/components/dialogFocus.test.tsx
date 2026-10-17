// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./chrome";

let root: Root | null = null;
let host: HTMLElement | null = null;

const press = (key: string, shiftKey = false) => {
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true }));
};

describe("a dialog and the keyboard", () => {
  beforeEach(() => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
  afterEach(async () => { await act(async () => { root?.unmount(); }); host?.remove(); root = null; host = null; });

  it("keeps Tab inside, and gives the focus back to the control that opened it", async () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    root = createRoot(host);
    const cancel = vi.fn();
    await act(async () => { root!.render(createElement(ConfirmDialog, { title: "Sure?", text: "Really?", confirmLabel: "Yes", confirm: vi.fn(), cancel, t: key => key })); });
    const buttons = Array.from(host.querySelectorAll("button"));
    expect(buttons.length).toBe(2);
    expect(document.activeElement).toBe(buttons[1]);          // the confirm button asked for the focus
    await act(async () => { press("Tab"); });
    expect(document.activeElement).toBe(buttons[0]);          // from the last control, back to the first
    await act(async () => { press("Tab", true); });
    expect(document.activeElement).toBe(buttons[1]);          // and Shift+Tab goes the other way round
    await act(async () => { press("Escape"); });
    expect(cancel).toHaveBeenCalledTimes(1);
    await act(async () => { root!.unmount(); });
    root = null;
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
