// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  createCameraStreamUrl: vi.fn(), listCameraStatus: vi.fn(), listCameraViews: vi.fn(), listConfiguredCameras: vi.fn(), readInfo: vi.fn(), readStatus: vi.fn(), sessionUserState: vi.fn(),
}));
vi.mock("./api", () => api);

import { useCameraReachability, useServerCameras, useServerInfo, useServerStatus, useSessionUser, useStreamUrls } from "./hooks";
import type { Camera } from "./domain";

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
});
afterEach(async () => { await act(async () => { root?.unmount(); }); root = null; vi.useRealTimers(); });

const state = (revision: number) => ({ mode: "armed", revision, updated_at: "t", nodes: {} });

describe("the status of the server", () => {
  it("starts as demo data, becomes synced with the first answer, and keeps the last state through one or two lost answers", async () => {
    api.readStatus.mockResolvedValueOnce(state(1)).mockRejectedValueOnce(new Error("x")).mockRejectedValueOnce(new Error("x")).mockResolvedValue(state(2));
    const hook = mount(() => useServerStatus("http://s"));
    expect(hook.current().connection).toBe("demo");
    await flush();
    expect(hook.current().connection).toBe("synced");
    expect(hook.current().state.revision).toBe(1);
    expect(hook.current().latencyMs).not.toBeNull();
    await advance(3000);
    await advance(3000);
    expect(hook.current().connection).toBe("synced");         // two lost answers in a row are not a lost server
    expect(hook.current().state.revision).toBe(1);
    await advance(3000);
    expect(hook.current().state.revision).toBe(2);
    await hook.unmount();
  });

  it("says demo only after three lost answers in a row, and comes back at the first good one", async () => {
    api.readStatus.mockResolvedValueOnce(state(1)).mockRejectedValue(new Error("down"));
    const hook = mount(() => useServerStatus("http://s"));
    await flush();
    await advance(3000); await advance(3000);
    expect(hook.current().connection).toBe("synced");
    await advance(3000);
    expect(hook.current().connection).toBe("demo");
    expect(hook.current().latencyMs).toBeNull();
    api.readStatus.mockResolvedValue(state(9));
    await advance(3000);
    expect(hook.current().connection).toBe("synced");
    expect(hook.current().state.revision).toBe(9);
    await hook.unmount();
  });

  it("does not ask again while the last question has not been answered, and stops asking when it is unmounted", async () => {
    let release!: () => void;
    api.readStatus.mockImplementation(() => new Promise(resolve => { release = () => resolve(state(1)); }));
    const hook = mount(() => useServerStatus("http://s"));
    await advance(9000);
    expect(api.readStatus).toHaveBeenCalledTimes(1);
    release();
    await flush();
    await advance(3000);
    expect(api.readStatus).toHaveBeenCalledTimes(2);
    await hook.unmount();
    const calls = api.readStatus.mock.calls.length;
    await advance(10_000);
    expect(api.readStatus.mock.calls.length).toBe(calls);
  });

  it("an answer that arrives after the console went away changes nothing", async () => {
    let release!: () => void;
    api.readStatus.mockImplementation(() => new Promise(resolve => { release = () => resolve(state(5)); }));
    const hook = mount(() => useServerStatus("http://s"));
    await hook.unmount();
    expect(() => release()).not.toThrow();
    await flush();
  });

  it("apply puts a state the console already knows (the answer to arming) in place without waiting for the next read", async () => {
    api.readStatus.mockResolvedValue(state(1));
    const hook = mount(() => useServerStatus("http://s"));
    await flush();
    act(() => hook.current().apply(state(7) as never));
    expect(hook.current().state.revision).toBe(7);
    await hook.unmount();
  });
});

