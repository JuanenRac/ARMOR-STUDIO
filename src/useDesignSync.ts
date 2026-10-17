/**
 * Keeps a drawing (electrical, network or alarm) on the server, the way the site design is kept: loads it when Studio starts (the first browser to open uploads its own), saves every
 * change a moment after it is made, and picks up what another browser saved. A save made from an out-of-date copy is refused by the server and the newer version is taken here with a
 * notice, so two people editing never overwrite each other silently.
 *
 * The three drawings used to have three copies of this code. What they have in common is here once:
 *  - the drawing is read again only when the SERVER changes, not each time the session check flickers (a minute without answer used to read the server's copy over what had been edited meanwhile);
 *  - the copy kept in this browser belongs to one server and remembers the revision it was made from, so changes that never arrived are put back and sent, and never reach another installation;
 *  - a save that comes due while a read is under way waits for it instead of being dropped (the status stayed on "saving" until the next edit).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useRef, useState } from "react";
import { readLocalCopy, writeLocalCopy } from "./designLocal";

export type SyncStatus = "idle" | "saved" | "saving" | "offline";
const SAVE_DELAY_MS = 1500, POLL_MS = 6000, RETRY_MS = 5000, BUSY_RETRY_MS = 400;

/** A drawing as the server holds it, whatever the field is called there. */
export type RemoteDesign = { revision: number; doc: Record<string, unknown> | null };

/** What a kind of drawing contributes: how it is read and saved on the server, and how it is turned into a document and back. */
export type DesignAdapter<D> = {
  /** The name of the copy kept in the browser, e.g. "electrical". */
  kind: string;
  /** The key the browser used before copies were kept per server. */
  legacyKey: string;
  read: (origin: string) => Promise<RemoteDesign>;
  save: (origin: string, revision: number, doc: Record<string, unknown>) => Promise<{ revision: number } | { conflict: RemoteDesign }>;
  build: (design: D) => Record<string, unknown>;
  /** A stored document over the current design: it replaces it when it is a design, and leaves it alone otherwise. */
  parse: (doc: unknown, current: D) => D;
  /** Two designs with the same key are the same drawing. */
  key: (design: D) => string;
};

/** The copy this browser holds for a server, as a drawing (what the screen shows until the server answers). */
export function loadLocalDesign<D>(adapter: DesignAdapter<D>, origin: string, current: D): D | undefined {
  const copy = readLocalCopy(adapter.kind, adapter.legacyKey, origin);
  if (!copy) return undefined;
  const next = adapter.parse(copy.doc, current);
  return next === current ? undefined : next;
}

