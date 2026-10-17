/**
 * Keeps the network drawing on the server, the way the electrical drawing and the site design are kept (see useDesignSync): loads it when Studio starts (the first browser to open
 * uploads its own), saves every change a moment after it is made, and picks up what another browser saved.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { readNetworkDesign, saveNetworkDesign } from "../api";
import { useDesignSync, type DesignAdapter, type SyncStatus } from "../useDesignSync";
import type { Design } from "./model";
import { applyNetworkDoc, buildNetworkDoc, networkKey } from "./sync";

export type { SyncStatus };

export const networkAdapter: DesignAdapter<Design> = {
  kind: "network",
  legacyKey: "armor-studio-network-v1",
  read: async origin => { const document = await readNetworkDesign(origin); return { revision: document.revision, doc: document.network }; },
  save: async (origin, revision, doc) => {
    const saved = await saveNetworkDesign(origin, revision, doc);
    return "revision" in saved ? saved : { conflict: { revision: saved.conflict.revision, doc: saved.conflict.network } };
  },
  build: buildNetworkDoc,
  parse: applyNetworkDoc,
  key: networkKey,
};

export const useNetworkSync = (options: { origin: string; enabled: boolean; persist: boolean; design: Design; apply: (next: Design) => void; onConflict: () => void }): SyncStatus =>
  useDesignSync(networkAdapter, options);