describe("who is signed in", () => {
  const ana = { id: "u1", username: "ana", role: "admin" };

  it("a failed or slow answer never takes the role away; only the server saying nobody does", async () => {
    api.sessionUserState.mockResolvedValueOnce({ state: "user", user: ana }).mockResolvedValueOnce({ state: "unknown", reason: "the server answered 503" }).mockResolvedValue({ state: "unknown", reason: "no answer" });
    const hook = mount(() => useSessionUser("http://s"));
    expect(hook.current().known).toBe(false);
    await flush();
    expect(hook.current()).toMatchObject({ user: ana, known: true, reason: "" });
    await advance(60_000);
    expect(hook.current()).toMatchObject({ user: ana, known: true, reason: "the server answered 503" });
    await advance(4_000);
    expect(hook.current().user).toEqual(ana);
    api.sessionUserState.mockResolvedValue({ state: "anonymous" });
    await advance(4_000);
    expect(hook.current()).toMatchObject({ user: null, known: true, reason: "" });
    await hook.unmount();
  });

  it("asks again a few seconds after an answer it could not have, not at once and not never", async () => {
    api.sessionUserState.mockResolvedValue({ state: "unknown", reason: "x" });
    const hook = mount(() => useSessionUser("http://s"));
    await flush();
    expect(api.sessionUserState).toHaveBeenCalledTimes(1);
    expect(hook.current().known).toBe(false);
    await advance(3_900);
    expect(api.sessionUserState).toHaveBeenCalledTimes(1);
    await advance(200);
    expect(api.sessionUserState).toHaveBeenCalledTimes(2);
    await hook.unmount();
    const calls = api.sessionUserState.mock.calls.length;
    await advance(120_000);
    expect(api.sessionUserState.mock.calls.length).toBe(calls);
  });

  it("asks again when the window comes back into view, and refresh asks right now", async () => {
    api.sessionUserState.mockResolvedValue({ state: "user", user: ana });
    const hook = mount(() => useSessionUser("http://s"));
    await flush();
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(api.sessionUserState).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(api.sessionUserState).toHaveBeenCalledTimes(2);
    act(() => hook.current().refresh());
    await flush();
    expect(api.sessionUserState).toHaveBeenCalledTimes(3);
    await hook.unmount();
  });
});

const camera = (id: string, over: Partial<Camera> = {}) => ({ id, name: id, enabled: true, liveVideoAvailable: true, x: 0, y: 0, ...over }) as Camera;

describe("the stream address of each live camera", () => {
  it("is asked once per live camera, not for a camera that is off or has no live video, and is not asked again when the list is read again", async () => {
    api.createCameraStreamUrl.mockImplementation(async (_origin: string, id: string) => `http://s/stream/${id}?t=1`);
    const cameras = [camera("b"), camera("a"), camera("off", { enabled: false }), camera("nolive", { liveVideoAvailable: false })];
    let list = cameras;
    let seen!: ReturnType<typeof useStreamUrls>;
    const Probe = () => { seen = useStreamUrls("http://s", list); return null; };
    root = createRoot(document.createElement("div"));
    await act(async () => { root!.render(createElement(Probe)); });
    await flush();
    expect(seen.urls).toEqual({ a: "http://s/stream/a?t=1", b: "http://s/stream/b?t=1" });
    expect(api.createCameraStreamUrl).toHaveBeenCalledTimes(2);
    list = [...cameras].reverse().map(item => ({ ...item }));   // the list is read again: same cameras, new objects, other order
    await act(async () => { root!.render(createElement(Probe)); });
    await flush();
    expect(api.createCameraStreamUrl).toHaveBeenCalledTimes(2);
    expect(seen.urls.a).toBe("http://s/stream/a?t=1");
  });

  it("a camera whose address cannot be had does not take the others with it, and a camera that stops being live loses its address", async () => {
    api.createCameraStreamUrl.mockImplementation(async (_origin: string, id: string) => { if (id === "bad") throw new Error("no ticket"); return `u-${id}`; });
    let list = [camera("a"), camera("bad"), camera("c")];
    const Probe = () => { const result = useStreamUrls("http://s", list); seen = result; return null; };
    let seen!: ReturnType<typeof useStreamUrls>;
    root = createRoot(document.createElement("div"));
    await act(async () => { root!.render(createElement(Probe)); });
    await flush();
    expect(seen.urls).toEqual({ a: "u-a", c: "u-c" });
    list = [camera("a"), camera("bad"), camera("c", { liveVideoAvailable: false })];
    await act(async () => { root!.render(createElement(Probe)); });
    await flush();
    expect(Object.keys(seen.urls)).toEqual(["a"]);
  });

  it("renew replaces the address of one camera and a failed renewal keeps the old one", async () => {
    api.createCameraStreamUrl.mockResolvedValueOnce("u-1").mockResolvedValueOnce("u-2").mockRejectedValueOnce(new Error("no"));
    const hook = mount(() => useStreamUrls("http://s", [camera("a")]));
    await flush();
    expect(hook.current().urls.a).toBe("u-1");
    await act(async () => { hook.current().renew("a"); });
    await flush();
    expect(hook.current().urls.a).toBe("u-2");
    await act(async () => { hook.current().renew("a"); });
    await flush();
    expect(hook.current().urls.a).toBe("u-2");
    await hook.unmount();
  });
});

