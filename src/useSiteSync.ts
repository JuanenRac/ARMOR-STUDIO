/**
 * Keeps the site design on the server: loads it when Studio starts (the first browser to open uploads its own), saves every change a moment
 * after it is made, and picks up what another browser saved. Two people editing at once never overwrite each other silently: a save made
 * from an out-of-date copy is refused by the server, and the newer version is then taken here with a notice.
 *
 * Changes that have not reached the server (it was off, the network was down, the session had ended) are also kept in this browser as a draft.
 * The next time Studio starts, a draft whose server copy has not changed since is put back and saved; one whose server copy has moved on is kept
 * aside and offered in the Versions dialog - so the server's copy never silently replaces work that only this browser had.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useRef, useState } from "react";
import { readSite, saveSite } from "./api";
import { applySiteDoc, buildSiteDoc, siteDocKey, type SiteDesign } from "./siteSync";

export type SiteSyncStatus = "idle" | "saved" | "saving" | "offline";
export type SiteDraftInfo = { savedAt: string };
const SAVE_DELAY_MS = 1500, POLL_MS = 6000, DRAFT_KEY = "armor-studio-site-draft";

type Draft = { origin: string; baseRevision: number | null; savedAt: string; doc: Record<string, unknown> };
const readDraft = (): Draft | null => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "null") as Partial<Draft> | null;
    return raw && typeof raw.origin === "string" && typeof raw.savedAt === "string" && typeof raw.doc === "object" && raw.doc !== null
      ? { origin: raw.origin, baseRevision: typeof raw.baseRevision === "number" ? raw.baseRevision : null, savedAt: raw.savedAt, doc: raw.doc as Record<string, unknown> } : null;
  } catch { return null; }
};
const writeDraft = (draft: Draft | null) => { try { if (draft) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); else window.localStorage.removeItem(DRAFT_KEY); } catch { /* A full or blocked storage only means there is no draft. */ } };

export function useSiteSync({ origin, enabled, design, apply, onConflict, onNotice }: {
  origin: string; enabled: boolean; design: SiteDesign; apply: (next: SiteDesign) => void; onConflict: () => void; onNotice?: (message: "recovered" | "kept") => void;
}): { status: SiteSyncStatus; draft: SiteDraftInfo | null; restoreDraft: () => void; restoreDocument: (site: Record<string, unknown>) => void } {
  const [status, setStatus] = useState<SiteSyncStatus>("idle");
  const [kept, setKept] = useState<SiteDraftInfo | null>(null);
  const revision = useRef<number | null>(null);
  const synced = useRef("");
  const busy = useRef(false);
  const latest = useRef({ design, apply, onConflict, onNotice });
  latest.current = { design, apply, onConflict, onNotice };
  const key = siteDocKey(design);
  const keyRef = useRef(key);
  keyRef.current = key;
  const startKey = useRef<string | null>(null);

  const take = (document: { revision: number; site: Record<string, unknown> | null }) => {
    const next = applySiteDoc(document.site, latest.current.design);
    latest.current.apply(next);
    revision.current = document.revision;
    synced.current = siteDocKey(next);
  };

  // First load, and again whenever the server changes.
  useEffect(() => {
    revision.current = null; synced.current = ""; startKey.current = keyRef.current;
    if (!enabled) return;
    let cancelled = false;
    const start = async () => {
      busy.current = true;
      try {
        const document = await readSite(origin);
        if (cancelled) return;
        const draft = readDraft();
        const serverKey = document.site ? siteDocKey(applySiteDoc(document.site, latest.current.design)) : null;
        const draftKey = draft && draft.origin === origin ? siteDocKey(applySiteDoc(draft.doc, latest.current.design)) : null;
        if (draft && draft.origin === origin && draftKey !== serverKey && document.site) {
          if (draft.baseRevision === document.revision) {
            // The server copy is the one this draft was made from: nothing there was lost, only this browser's last changes never arrived.
            const next = applySiteDoc(draft.doc, latest.current.design);
            latest.current.apply(next);
            revision.current = document.revision;
            synced.current = serverKey ?? "";   // the draft differs from it, so it is saved a moment from now
            latest.current.onNotice?.("recovered");
          } else {
            take(document);
            setKept({ savedAt: draft.savedAt });
            latest.current.onNotice?.("kept");
          }
        } else if (document.site) { take(document); if (draft && draft.origin === origin) writeDraft(null); }
        else {
          const saved = await saveSite(origin, document.revision, buildSiteDoc(latest.current.design));
          if (cancelled) return;
          if ("revision" in saved) { revision.current = saved.revision; synced.current = keyRef.current; }
          else take(saved.conflict);
        }
        setStatus("saved");
      } catch { if (!cancelled) setStatus("offline"); }
      busy.current = false;
    };
    void start();
    return () => { cancelled = true; };
  }, [origin, enabled]);   // eslint-disable-line react-hooks/exhaustive-deps

  // What has not reached the server is kept in this browser too, as soon as there is any.
  useEffect(() => {
    if (!enabled) return;
    const loaded = revision.current !== null;
    const unsaved = loaded ? key !== synced.current : status === "offline" && startKey.current !== null && key !== startKey.current;
    if (!unsaved) return;
    const timer = window.setTimeout(() => writeDraft({ origin, baseRevision: revision.current, savedAt: new Date().toISOString(), doc: buildSiteDoc(latest.current.design) }), 400);
    return () => window.clearTimeout(timer);
  }, [key, enabled, origin, status]);

  // Save a moment after the last change.
  useEffect(() => {
    if (!enabled || revision.current === null || key === synced.current) return;
    setStatus("saving");
    const timer = window.setTimeout(async () => {
      if (busy.current || revision.current === null) return;
      busy.current = true;
      const savedKey = keyRef.current;
      try {
        const saved = await saveSite(origin, revision.current, buildSiteDoc(latest.current.design));
        if ("revision" in saved) { revision.current = saved.revision; synced.current = savedKey; if (savedKey === keyRef.current) writeDraft(null); setStatus("saved"); }
        else { take(saved.conflict); latest.current.onConflict(); setStatus("saved"); }
      } catch { setStatus("offline"); }
      busy.current = false;
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [key, enabled, origin]);

  // Pick up what another browser saved, unless there is an unsaved change here.
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(async () => {
      if (busy.current || revision.current === null || keyRef.current !== synced.current) return;
      busy.current = true;
      try {
        const document = await readSite(origin);
        if (document.site && document.revision !== revision.current && keyRef.current === synced.current) take(document);
        setStatus(current => current === "offline" ? "saved" : current);
      } catch { setStatus("offline"); }
      busy.current = false;
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, origin]);   // eslint-disable-line react-hooks/exhaustive-deps

  /** Put a stored document in place as an unsaved change: the usual save then makes it the current design. */
  const restoreDocument = (site: Record<string, unknown>) => { latest.current.apply(applySiteDoc(site, latest.current.design)); };
  const restoreDraft = () => {
    const draft = readDraft();
    if (draft) restoreDocument(draft.doc);
    writeDraft(null); setKept(null);
  };

  return { status, draft: kept, restoreDraft, restoreDocument };
}
