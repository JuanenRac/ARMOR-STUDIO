// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { hasUnsavedWork, useUnloadGuard } from "./unloadGuard";

function Probe({ active }: { active: boolean }) { useUnloadGuard(active); return null; }
const closeTab = () => { const event = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; };

describe("the warning on closing the tab", () => {
  it("counts a drawing that is saving or whose server does not answer, and ignores the rest", () => {
    expect(hasUnsavedWork(["idle", "saved", undefined])).toBe(false);
    expect(hasUnsavedWork(["saved", "saving"])).toBe(true);
    expect(hasUnsavedWork([undefined, "offline"])).toBe(true);
    expect(hasUnsavedWork([])).toBe(false);
  });

  it("asks the browser to confirm only while there is unsaved work, and stops asking afterwards", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement("div");
    const root = createRoot(host);
    await act(async () => { root.render(createElement(Probe, { active: false })); });
    expect(closeTab()).toBe(false);
    await act(async () => { root.render(createElement(Probe, { active: true })); });
    expect(closeTab()).toBe(true);
    await act(async () => { root.render(createElement(Probe, { active: false })); });
    expect(closeTab()).toBe(false);
    await act(async () => { root.unmount(); });
  });
});