describe("the cameras of the server", () => {
  it("shows the read-only list first and the operator list once the session allows it, retrying every minute", async () => {
    api.listCameraViews.mockResolvedValue([{ id: "a", name: "A", host: "h", snapshotUrl: "", rtspPath: "", onvifPort: 80, rtspPort: 554, hasCredentials: false, liveVideoAvailable: true }]);
    api.listConfiguredCameras.mockRejectedValueOnce(new Error("403")).mockResolvedValue([{ id: "a", name: "A", username: "u", hasCredentials: true }]);
    let cameras: Camera[] = [];
    const setCameras = vi.fn((update: Camera[] | ((current: Camera[]) => Camera[])) => { cameras = typeof update === "function" ? update(cameras) : update; });
    const hook = mount(() => useServerCameras("http://s", setCameras as never));
    await flush();
    expect(hook.current()).toBe(false);
    expect(cameras.map(item => item.id)).toEqual(["a"]);
    await advance(60_000);
    expect(hook.current()).toBe(true);
    expect(cameras[0]).toMatchObject({ id: "a", username: "u" });
    api.listConfiguredCameras.mockRejectedValue(new Error("session ended"));
    await advance(60_000);
    expect(hook.current()).toBe(false);
    await hook.unmount();
  });

  it("an unreachable server leaves the list alone", async () => {
    api.listCameraViews.mockRejectedValue(new Error("down"));
    api.listConfiguredCameras.mockRejectedValue(new Error("down"));
    const setCameras = vi.fn();
    const hook = mount(() => useServerCameras("http://s", setCameras));
    await flush();
    expect(setCameras).not.toHaveBeenCalled();
    expect(hook.current()).toBe(false);
    await hook.unmount();
  });

  it("the reachability of each camera is by id, and an unanswered question empties it", async () => {
    api.listCameraStatus.mockResolvedValueOnce([{ id: "a", status: "online" }, { id: "b", status: "offline" }]).mockRejectedValueOnce(new Error("x")).mockResolvedValue([{ id: "a", status: "unknown" }]);
    const hook = mount(() => useCameraReachability("http://s"));
    await flush();
    expect(hook.current()).toEqual({ a: "online", b: "offline" });
    await advance(10_000);
    expect(hook.current()).toEqual({});
    await advance(10_000);
    expect(hook.current()).toEqual({ a: "unknown" });
    await hook.unmount();
  });

  it("the information of the server is null while it cannot be read", async () => {
    api.readInfo.mockResolvedValueOnce({ service: "armor-server", version: "1.0.0", uptime_s: 5 }).mockRejectedValueOnce(new Error("x"));
    const hook = mount(() => useServerInfo("http://s"));
    await flush();
    expect(hook.current()).toMatchObject({ version: "1.0.0" });
    await advance(15_000);
    expect(hook.current()).toBeNull();
    await hook.unmount();
  });
});
