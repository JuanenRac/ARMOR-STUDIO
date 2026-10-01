/**
 * The small charts of the Weather menu, drawn as plain SVG (no chart library): lines for the temperature and the wind, bars for the rain and the clouds, with a mark for now.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { ReactNode } from "react";

const W = 720, H = 150, PAD = { left: 34, right: 10, top: 12, bottom: 22 };
const finite = (values: ReadonlyArray<number | null>): number[] => values.filter((value): value is number => value !== null && Number.isFinite(value));

/** A "nice" step for an axis that spans `range`: 1, 2, 5, 10... times a power of ten, giving about four steps. */
export function niceStep(range: number): number {
  const raw = Math.max(range, 1e-9) / 4, power = 10 ** Math.floor(Math.log10(raw)), fraction = raw / power;
  return (fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10) * power;
}
/** The axis for some values: its lowest and highest mark and the step between them (`floorAtZero` keeps it from going below zero). */
export function axisFor(values: ReadonlyArray<number | null>, floorAtZero = false, minimumSpan = 1): { min: number; max: number; step: number } {
  const real = finite(values);
  let low = real.length ? Math.min(...real) : 0, high = real.length ? Math.max(...real) : minimumSpan;
  if (floorAtZero) low = Math.min(0, low);
  if (high - low < minimumSpan) high = low + minimumSpan;
  const step = niceStep(high - low);
  return { min: Math.floor(low / step) * step, max: Math.ceil(high / step) * step, step };
}

type Layout = { x: (index: number) => number; y: (value: number) => number; axis: { min: number; max: number; step: number }; count: number };
function layout(count: number, axis: { min: number; max: number; step: number }): Layout {
  const innerW = W - PAD.left - PAD.right, innerH = H - PAD.top - PAD.bottom;
  return { count, axis, x: index => PAD.left + (count <= 1 ? innerW / 2 : (index / (count - 1)) * innerW), y: value => PAD.top + innerH - ((value - axis.min) / (axis.max - axis.min || 1)) * innerH };
}
function Axes({ l, unit, labels, every }: { l: Layout; unit: string; labels: readonly string[]; every: number }) {
  const marks: ReactNode[] = [];
  for (let value = l.axis.min; value <= l.axis.max + 1e-9; value += l.axis.step) {
    marks.push(<g key={`y${value}`}><line className="wx-grid" x1={PAD.left} x2={W - PAD.right} y1={l.y(value)} y2={l.y(value)} /><text className="wx-tick" x={PAD.left - 5} y={l.y(value) + 3} textAnchor="end">{Math.round(value * 10) / 10}</text></g>);
  }
  labels.forEach((label, index) => { if (label && index % every === 0) marks.push(<text key={`x${index}`} className="wx-tick" x={l.x(index)} y={H - 6} textAnchor="middle">{label}</text>); });
  return <>{marks}<text className="wx-unit" x={PAD.left + 4} y={8} textAnchor="start">{unit}</text></>;
}
const NowMark = ({ l, index }: { l: Layout; index: number | null }) => index === null || index < 0 || index >= l.count ? null : <line className="wx-now" x1={l.x(index)} x2={l.x(index)} y1={PAD.top} y2={H - PAD.bottom} />;

export type LineSeries = { values: ReadonlyArray<number | null>; color: string; label: string; area?: boolean; dashed?: boolean };
/** One or more lines on a shared axis; `labels` are the texts under the points (empty ones are skipped), `every` how many points between two of them. */
export function LineChart({ series, labels, unit, now, every = 6, floorAtZero = false, minimumSpan = 2 }: { series: readonly LineSeries[]; labels: readonly string[]; unit: string; now: number | null; every?: number; floorAtZero?: boolean; minimumSpan?: number }) {
  const count = Math.max(...series.map(item => item.values.length), 0), l = layout(count, axisFor(series.flatMap(item => item.values), floorAtZero, minimumSpan));
  const path = (values: ReadonlyArray<number | null>): string[] => {
    const segments: string[] = []; let current = "";
    values.forEach((value, index) => { if (value === null) { if (current) segments.push(current); current = ""; } else current += `${current ? "L" : "M"}${l.x(index).toFixed(1)},${l.y(value).toFixed(1)}`; });
    if (current) segments.push(current);
    return segments;
  };
  return <svg className="wx-chart" viewBox={`0 0 ${W} ${H}`} role="img" preserveAspectRatio="none">
    <Axes l={l} unit={unit} labels={labels} every={every} />
    {series.map(item => <g key={item.label}>
      {item.area && path(item.values).map((segment, index) => <path key={index} className="wx-area" d={`${segment}L${l.x(item.values.length - 1).toFixed(1)},${l.y(l.axis.min)}L${l.x(0).toFixed(1)},${l.y(l.axis.min)}Z`} fill={item.color} />)}
      {path(item.values).map((segment, index) => <path key={index} className="wx-line" d={segment} stroke={item.color} strokeDasharray={item.dashed ? "4 3" : undefined} />)}
    </g>)}
    <NowMark l={l} index={now} />
  </svg>;
}