export function useDesignSync<D>(adapter: DesignAdapter<D>, { origin, enabled, persist, design, apply, onConflict }: {
  origin: string; enabled: boolean; persist: boolean; design: D; apply: (next: D) => void; onConflict: () => void;
}): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>("idle");
  // Raised when the first answer has been dealt with: the save below must look again even if the drawing on screen did not change (it was already the unsent one).
  const [loaded, setLoaded] = useState(0);
  const revision = useRef<number | null>(null);
  const synced = useRef("");
  const busy = useRef(false);
  const seenOrigin = useRef<string | null>(null);
  const latest = useRef({ design, apply, onConflict, adapter });
  latest.current = { design, apply, onConflict, adapter };
  const key = adapter.key(design);
  const keyRef = useRef(key);
  keyRef.current = key;
  const firstKey = useRef<string | null>(null);

  const take = (document: RemoteDesign) => {
    const { adapter: kind, design: current, apply: put } = latest.current;
    const next = kind.parse(document.doc, current);
    put(next);
    revision.current = document.revision;
    synced.current = kind.key(next);
  };

  // First load, and again when the server changes - not when the session check merely flickers.
  useEffect(() => {
    if (seenOrigin.current !== origin) { seenOrigin.current = origin; revision.current = null; synced.current = ""; }
    if (!enabled || revision.current !== null) return;
    let cancelled = false;
    let retry = 0;
    const start = async () => {
      busy.current = true;
      let failed = false;
      try {
        const { adapter: kind, design: current } = latest.current;
        const remote = await kind.read(origin);
        if (cancelled) return;
        const local = readLocalCopy(kind.kind, kind.legacyKey, origin);
        if (remote.doc) {
          const localDesign = local?.dirty ? kind.parse(local.doc, current) : null;
          if (local && localDesign && local.baseRevision === remote.revision && kind.key(localDesign) !== kind.key(kind.parse(remote.doc, current))) {
            // The server still has the copy this browser's changes were made on: nothing there was lost, only the last changes never arrived. They are put back and sent a moment from now.
            latest.current.apply(localDesign);
            revision.current = remote.revision;
            synced.current = kind.key(kind.parse(remote.doc, current));
          } else {
            if (local?.dirty && local.baseRevision !== remote.revision) latest.current.onConflict();   // someone saved while this browser's changes waited: theirs wins, and the person is told
            take(remote);
          }
        } else {
          const saved = await kind.save(origin, remote.revision, kind.build(latest.current.design));
          if (cancelled) return;
          if ("revision" in saved) { revision.current = saved.revision; synced.current = keyRef.current; }
          else take(saved.conflict);
        }
        setStatus("saved");
        setLoaded(count => count + 1);
      } catch {
        failed = true;
        if (!cancelled) setStatus("offline");
      } finally {
        busy.current = false;
      }
      // A server that did not answer is asked again, not forgotten until the next flicker.
      if (failed && !cancelled) retry = window.setTimeout(() => void start(), RETRY_MS);
    };
    void start();
    return () => { cancelled = true; window.clearTimeout(retry); };
  }, [origin, enabled]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Save a moment after the last change; one that comes due during a read or another save waits for it.
  useEffect(() => {
    if (!enabled || revision.current === null || key === synced.current) return;
    setStatus("saving");
    let timer = 0;
    let cancelled = false;
    const run = async () => {
      if (cancelled || revision.current === null) return;
      if (busy.current) { timer = window.setTimeout(() => void run(), BUSY_RETRY_MS); return; }
      busy.current = true;
      const savedKey = keyRef.current;
      try {
        const { adapter: kind, design: current } = latest.current;
        const saved = await kind.save(origin, revision.current, kind.build(current));
        if ("revision" in saved) { revision.current = saved.revision; synced.current = savedKey; setStatus(keyRef.current === savedKey ? "saved" : "saving"); }
        else { take(saved.conflict); latest.current.onConflict(); setStatus("saved"); }
      } catch { setStatus("offline"); }
      busy.current = false;
    };
    timer = window.setTimeout(() => void run(), SAVE_DELAY_MS);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [key, enabled, origin, loaded]);

  // Pick up what another browser saved, unless there is an unsaved change here.
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(async () => {
      if (busy.current || revision.current === null || keyRef.current !== synced.current) return;
      busy.current = true;
      try {
        const remote = await latest.current.adapter.read(origin);
        if (remote.doc && remote.revision !== revision.current && keyRef.current === synced.current) take(remote);
        setStatus(current => current === "offline" ? "saved" : current);
      } catch { setStatus("offline"); }
      busy.current = false;
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, origin]);   // eslint-disable-line react-hooks/exhaustive-deps

  // The copy of this browser, for this server: what the drawing is, which revision of the server it was made from, and whether the server has it yet.
  useEffect(() => {
    if (!persist) return;
    if (firstKey.current === null) firstKey.current = key;
    const loaded = revision.current !== null;
    const before = readLocalCopy(adapter.kind, adapter.legacyKey, origin);
    // Not in step with the server yet (it has not answered): what was edited since this browser opened is unsent, and the revision to compare with later is the one the copy already had.
    const dirty = loaded ? key !== synced.current : Boolean(before?.dirty) || key !== firstKey.current;
    writeLocalCopy(adapter.kind, origin, { baseRevision: loaded ? revision.current : before?.baseRevision ?? null, dirty, doc: adapter.build(design) });
  }, [key, persist, origin, status]);   // eslint-disable-line react-hooks/exhaustive-deps

  return status;
}
