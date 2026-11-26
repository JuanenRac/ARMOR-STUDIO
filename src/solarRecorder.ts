/**
 * The history of each battery and cell, kept by the browser while Studio is open: the server keeps the history of a whole stack only. Points are taken from the readings Studio already
 * asks for; nothing is stored beyond the page and nothing more is asked of anybody.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { SOLAR_THRESHOLDS } from "./solarThresholds";
import { cellStats, type SolarDeviceView, type SolarSample } from "./solarModel";
import { stackKey } from "./solarTotals";

type Track = { example: boolean; seen: string; samples: SolarSample[] };

export class SolarRecorder {
  readonly #tracks = new Map<string, Track>();
  readonly #options: { everyMs: number; keep: number };
  constructor(options: { everyMs: number; keep: number } = { everyMs: SOLAR_THRESHOLDS.recordEveryMs, keep: SOLAR_THRESHOLDS.recordKeep }) { this.#options = options; }

  /** Takes what is new in the readings; a stack that is stale or has not sent anything new adds nothing. */
  record(devices: readonly SolarDeviceView[]): void {
    for (const view of devices) {
      if (view.reading.kind !== "battery" || view.stale) continue;
      const at = Date.parse(view.received_at);
      if (!Number.isFinite(at)) continue;
      for (const module of view.reading.stack) {
        if (!module.present) continue;
        const key = `${stackKey(view)}/${module.n}`;
        let track = this.#tracks.get(key);
        // the first real reading replaces an example, history included
        if (!track || track.example !== (view.example === true)) { track = { example: view.example === true, seen: "", samples: [] }; this.#tracks.set(key, track); }
        const last = track.samples[track.samples.length - 1];
        if (track.seen === view.received_at || (last && at - last.t < this.#options.everyMs)) continue;
        track.seen = view.received_at;
        const point: SolarSample = { t: at };
        if (module.voltage_v !== undefined) point.voltage_v = module.voltage_v;
        if (module.current_a !== undefined) point.current_a = module.current_a;
        if (module.voltage_v !== undefined && module.current_a !== undefined) point.power_w = module.voltage_v * module.current_a;
        if (module.soc_percent !== undefined) point.soc_percent = module.soc_percent;
        if (module.temperature_c !== undefined) point.temperature_c = module.temperature_c;
        const stats = cellStats(module.cells_v);
        if (stats) { point.delta_mv = stats.spreadMv; point.cell_min_v = stats.min; point.cell_max_v = stats.max; }
        module.cells_v?.forEach((volts, index) => { point[`cell${index + 1}`] = volts; });
        track.samples.push(point);
        if (track.samples.length > this.#options.keep) track.samples.splice(0, track.samples.length - this.#options.keep);
      }
    }
  }

  samples(stack: string, module: number): SolarSample[] { return this.#tracks.get(`${stack}/${module}`)?.samples.slice() ?? []; }

  clear(): void { this.#tracks.clear(); }
}

export const solarRecorder = new SolarRecorder();
