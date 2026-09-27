/**
 * Keeps the site design on the server: loads it when Studio starts (the first browser to open uploads its own), saves every change a moment
 * after it is made, and picks up what another browser saved. Two people editing at once never overwrite each other silently: a save made
 * from an out-of-date copy is refused by the server, and the newer version is then taken here with a notice.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useRef, useState } from "react";
import { readSite, saveSite } from "./api";
import { applySiteDoc, buildSiteDoc, siteDocKey, type SiteDesign } from "./siteSync";

export type SiteSyncStatus = "idle" | "saved" | "saving" | "offline";
const SAVE_DELAY_MS = 1500, POLL_MS = 6000;

export function useSiteSync({ origin, enabled, design, apply, onConflict }: {
  origin: string; enabled: boolean; design: SiteDesign; apply: (next: SiteDesign) => void; onConflict: () => void;
}): SiteSyncStatus {
  const [status, setStatus] = useState<SiteSyncStatus>("idle");
  const revision = useRef<number | null>(null);
  const synced = useRef("");
  const busy = useRef(false);
  const latest = useRef({ design, apply, onConflict });
  latest.current = { design, apply, onConflict };
  const key = siteDocKey(design);
  const keyRef = useRef(key);
  keyRef.current = key;

  const take = (document: { revision: number; site: Record<string, unknown> | null }) => {
    const next = applySiteDoc(document.site, latest.current.design);
    latest.current.apply(next);
    revision.current = document.revision;
    synced.current = siteDocKey(next);
  };

  // First load, and again whenever the server changes.
  useEffect(() => {
    revision.current = null; synced.current = "";
    if (!enabled) return;
    let cancelled = false;
    const start = async () => {
      busy.current = true;
      try {
        const document = await readSite(origin);
        if (cancelled) return;
        if (document.site) take(document);
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
        if ("revision" in saved) { revision.current = saved.revision; synced.current = savedKey; setStatus("saved"); }
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

  return status;
}
