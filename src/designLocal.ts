/**
 * The copy of a drawing (electrical, network, alarm) that this browser keeps for ONE server. It is there when the server is not, and it remembers what the server's revision was when the
 * copy was last in step with it and whether there are changes that never reached it - so an edit made while the connection was down is put back and sent when it returns, and the
 * drawing of one installation is never offered to another (the key carries the address of the server).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export type LocalCopy = { baseRevision: number | null; dirty: boolean; doc: Record<string, unknown> };

const keyFor = (kind: string, origin: string) => `armor-studio-${kind}-copy:${origin}`;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The copy kept for this server. Before the key carried the address, one copy was kept for the whole browser: it is used once, for the server this browser signed in to last (the one it
 * was almost certainly made for), and only when there is no copy of its own yet.
 */
export function readLocalCopy(kind: string, legacyKey: string, origin: string): LocalCopy | null {
  try {
    const own = window.localStorage.getItem(keyFor(kind, origin));
    if (own) {
      const raw = JSON.parse(own) as Partial<LocalCopy> | null;
      if (raw && isRecord(raw.doc)) return { baseRevision: typeof raw.baseRevision === "number" ? raw.baseRevision : null, dirty: raw.dirty === true, doc: raw.doc };
      return null;
    }
    if (window.localStorage.getItem("armor-studio-origin") !== origin) return null;
    const legacy = window.localStorage.getItem(legacyKey);
    if (!legacy) return null;
    const doc = JSON.parse(legacy) as unknown;
    return isRecord(doc) ? { baseRevision: null, dirty: false, doc } : null;
  } catch { return null; }   // storage may be blocked, or hold something else
}

export function writeLocalCopy(kind: string, origin: string, copy: LocalCopy): void {
  try { window.localStorage.setItem(keyFor(kind, origin), JSON.stringify(copy)); } catch { /* storage may be full or blocked */ }
}
