// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INITIAL_BUILDINGS, INITIAL_CAMERAS, INITIAL_DIMENSIONS, INITIAL_FEATURES, INITIAL_OPENINGS, INITIAL_ROOF_ITEMS, INITIAL_SENSORS, INITIAL_TERRAIN, INITIAL_WALL_LAMPS } from "./domain";
import { applySiteDoc, buildSiteDoc, type SiteDesign } from "./siteSync";

type Doc = { revision: number; updated_at: string | null; updated_by: string | null; site: Record<string, unknown> | null };
const api = vi.hoisted(() => ({ readSite: vi.fn(), saveSite: vi.fn() }));
vi.mock("./api", () => api);

import { useSiteSync, type SiteSyncStatus } from "./useSiteSync";

const base = (): SiteDesign => ({ dimensions: INITIAL_DIMENSIONS, terrain: INITIAL_TERRAIN, buildings: INITIAL_BUILDINGS, openings: INITIAL_OPENINGS, roofItems: INITIAL_ROOF_ITEMS, wallLamps: INITIAL_WALL_LAMPS, features: INITIAL_FEATURES, sensors: INITIAL_SENSORS, placements: [], cameras: INITIAL_CAMERAS });
const withPlacement = (name: string): SiteDesign => ({ ...base(), placements: [{ device_id: name, x: 1, y: 2, z: 0, rotation: 0 }] });
const doc = (revision: number, design: SiteDesign | null): Doc => ({ revision, updated_at: null, updated_by: null, site: design ? buildSiteDoc(design) : null });
const names = (design: SiteDesign) => design.placements.map(item => item.device_id);

let root: Root | null = null;
type Handle = { design: SiteDesign; setDesign: (next: SiteDesign) => void; status: SiteSyncStatus; draft: { savedAt: string } | null; conflicts: number; notices: string[]; restoreDraft: () => void; render: (enabled: boolean) => Promise<void> };

async function mount(start: SiteDesign, enabled = true): Promise<Handle> {
  const handle = { conflicts: 0, notices: [] as string[] } as Handle;
  function Harness({ on }: { on: boolean }) {
    const [design, setDesign] = useState<SiteDesign>(start);
    handle.design = design; handle.setDesign = setDesign;
    const sync = useSiteSync({ origin: "http://a", enabled: on, design, apply: setDesign, onConflict: () => { handle.conflicts += 1; }, onNotice: message => handle.notices.push(message) });
    handle.status = sync.status; handle.draft = sync.draft; handle.restoreDraft = sync.restoreDraft;
    return null;
  }
  root = createRoot(document.createElement("div"));
  handle.render = async on => { await act(async () => { root!.render(createElement(Harness, { on })); }); };
  await handle.render(enabled);
  return handle;
}
const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
const DRAFT_KEY = "armor-studio-site-draft";

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  vi.useFakeTimers();
  api.readSite.mockReset(); api.saveSite.mockReset();
});
afterEach(async () => { await act(async () => { root?.unmount(); }); root = null; vi.useRealTimers(); });

