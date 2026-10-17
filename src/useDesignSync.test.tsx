// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writeLocalCopy } from "./designLocal";
import { loadLocalDesign, useDesignSync, type DesignAdapter, type RemoteDesign, type SyncStatus } from "./useDesignSync";

type Drawing = { text: string };

/** A server with one drawing, and the calls it received. */
function fakeServer(initial: RemoteDesign) {
  const state = { remote: initial, reads: 0, saves: [] as Array<{ revision: number; doc: Record<string, unknown> }>, readDelay: 0 };
  const adapter: DesignAdapter<Drawing> = {
    kind: "test", legacyKey: "test-legacy",
    read: async () => { state.reads += 1; if (state.readDelay) await new Promise(resolve => setTimeout(resolve, state.readDelay)); return { ...state.remote }; },
    save: async (_origin, revision, doc) => {
      state.saves.push({ revision, doc });
      if (revision !== state.remote.revision) return { conflict: { ...state.remote } };
      state.remote = { revision: revision + 1, doc };
      return { revision: state.remote.revision };
    },
    build: design => ({ text: design.text }),
    parse: (doc, current) => (doc && typeof (doc as { text?: unknown }).text === "string" ? { text: (doc as { text: string }).text } : current),
    key: design => design.text,
  };
  return { state, adapter };
}

type Handle = { design: Drawing; setDesign: (next: Drawing) => void; status: SyncStatus; conflicts: number; render: (enabled: boolean) => Promise<void> };

let root: Root | null = null;
let container: HTMLElement | null = null;

async function mount(adapter: DesignAdapter<Drawing>, origin: string, enabled: boolean): Promise<Handle> {
  const handle = { design: { text: "mine" }, conflicts: 0 } as Handle;
  function Harness({ on }: { on: boolean }) {
    // like the console: what this browser kept for the server is the drawing on screen before the server answers
    const [design, setDesign] = useState<Drawing>(() => loadLocalDesign(adapter, origin, { text: "mine" }) ?? { text: "mine" });
    handle.design = design; handle.setDesign = setDesign;
    handle.status = useDesignSync(adapter, { origin, enabled: on, persist: true, design, apply: setDesign, onConflict: () => { handle.conflicts += 1; } });
    return null;
  }
  container = document.createElement("div");
  root = createRoot(container);
  handle.render = async (on: boolean) => { await act(async () => { root!.render(createElement(Harness, { on })); }); };
  await handle.render(enabled);
  return handle;
}

const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };

describe("keeping a drawing on the server", () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(async () => {
    await act(async () => { root?.unmount(); });
    root = null; container = null;
    vi.useRealTimers();
  });

  it("takes the server's drawing when it starts, and sends an edit a moment after it is made", async () => {
    const { state, adapter } = fakeServer({ revision: 1, doc: { text: "server" } });
    const handle = await mount(adapter, "http://a", true);
    await advance(10);
    expect(handle.design.text).toBe("server");
    await act(async () => { handle.setDesign({ text: "edited" }); });
    await advance(1600);
    expect(state.saves).toEqual([{ revision: 1, doc: { text: "edited" } }]);
    expect(handle.status).toBe("saved");
  });

  it("does not read the server again over an edit when the session check flickers", async () => {
    const { state, adapter } = fakeServer({ revision: 1, doc: { text: "server" } });
    const handle = await mount(adapter, "http://a", true);
    await advance(10);
    await act(async () => { handle.setDesign({ text: "edited offline" }); });
    await handle.render(false);   // the minute-long check failed: the console is "locked" for a moment
    await handle.render(true);    // and it answers again
    await advance(10);
    expect(state.reads).toBe(1);
    expect(handle.design.text).toBe("edited offline");
    await advance(1600);
    expect(state.saves).toEqual([{ revision: 1, doc: { text: "edited offline" } }]);
  });

  it("waits for a read in progress instead of dropping the save", async () => {
    const { state, adapter } = fakeServer({ revision: 1, doc: { text: "server" } });
    const handle = await mount(adapter, "http://a", true);
    await advance(10);
    state.readDelay = 3000;
    await advance(6090);                                  // the poll of 6 s has started and is reading (it takes 3 s)
    await act(async () => { handle.setDesign({ text: "edited" }); });
    await advance(1700);                                  // the save is due (1.5 s) while the read is still going
    expect(state.saves).toEqual([]);
    expect(handle.status).toBe("saving");
    await advance(3000);                                  // the read ended; the save goes out
    expect(state.saves).toEqual([{ revision: 1, doc: { text: "edited" } }]);
    expect(handle.status).toBe("saved");
  });

  it("puts back the changes that never arrived when the server still has the copy they were made on", async () => {
    const { state, adapter } = fakeServer({ revision: 3, doc: { text: "server" } });
    writeLocalCopy("test", "http://a", { baseRevision: 3, dirty: true, doc: { text: "typed before the page closed" } });
    const handle = await mount(adapter, "http://a", true);
    await advance(10);
    expect(handle.design.text).toBe("typed before the page closed");
    await advance(1600);
    expect(state.saves).toEqual([{ revision: 3, doc: { text: "typed before the page closed" } }]);
    expect(handle.conflicts).toBe(0);
  });

  it("takes the server's drawing, and says so, when somebody saved while the changes waited", async () => {
    const { state, adapter } = fakeServer({ revision: 5, doc: { text: "theirs" } });
    writeLocalCopy("test", "http://a", { baseRevision: 3, dirty: true, doc: { text: "mine, from an old copy" } });
    const handle = await mount(adapter, "http://a", true);
    await advance(1700);
    expect(handle.design.text).toBe("theirs");
    expect(handle.conflicts).toBe(1);
    expect(state.saves).toEqual([]);
  });

  it("never offers the copy of another server", async () => {
    const { state, adapter } = fakeServer({ revision: 3, doc: { text: "server" } });
    writeLocalCopy("test", "http://other", { baseRevision: 3, dirty: true, doc: { text: "the other house" } });
    const handle = await mount(adapter, "http://a", true);
    await advance(1700);
    expect(handle.design.text).toBe("server");
    expect(state.saves).toEqual([]);
  });

  it("asks again when the server did not answer the first time", async () => {
    const { state, adapter } = fakeServer({ revision: 1, doc: { text: "server" } });
    const real = adapter.read;
    let failures = 1;
    adapter.read = async origin => { if (failures-- > 0) throw new Error("down"); return real(origin); };
    const handle = await mount(adapter, "http://a", true);
    await advance(10);
    expect(handle.status).toBe("offline");
    await advance(5100);
    expect(handle.design.text).toBe("server");
    expect(state.reads).toBe(1);
  });
});