/** Bars (the rain of each hour) with an optional line over them (the chance of rain, on its own 0 to 100 scale). */
export function BarChart({ values, labels, unit, now, color = "#4fb3ff", chance, every = 6, minimumSpan = 2 }: { values: ReadonlyArray<number | null>; labels: readonly string[]; unit: string; now: number | null; color?: string; chance?: ReadonlyArray<number | null>; every?: number; minimumSpan?: number }) {
  const l = layout(values.length, axisFor(values, true, minimumSpan)), barW = Math.max(2, (W - PAD.left - PAD.right) / Math.max(1, values.length) - 2);
  return <svg className="wx-chart" viewBox={`0 0 ${W} ${H}`} role="img" preserveAspectRatio="none">
    <Axes l={l} unit={unit} labels={labels} every={every} />
    {values.map((value, index) => value ? <rect key={index} className="wx-bar" x={l.x(index) - barW / 2} width={barW} y={l.y(value)} height={Math.max(1, l.y(l.axis.min) - l.y(value))} fill={color}><title>{`${labels[index] ?? ""} ${value} ${unit}`}</title></rect> : null)}
    {chance && <path className="wx-line" stroke="#ffd166" strokeDasharray="3 3" d={chance.map((value, index) => value === null ? "" : `${index && chance[index - 1] !== null ? "L" : "M"}${l.x(index).toFixed(1)},${(PAD.top + (H - PAD.top - PAD.bottom) * (1 - value / 100)).toFixed(1)}`).join("")} />}
    <NowMark l={l} index={now} />
  </svg>;
}

/** The clouds of each hour as three stacked fractions, low, medium and high, on a 0 to 100 scale. */
export function CloudChart({ low, mid, high, labels, now, every = 6 }: { low: ReadonlyArray<number | null>; mid: ReadonlyArray<number | null>; high: ReadonlyArray<number | null>; labels: readonly string[]; now: number | null; every?: number }) {
  const count = Math.max(low.length, mid.length, high.length), l = layout(count, { min: 0, max: 100, step: 25 }), barW = Math.max(2, (W - PAD.left - PAD.right) / Math.max(1, count) - 2);
  const colours = ["#8aa4b2", "#b9c9d3", "#e6eef2"] as const, layers = [low, mid, high];
  return <svg className="wx-chart" viewBox={`0 0 ${W} ${H}`} role="img" preserveAspectRatio="none">
    <Axes l={l} unit="%" labels={labels} every={every} />
    {Array.from({ length: count }, (_, index) => <g key={index}>{layers.map((layer, which) => { const value = layer[index]; return value ? <rect key={which} className="wx-bar" x={l.x(index) - barW / 2} width={barW} y={l.y(value)} height={Math.max(0, l.y(0) - l.y(value))} fill={colours[which]} opacity={0.35} /> : null; })}</g>)}
    <NowMark l={l} index={now} />
  </svg>;
}

/** The arrow of a wind that comes from `degrees`: it points where the wind goes. */
export const WindArrow = ({ degrees, size = 20 }: { degrees: number | null; size?: number }) => degrees === null ? null :
  <svg className="wx-arrow" width={size} height={size} viewBox="-10 -10 20 20" role="img" aria-hidden="true" style={{ transform: `rotate(${degrees + 180}deg)` }}><path d="M0,-8 L5,6 L0,3 L-5,6 Z" fill="currentColor" /></svg>;
