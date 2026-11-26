/**
 * The detailed history chart of the battery menu: several series that can be switched off in the legend, the lowest, highest and last value of each, the levels drawn as dashed lines,
 * a cursor that reads the nearest sample, a stretch dragged with the pointer to zoom into it, and the samples on screen saved as CSV. Plain SVG, like the other drawings.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Translate } from "./components/camera";
import { nearestSample, niceScale, pathOf, seriesPoints, timeTicks, type ChartSeries, type SolarSample } from "./solarModel";
import { samplesToCsv, seriesStats, thresholdsInView, type Threshold } from "./solarChartData";

function saveText(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob(["\uFEFF", text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const BOX = { width: 720, height: 230, left: 50, right: 12, top: 10, bottom: 26 };

type Props = {
  t: Translate; title: string; samples: readonly SolarSample[]; series: readonly ChartSeries[]; from: number; to: number;
  decimals?: number; thresholds?: readonly Threshold[]; csvName: string;
};

export function ProChart({ t, title, samples, series, from, to, decimals = 1, thresholds = [], csvName }: Props) {
  const [off, setOff] = useState<ReadonlySet<string>>(new Set());
  const [cursor, setCursor] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null);
  const [zoom, setZoom] = useState<{ from: number; to: number } | null>(null);
  const start = zoom?.from ?? from, end = zoom?.to ?? to;
  const inner = { width: BOX.width - BOX.left - BOX.right, height: BOX.height - BOX.top - BOX.bottom };
  const inside = samples.filter(sample => sample.t >= start && sample.t <= end);
  const shown = series.filter(item => !off.has(item.key));
  const values = shown.flatMap(item => inside.map(sample => sample[item.key]).filter((value): value is number => typeof value === "number"));
  const levels = thresholdsInView(values, thresholds);
  const scale = niceScale([...values, ...levels.map(item => item.value)]);
  const rows: number[] = [];
  for (let value = scale.low; value <= scale.high + scale.step / 2; value += scale.step) rows.push(Number(value.toFixed(6)));
  const axisDigits = Math.max(0, Math.min(4, Math.ceil(-Math.log10(scale.step) - 1e-9)));
  const y = (value: number) => inner.height - ((value - scale.low) / (scale.high - scale.low)) * inner.height;
  const timeAt = (x: number) => start + (x / inner.width) * (end - start);
  const clock = (time: number) => (end - start > 36 * 3_600_000 ? new Date(time).toLocaleDateString([], { day: "2-digit", month: "2-digit" }) : new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const at = cursor === null || inside.length === 0 ? undefined : nearestSample(inside, timeAt(cursor));
  const xOf = (event: ReactPointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return Math.min(inner.width, Math.max(0, ((event.clientX - box.left) / (box.width || BOX.width)) * BOX.width - BOX.left));
  };
  const release = () => {
    // a drag shorter than a few pixels is a click, not a zoom
    if (drag && Math.abs(drag.end - drag.start) > 8) setZoom({ from: timeAt(Math.min(drag.start, drag.end)), to: timeAt(Math.max(drag.start, drag.end)) });
    setDrag(null);
  };
  const toggle = (key: string) => setOff(current => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  return <figure className="sl-chart sl-pro" aria-label={title}>
    <figcaption className="sl-pro-head">
      <b>{title}</b>
      {at && <em>{clock(at.t)}</em>}
      <span className="sl-pro-tools">
        {zoom && <button type="button" onClick={() => setZoom(null)}>{t("solx_zoom_reset")}</button>}
        <button type="button" disabled={inside.length === 0} onClick={() => saveText(csvName, samplesToCsv(inside, series))}>{t("solx_csv")}</button>
      </span>
    </figcaption>
    <div className="sl-chart-legend">
      {series.map(item => {
        const stats = seriesStats(inside, item.key);
        const now = at && typeof at[item.key] === "number" ? (at[item.key] as number) : stats?.last;
        return <button type="button" key={item.key} className="sl-pro-key" aria-pressed={!off.has(item.key)} onClick={() => toggle(item.key)}
          title={stats ? `${t("solx_min")} ${stats.min.toFixed(decimals)} · ${t("solx_max")} ${stats.max.toFixed(decimals)} ${item.unit}` : undefined}>
          <i style={{ background: item.color }} />{item.label}{now === undefined ? null : <b> {now.toFixed(decimals)} {item.unit}</b>}
          {stats && series.length <= 4 && <small> {t("solx_min")} {stats.min.toFixed(decimals)} · {t("solx_max")} {stats.max.toFixed(decimals)}</small>}
        </button>;
      })}
      {levels.map(item => <span key={item.label} className={`sl-pro-level ${item.tone}`}>┄ {item.label} {item.value.toFixed(decimals)}</span>)}
    </div>
    {values.length < 2 ? <div className="sl-chart-empty">{t("solarNoHistory")}</div> : <svg viewBox={`0 0 ${BOX.width} ${BOX.height}`} role="img" aria-label={title}
      onPointerMove={event => { const x = xOf(event); setCursor(x); if (drag) setDrag({ ...drag, end: x }); }}
      onPointerDown={event => { const x = xOf(event); setDrag({ start: x, end: x }); }}
      onPointerUp={release} onPointerLeave={() => { setCursor(null); setDrag(null); }} onDoubleClick={() => setZoom(null)}>
      <g transform={`translate(${BOX.left} ${BOX.top})`}>
        {rows.map(value => <g key={value}><line x1="0" x2={inner.width} y1={y(value)} y2={y(value)} className="sl-grid" /><text x="-8" y={y(value) + 4} textAnchor="end" className="sl-axis">{value.toFixed(axisDigits)}</text></g>)}
        {timeTicks(start, end).map(tick => { const x = ((tick - start) / (end - start)) * inner.width; return <g key={tick}><line x1={x} x2={x} y1="0" y2={inner.height} className="sl-grid faint" /><text x={x} y={inner.height + 18} textAnchor="middle" className="sl-axis">{clock(tick)}</text></g>; })}
        {levels.map(item => <line key={item.label} x1="0" x2={inner.width} y1={y(item.value)} y2={y(item.value)} className={`sl-threshold ${item.tone}`} />)}
        {shown.map(item => <path key={item.key} d={pathOf(seriesPoints(inside, item.key, start, end, scale, inner.width, inner.height))} fill="none" stroke={item.color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />)}
        {drag && <rect className="sl-zoom" x={Math.min(drag.start, drag.end)} y="0" width={Math.abs(drag.end - drag.start)} height={inner.height} />}
        {at && cursor !== null && <g>
          <line x1={((at.t - start) / (end - start)) * inner.width} x2={((at.t - start) / (end - start)) * inner.width} y1="0" y2={inner.height} className="sl-cursor" />
          {shown.map(item => typeof at[item.key] === "number" ? <circle key={item.key} cx={((at.t - start) / (end - start)) * inner.width} cy={y(at[item.key] as number)} r="3.5" fill={item.color} stroke="#04131a" strokeWidth="1.5" /> : null)}
        </g>}
      </g>
    </svg>}
  </figure>;
}
