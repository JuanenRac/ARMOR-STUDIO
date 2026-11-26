/**
 * The optional view of the charts by cell: one small chart for each cell, all on the same scale, each with its latest, lowest and highest voltage. A cell whose latest reading is a
 * fault blinks (the same one-second blink as everywhere in the menu, still when less motion is asked for). Off until the person ticks it; the browser remembers the tick.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState } from "react";
import type { Translate } from "./components/camera";
import { seriesStats, thresholdsInView, type Threshold } from "./solarChartData";
import { cellFault } from "./solarFaults";
import { niceScale, pathOf, seriesPoints, type SolarSample } from "./solarModel";

export const SMALL_CHARTS_KEY = "armor-studio-solar-cell-charts";
const BOX = { width: 200, height: 70 };

/** Whether the person asked for the small charts, remembered by this browser; off when there is nothing remembered or storage is blocked. */
export function useSmallCellCharts(): [boolean, (value: boolean) => void] {
  const [on, setOn] = useState(() => { try { return window.localStorage.getItem(SMALL_CHARTS_KEY) === "1"; } catch { return false; } });
  return [on, (value: boolean) => { setOn(value); try { window.localStorage.setItem(SMALL_CHARTS_KEY, value ? "1" : "0"); } catch { /* Storage may be blocked. */ } }];
}

type Props = { t: Translate; samples: readonly SolarSample[]; cells: readonly number[]; from: number; to: number; thresholds: readonly Threshold[]; lfp: boolean };

export function CellMultiples({ t, samples, cells, from, to, thresholds, lfp }: Props) {
  const inside = samples.filter(sample => sample.t >= from && sample.t <= to);
  const keys = cells.map((_, index) => `cell${index + 1}`);
  const values = keys.flatMap(key => inside.map(sample => sample[key]).filter((value): value is number => typeof value === "number"));
  const levels = thresholdsInView(values, thresholds);
  const scale = niceScale([...values, ...levels.map(item => item.value)]);
  const y = (value: number) => BOX.height - ((value - scale.low) / (scale.high - scale.low)) * BOX.height;
  return <>
    <p className="muted small">{t("solx_cells_small_note")}</p>
    <div className="sl-multiples" data-testid="cell-multiples">
      {cells.map((now, index) => {
        const stats = seriesStats(inside, keys[index]);
        const fault = cellFault(now, lfp);
        const title = `${t("solarCellWord")} ${index + 1}`;
        return <figure key={keys[index]} className={`sl-multiple${fault ? " sl-blink-fault faulty" : ""}`} aria-label={title}>
          <figcaption><b>{title}</b> <span>{now.toFixed(3)} V</span>{fault && <em>✖ {t(`solx_fault_${fault}`)}</em>}</figcaption>
          {stats === null ? <div className="sl-chart-empty">{t("solarNoHistory")}</div> : <>
            <svg viewBox={`0 0 ${BOX.width} ${BOX.height}`} preserveAspectRatio="none" role="img" aria-label={title}>
              {levels.map(item => <line key={item.label} x1="0" x2={BOX.width} y1={y(item.value)} y2={y(item.value)} className={`sl-threshold ${item.tone}`} />)}
              <path d={pathOf(seriesPoints(inside, keys[index], from, to, scale, BOX.width, BOX.height))} fill="none" stroke={fault ? "#ff4d5e" : "#4be2e9"} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>
            <small>{t("solx_min")} {stats.min.toFixed(3)} · {t("solx_max")} {stats.max.toFixed(3)}</small>
          </>}
        </figure>;
      })}
    </div>
  </>;
}
