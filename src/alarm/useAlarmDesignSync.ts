/**
 * Keeps the alarm drawing on the server, the way the electrical drawing and the site design are kept (see useDesignSync): loads it when Studio starts (the first browser to open
 * uploads its own), saves every change a moment after it is made, and picks up what another browser saved.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { readAlarmDesign, saveAlarmDesign } from "../api";
import { useDesignSync, type DesignAdapter, type SyncStatus } from "../useDesignSync";
import type { Design } from "./model";
import { applyAlarmDoc, buildAlarmDoc, alarmKey } from "./sync";

export type { SyncStatus };

export const alarmAdapter: DesignAdapter<Design> = {
  kind: "alarm-design",
  legacyKey: "armor-studio-alarm-design-v1",
  read: async origin => { const document = await readAlarmDesign(origin); return { revision: document.revision, doc: document.alarm_design }; },
  save: async (origin, revision, doc) => {
    const saved = await saveAlarmDesign(origin, revision, doc);
    return "revision" in saved ? saved : { conflict: { revision: saved.conflict.revision, doc: saved.conflict.alarm_design } };
  },
  build: buildAlarmDoc,
  parse: applyAlarmDoc,
  key: alarmKey,
};

export const useAlarmDesignSync = (options: { origin: string; enabled: boolean; persist: boolean; design: Design; apply: (next: Design) => void; onConflict: () => void }): SyncStatus =>
  useDesignSync(alarmAdapter, options);
