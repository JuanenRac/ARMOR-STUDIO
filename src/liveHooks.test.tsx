// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  createCameraStreamUrl: vi.fn(), listCameraStatus: vi.fn(), listCameraViews: vi.fn(), listConfiguredCameras: vi.fn(), readInfo: vi.fn(), readStatus: vi.fn(), sessionUserState: vi.fn(),
}));
vi.mock("./api", () => api);

import { useNow, useServerStatus } from "./hooks";
import type { LiveSocket } from "./liveStatus";
import { ViewSlot } from "./viewSlots";

let root: Root | null = null;
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const flush = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(0); }); };

/** Renders a hook and keeps its latest value. */
function mount<T>(hook: () => T): { current: () => T; unmount: () => Promise<void> } {
  let value!: T;
  const Probe = () => { value = hook(); return null; };
  root = createRoot(document.createElement("div"));
  act(() => { root!.render(createElement(Probe)); });
  return { current: () => value, unmount: async () => { await act(async () => { root?.unmount(); }); root = null; } };
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  for (const fn of Object.values(api)) fn.mockReset();
  FakeSocket.all = [];
});
afterEach(async () => { await act(async () => { root?.unmount(); }); root = null; vi.useRealTimers(); });

const state = (revision: number) => ({ mode: "armed", revision, updated_at: "t", nodes: {} });

/** A stand-in for the socket of the browser: the test opens it, sends to it and cuts it. */
class FakeSocket implements LiveSocket {
  static all: FakeSocket[] = [];
  onopen: (() => void) | null = null; onmessage: ((event: { data: unknown }) => void) | null = null; onclose: (() => void) | null = null; onerror: (() => void) | null = null;
  closed = false;
  constructor(readonly url: string) { FakeSocket.all.push(this); }
  close() { this.closed = true; }
  open() { act(() => { this.onopen?.(); }); }
  say(data: unknown) { act(() => { this.onmessage?.({ data: typeof data === "string" ? data : JSON.stringify(data) }); }); }
  cut() { act(() => { this.onclose?.(); }); }
}
const live = { live: true, socket: (url: string) => new FakeSocket(url) };

describe("the live channel of the status", () => {
  it("is not opened unless it is asked for", async () => {
    api.readStatus.mockResolvedValue(state(1));
    const hook = mount(() => useServerStatus("http://s", { socket: url => new FakeSocket(url) }));
    await flush();
    expect(FakeSocket.all).toHaveLength(0);
    expect(hook.current().live).toBe(false);
    await hook.unmount();
  });

  it("opens the channel of the server, and a state that arrives replaces the state without asking for it", async () => {
    api.readStatus.mockResolvedValue(state(1));
    const hook = mount(() => useServerStatus("http://s:18080", live));
    await flush();
    expect(FakeSocket.all).toHaveLength(1);
    expect(FakeSocket.all[0].url).toBe("ws://s:18080/api/v1/events");
    FakeSocket.all[0].open();
    expect(hook.current().live).toBe(true);
    const asked = api.readStatus.mock.calls.length;
    FakeSocket.all[0].say({ type: "state", state: state(5) });
    expect(hook.current().state.revision).toBe(5);
    expect(hook.current().connection).toBe("synced");
    expect(api.readStatus.mock.calls.length).toBe(asked);
    await hook.unmount();
  });

  it("ignores a message that is not a state", async () => {
    api.readStatus.mockResolvedValue(state(1));
    const hook = mount(() => useServerStatus("http://s", live));
    await flush();
    FakeSocket.all[0].open();
    FakeSocket.all[0].say("garbage");
    FakeSocket.all[0].say({ type: "other" });
    expect(hook.current().state.revision).toBe(1);
    await hook.unmount();
  });

  it("asks only every twenty seconds while the channel is open, and every three again when it is cut", async () => {
    api.readStatus.mockResolvedValue(state(1));
    const hook = mount(() => useServerStatus("http://s", live));
    await flush();
    FakeSocket.all[0].open();
    const base = api.readStatus.mock.calls.length;
    await advance(15_000);
    expect(api.readStatus.mock.calls.length).toBe(base);
    await advance(6_000);
    expect(api.readStatus.mock.calls.length).toBe(base + 1);
    FakeSocket.all[0].cut();
    expect(hook.current().live).toBe(false);
    const cutAt = api.readStatus.mock.calls.length;
    await advance(3_100);
    expect(api.readStatus.mock.calls.length).toBeGreaterThan(cutAt);
    await hook.unmount();
  });

  it("tries again after the wait, with a longer wait each time, and starts over once it is open", async () => {
    api.readStatus.mockResolvedValue(state(1));
    const hook = mount(() => useServerStatus("http://s", live));
    await flush();
    FakeSocket.all[0].cut();
    await advance(1_900); expect(FakeSocket.all).toHaveLength(1);
    await advance(200); expect(FakeSocket.all).toHaveLength(2);
    FakeSocket.all[1].cut();
    await advance(3_900); expect(FakeSocket.all).toHaveLength(2);
    await advance(200); expect(FakeSocket.all).toHaveLength(3);
    FakeSocket.all[2].open();
    FakeSocket.all[2].cut();
    await advance(2_100); expect(FakeSocket.all).toHaveLength(4);
    await hook.unmount();
  });

  it("closes the channel and stops trying when it is unmounted", async () => {
    api.readStatus.mockResolvedValue(state(1));
    const hook = mount(() => useServerStatus("http://s", live));
    await flush();
    const first = FakeSocket.all[0];
    first.open();
    await hook.unmount();
    expect(first.closed).toBe(true);
    await advance(120_000);
    expect(FakeSocket.all).toHaveLength(1);
  });
});

describe("the time of a menu", () => {
  it("ticks once a second while the menu is shown", async () => {
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    const hook = mount(() => useNow());
    const first = hook.current();
    await advance(3000);
    expect(hook.current() - first).toBeGreaterThanOrEqual(3000);
    await hook.unmount();
  });

  it("does not tick in a menu that is open but hidden", async () => {
    vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    let value = 0;
    const Probe = () => { value = useNow(); return null; };
    root = createRoot(document.createElement("div"));
    act(() => { root!.render(createElement(ViewSlot, { active: false, children: createElement(Probe) })); });
    const first = value;
    await advance(5000);
    expect(value).toBe(first);
    act(() => { root!.render(createElement(ViewSlot, { active: true, children: createElement(Probe) })); });
    await advance(2000);
    expect(value - first).toBeGreaterThanOrEqual(5000);
  });
});