describe("keeping the site design on the server", () => {
  it("takes the server's design when it starts and sends an edit a moment later, from the revision it holds", async () => {
    api.readSite.mockResolvedValue(doc(4, withPlacement("server-lamp")));
    api.saveSite.mockResolvedValue({ revision: 5 });
    const handle = await mount(base());
    await advance(10);
    expect(names(handle.design)).toEqual(["server-lamp"]);
    expect(handle.status).toBe("saved");
    await act(async () => { handle.setDesign(withPlacement("edited")); });
    await advance(1000);
    expect(api.saveSite).not.toHaveBeenCalled();           // not before the pause
    await advance(600);
    expect(api.saveSite).toHaveBeenCalledTimes(1);
    expect(api.saveSite.mock.calls[0]![1]).toBe(4);
    expect(names(applySiteDoc(api.saveSite.mock.calls[0]![2], base()))).toEqual(["edited"]);
    expect(handle.status).toBe("saved");
    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("a series of quick edits is one save, with the last one", async () => {
    api.readSite.mockResolvedValue(doc(1, withPlacement("s")));
    api.saveSite.mockResolvedValue({ revision: 2 });
    const handle = await mount(base());
    await advance(10);
    for (const name of ["a", "b", "c"]) { await act(async () => { handle.setDesign(withPlacement(name)); }); await advance(500); }
    await advance(1600);
    expect(api.saveSite).toHaveBeenCalledTimes(1);
    expect(names(applySiteDoc(api.saveSite.mock.calls[0]![2], base()))).toEqual(["c"]);
  });

  it("the first browser on a new installation uploads what it drew, but an untouched example is never sent as the real site", async () => {
    api.readSite.mockResolvedValue(doc(0, null));
    api.saveSite.mockResolvedValue({ revision: 1 });
    const handle = await mount(base());
    await advance(10);
    expect(api.saveSite).not.toHaveBeenCalled();
    expect(handle.status).toBe("saved");
    await act(async () => { handle.setDesign(withPlacement("first")); });
    await advance(1600);
    expect(api.saveSite).toHaveBeenCalledTimes(1);
    expect(api.saveSite.mock.calls[0]![1]).toBe(0);

    await act(async () => { root?.unmount(); }); root = null;
    api.saveSite.mockClear();
    api.readSite.mockResolvedValue(doc(0, null));
    const drawn = await mount({ ...base(), terrain: { ...INITIAL_TERRAIN, name: "drawn by hand" } as never });
    await advance(10);
    expect(api.saveSite).toHaveBeenCalledTimes(1);
    expect(drawn.status).toBe("saved");
  });

  it("when somebody saved first, the newer design is taken, the person is told, and nothing is lost silently", async () => {
    api.readSite.mockResolvedValue(doc(1, withPlacement("s")));
    api.saveSite.mockResolvedValue({ conflict: doc(7, withPlacement("theirs")) });
    const handle = await mount(base());
    await advance(10);
    await act(async () => { handle.setDesign(withPlacement("mine")); });
    await advance(1600);
    expect(names(handle.design)).toEqual(["theirs"]);
    expect(handle.conflicts).toBe(1);
    expect(handle.status).toBe("saved");
  });

  it("a server that is down is 'offline', is asked again after five seconds, and the work is kept as a draft meanwhile", async () => {
    api.readSite.mockRejectedValueOnce(new Error("down")).mockResolvedValue(doc(2, withPlacement("s")));
    const handle = await mount(base());
    await advance(10);
    expect(handle.status).toBe("offline");
    await act(async () => { handle.setDesign(withPlacement("typed-offline")); });
    await advance(500);
    const draft = JSON.parse(window.localStorage.getItem(DRAFT_KEY)!) as { origin: string; baseRevision: number | null };
    expect(draft.origin).toBe("http://a");
    expect(draft.baseRevision).toBeNull();
    await advance(5000);
    expect(api.readSite).toHaveBeenCalledTimes(2);
  });

  it("a save that fails says offline and the next edit is tried again", async () => {
    api.readSite.mockResolvedValue(doc(1, withPlacement("s")));
    api.saveSite.mockRejectedValueOnce(new Error("network")).mockResolvedValue({ revision: 2 });
    const handle = await mount(base());
    await advance(10);
    await act(async () => { handle.setDesign(withPlacement("one")); });
    await advance(1600);
    expect(handle.status).toBe("offline");
    expect(window.localStorage.getItem(DRAFT_KEY)).not.toBeNull();
    await act(async () => { handle.setDesign(withPlacement("two")); });
    await advance(1600);
    expect(handle.status).toBe("saved");
    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("puts back the changes that never arrived when the server still has the copy they were made on", async () => {
    api.readSite.mockResolvedValue(doc(3, withPlacement("server")));
    api.saveSite.mockResolvedValue({ revision: 4 });
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ origin: "http://a", baseRevision: 3, savedAt: "t", doc: buildSiteDoc(withPlacement("typed-before-closing")) }));
    const handle = await mount(base());
    await advance(10);
    expect(names(handle.design)).toEqual(["typed-before-closing"]);
    expect(handle.notices).toEqual(["recovered"]);
    await advance(1600);
    expect(api.saveSite).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("keeps the draft aside, and says so, when the server moved on; restoring it makes it the next save", async () => {
    api.readSite.mockResolvedValue(doc(9, withPlacement("theirs")));
    api.saveSite.mockResolvedValue({ revision: 10 });
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ origin: "http://a", baseRevision: 3, savedAt: "2026-01-01T00:00:00Z", doc: buildSiteDoc(withPlacement("old-work")) }));
    const handle = await mount(base());
    await advance(10);
    expect(names(handle.design)).toEqual(["theirs"]);
    expect(handle.notices).toEqual(["kept"]);
    expect(handle.draft).toEqual({ savedAt: "2026-01-01T00:00:00Z" });
    expect(api.saveSite).not.toHaveBeenCalled();
    await act(async () => { handle.restoreDraft(); });
    expect(names(handle.design)).toEqual(["old-work"]);
    expect(handle.draft).toBeNull();
    await advance(1600);
    expect(api.saveSite).toHaveBeenCalledTimes(1);
  });

  it("never offers the draft of another server, and a damaged draft is ignored", async () => {
    api.readSite.mockResolvedValue(doc(3, withPlacement("server")));
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ origin: "http://other", baseRevision: 3, savedAt: "t", doc: buildSiteDoc(withPlacement("elsewhere")) }));
    const handle = await mount(base());
    await advance(1700);
    expect(names(handle.design)).toEqual(["server"]);
    expect(handle.notices).toEqual([]);
    expect(api.saveSite).not.toHaveBeenCalled();
    await act(async () => { root?.unmount(); }); root = null;
    for (const damaged of ["{not json", "null", JSON.stringify({ origin: 5 }), JSON.stringify({ origin: "http://a", savedAt: "t", doc: null })]) {
      window.localStorage.setItem(DRAFT_KEY, damaged);
      const again = await mount(base());
      await advance(10);
      expect(names(again.design), damaged).toEqual(["server"]);
      await act(async () => { root?.unmount(); }); root = null;
    }
  });

  it("picks up what another browser saved, but only when there is nothing unsaved here", async () => {
    api.readSite.mockResolvedValue(doc(1, withPlacement("s")));
    api.saveSite.mockResolvedValue({ revision: 2 });
    const handle = await mount(base());
    await advance(10);
    api.readSite.mockResolvedValue(doc(2, withPlacement("from-the-tablet")));
    await advance(6100);
    expect(names(handle.design)).toEqual(["from-the-tablet"]);
    api.saveSite.mockImplementation(() => new Promise(() => undefined));   // a save that never ends: the edit stays unsaved
    api.readSite.mockResolvedValue(doc(3, withPlacement("later-from-the-tablet")));
    await act(async () => { handle.setDesign(withPlacement("mine-unsaved")); });
    await advance(12_000);
    expect(names(handle.design)).toEqual(["mine-unsaved"]);
  });

  it("does nothing while disabled (not signed in) and starts when it is enabled", async () => {
    api.readSite.mockResolvedValue(doc(1, withPlacement("server")));
    const handle = await mount(base(), false);
    await advance(10000);
    expect(api.readSite).not.toHaveBeenCalled();
    expect(handle.status).toBe("idle");
    await handle.render(true);
    await advance(10);
    expect(names(handle.design)).toEqual(["server"]);
  });
});
