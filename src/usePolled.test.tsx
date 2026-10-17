// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePolled } from "./hooks";
import { ViewSlot } from "./viewSlots";

let root: Root | null = null;

function Poller({ load, always = false }: { load: () => Promise<number>; always?: boolean }) {
  usePolled(load, 1000, "k", { always });
  return null;
}
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const show = async (active: boolean, load: () => Promise<number>, always = false) => {
  await act(async () => { root!.render(createElement(ViewSlot, { active, children: createElement(Poller, { load, always }) })); });
};
const tab = async (state: "visible" | "hidden") => {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
};

describe("what is read from the server again and again", () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    root = createRoot(document.createElement("div"));
  });
  afterEach(async () => { await act(async () => { root?.unmount(); }); root = null; await tab("visible"); vi.useRealTimers(); });

  it("is not asked while its menu is hidden, and is asked at once when the menu is shown", async () => {
    const load = vi.fn(async () => 1);
    await show(false, load);
    await advance(5000);
    expect(load).not.toHaveBeenCalled();
    await show(true, load);
    expect(load).toHaveBeenCalledTimes(1);
    await advance(3000);
    expect(load).toHaveBeenCalledTimes(4);
    await show(false, load);
    await advance(5000);
    expect(load).toHaveBeenCalledTimes(4);
  });

  it("is not asked from a tab in the background, unless the whole console needs it (the alarms)", async () => {
    const quiet = vi.fn(async () => 1), needed = vi.fn(async () => 2);
    await act(async () => { root!.render(createElement(ViewSlot, { active: true, children: [createElement(Poller, { key: "a", load: quiet }), createElement(Poller, { key: "b", load: needed, always: true })] })); });
    await tab("hidden");
    await advance(4000);
    expect(quiet).toHaveBeenCalledTimes(1);           // only the read it made on opening
    expect(needed.mock.calls.length).toBeGreaterThanOrEqual(4);
    await tab("visible");
    await advance(10);
    expect(quiet).toHaveBeenCalledTimes(2);           // and one at once when the tab comes back
  });
});
