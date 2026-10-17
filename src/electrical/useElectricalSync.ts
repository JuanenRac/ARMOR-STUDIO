/**
 * Keeps the electrical drawing on the server, the way the site design is kept (see useDesignSync): loads it when Studio starts (the first browser to open uploads its own),
 * saves every change a moment after it is made, and picks up what another browser saved.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { readElectrical, saveElectrical } from "../api";
import { useDesignSync, type DesignAdapter, type SyncStatus } from "../useDesignSync";
import type { Design } from "./model";
import { applyElectricalDoc, buildElectricalDoc, electricalKey } from "./sync";

export type { SyncStatus };

export const electricalAdapter: DesignAdapter<Design> = {
  kind: "electrical",
  legacyKey: "armor-studio-electrical-v1",
  read: async origin => { const document = await readElectrical(origin); return { revision: document.revision, doc: document.electrical }; },
  save: async (origin, revision, doc) => {
    const saved = await saveElectrical(origin, revision, doc);
    return "revision" in saved ? saved : { conflict: { revision: saved.conflict.revision, doc: saved.conflict.electrical } };
  },
  build: buildElectricalDoc,
  parse: applyElectricalDoc,
  key: electricalKey,
};

export const useElectricalSync = (options: { origin: string; enabled: boolean; persist: boolean; design: Design; apply: (next: Design) => void; onConflict: () => void }): SyncStatus =>
  useDesignSync(electricalAdapter, options);
