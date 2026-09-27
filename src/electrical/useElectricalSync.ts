/**
 * Keeps the electrical drawing on the server, the way the site design is kept: loads it when Studio starts (the first browser to open uploads its own),
 * saves every change a moment after it is made, and picks up what another browser saved. A save made from an out-of-date copy is refused by the server
 * and the newer version is taken here with a notice, so two people editing never overwrite each other silently.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useRef, useState } from "react";
import { readElectrical, saveElectrical } from "../api";
import type { Design } from "./model";
import { applyElectricalDoc, buildElectricalDoc, electricalKey } from "./sync";

export type SyncStatus = "idle" | "saved" | "saving" | "offline";
const SAVE_DELAY_MS = 1500, POLL_MS = 6000;

export function useElectricalSync({ origin, enabled, design, apply, onConflict }: {
  origin: string; enabled: boolean; design: Design; apply: (next: Design) => void; onConflict: () => void;
}): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const revision = useRef<number | null>(null);
  const synced = useRef("");
  const busy = useRef(false);
  const latest = useRef({ design, apply, onConflict });
  latest.current = { design, apply, onConflict };
  const key = electricalKey(design);
  const keyRef = useRef(key);
  keyRef.current = key;

  const take = (document: { revision: number; electrical: Record<string, unknown> | null }) => {
    const next = applyElectricalDoc(document.electrical, latest.current.design);
    latest.current.apply(next);
    revision.current = document.revision;
    synced.current = electricalKey(next);
  };

  useEffect(() => {
    revision.current = null; synced.current = "";
    if (!enabled) return;
    let cancelled = false;
    const start = async () => {
      busy.current = true;
      try {
        const document = await readElectrical(origin);
        if (cancelled) return;
        if (document.electrical) take(document);
        else {
          const saved = await saveElectrical(origin, document.revision, buildElectricalDoc(latest.current.design));
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

  useEffect(() => {
    if (!enabled || revision.current === null || key === synced.current) return;
    setStatus("saving");
    const timer = window.setTimeout(async () => {
      if (busy.current || revision.current === null) return;
      busy.current = true;
      const savedKey = keyRef.current;
      try {
        const saved = await saveElectrical(origin, revision.current, buildElectricalDoc(latest.current.design));
        if ("revision" in saved) { revision.current = saved.revision; synced.current = savedKey; setStatus("saved"); }
        else { take(saved.conflict); latest.current.onConflict(); setStatus("saved"); }
      } catch { setStatus("offline"); }
      busy.current = false;
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [key, enabled, origin]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(async () => {
      if (busy.current || revision.current === null || keyRef.current !== synced.current) return;
      busy.current = true;
      try {
        const document = await readElectrical(origin);
        if (document.electrical && document.revision !== revision.current && keyRef.current === synced.current) take(document);
        setStatus(current => current === "offline" ? "saved" : current);
      } catch { setStatus("offline"); }
      busy.current = false;
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, origin]);   // eslint-disable-line react-hooks/exhaustive-deps

  return status;
}
