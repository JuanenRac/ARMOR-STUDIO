/**
 * The drawings of the solar menus: the logos, the animated energy flow of an inverter, the battery with its liquid level, the gauges, the line charts
 * and the bars of the cells of a module. Plain SVG and CSS animation (solar.css), no library; the numbers come from solarModel.ts.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useId, useMemo, useState } from "react";
import type { Translate } from "./components/camera";
import {
  areaOf, cellFill, cellStats, cellTone, flowSeconds, flowsOf, formatPower, levelTone, nearestSample, niceScale, pathOf, seriesPoints, timeTicks,
  type ChartSeries, type SolarInverterReading, type SolarSample, type Tone,
} from "./solarModel";

export const SOLAR_COLOURS = { pv: "#ffb020", load: "#00e5ff", battery: "#5df0c4", grid: "#9b8cff", bad: "#ff7a85", muted: "#6b8792" } as const;
const TONE_COLOUR: Record<Tone, string> = { ok: "#5df0c4", warn: "#ffb020", bad: "#ff7a85" };

// ---- logos -----------------------------------------------------------------------------------------------------------------------------

/** The logo of the inverters menu: a sun whose rays turn slowly over a sine wave that runs. */
export function InverterLogo({ size = 56 }: { size?: number }) {
  const id = useId();
  return <svg className="sl-logo" width={size} height={size} viewBox="0 0 64 64" role="img" aria-hidden="true">
    <defs><radialGradient id={`${id}-sun`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffe08a" /><stop offset="1" stopColor="#ff9f1c" /></radialGradient></defs>
    <g className="sl-rays" style={{ transformOrigin: "32px 24px" }}>
      {Array.from({ length: 8 }, (_, i) => <line key={i} x1="32" y1="4" x2="32" y2="9" stroke="#ffb020" strokeWidth="3" strokeLinecap="round" transform={`rotate(${i * 45} 32 24)`} />)}
    </g>
    <circle cx="32" cy="24" r="11" fill={`url(#${id}-sun)`} className="sl-sun" />
    <rect x="8" y="42" width="48" height="16" rx="5" fill="#0d2833" stroke="#00e5ff" strokeWidth="2" />
    <path className="sl-wave-line" d="M13 50 q4.5 -8 9 0 t9 0 t9 0 t9 0" fill="none" stroke="#00e5ff" strokeWidth="2.4" strokeLinecap="round" />
  </svg>;
}

/** The logo of the batteries menu: a battery whose liquid rocks, with a bolt that pulses. */
export function BatteryLogo({ size = 56, percent = 72 }: { size?: number; percent?: number }) {
  const id = useId();
  const top = 14 + (1 - Math.min(1, Math.max(0.05, percent / 100))) * 38;
  return <svg className="sl-logo" width={size} height={size} viewBox="0 0 64 64" role="img" aria-hidden="true">
    <defs><clipPath id={`${id}-body`}><rect x="16" y="12" width="32" height="44" rx="6" /></clipPath></defs>
    <rect x="25" y="6" width="14" height="6" rx="2" fill="#5df0c4" />
    <rect x="16" y="12" width="32" height="44" rx="6" fill="#0a1e27" stroke="#5df0c4" strokeWidth="2.4" />
    <g clipPath={`url(#${id}-body)`}>
      <g className="sl-liquid" style={{ transform: `translateY(${top - 14}px)` }}>
        <path className="sl-slosh" d="M6 16 q5 -5 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 V60 H6 Z" fill="#5df0c4" opacity=".85" />
      </g>
    </g>
    <path className="sl-bolt" d="M34 20 L25 35 h7 l-3 12 l11 -17 h-7 z" fill="#06202a" stroke="#eafff8" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>;
}

// ---- the flow of an inverter -----------------------------------------------------------------------------------------------------------

type FlowNode = { x: number; y: number };
const NODES: Record<"pv" | "grid" | "inverter" | "battery" | "load", FlowNode> = { pv: { x: 110, y: 62 }, grid: { x: 110, y: 258 }, inverter: { x: 380, y: 160 }, battery: { x: 650, y: 258 }, load: { x: 650, y: 62 } };

function Arrow({ from, to, active, watts, colour, reverse = false }: { from: FlowNode; to: FlowNode; active: boolean; watts: number; colour: string; reverse?: boolean }) {
  const midX = (from.x + to.x) / 2;
  const d = `M${reverse ? to.x : from.x} ${reverse ? to.y : from.y} C${midX} ${reverse ? to.y : from.y}, ${midX} ${reverse ? from.y : to.y}, ${reverse ? from.x : to.x} ${reverse ? from.y : to.y}`;
  return <g>
    <path d={d} fill="none" stroke="#173846" strokeWidth="7" strokeLinecap="round" />
    {active && <path d={d} fill="none" stroke={colour} strokeWidth="4" strokeLinecap="round" strokeDasharray="2 16" className="sl-flow" style={{ animationDuration: `${flowSeconds(watts)}s` }} />}
  </g>;
}

function NodeBadge({ at, colour, label, value, children }: { at: FlowNode; colour: string; label: string; value: string; children: React.ReactNode }) {
  return <g transform={`translate(${at.x} ${at.y})`}>
    <circle r="40" fill="#0b202a" stroke={colour} strokeWidth="2.4" className="sl-node" />
    {children}
    <text y="62" textAnchor="middle" className="sl-node-label">{label}</text>
    <text y="82" textAnchor="middle" className="sl-node-value" fill={colour}>{value}</text>
  </g>;
}

/** The animated picture of an inverter: panels, grid, inverter, battery and house, with dashes running along the arrows that carry power. */
export function FlowDiagram({ inverter, t }: { inverter: SolarInverterReading; t: Translate }) {
  const flow = useMemo(() => flowsOf(inverter), [inverter]);
  const batteryColour = flow.batteryW >= 0 ? SOLAR_COLOURS.battery : "#ff9f7a";
  return <svg className="sl-flow-svg" viewBox="0 0 760 350" role="img" aria-label={t("solarTitle")}>
    <Arrow from={NODES.pv} to={NODES.inverter} active={flow.pvToInverter} watts={flow.pvW} colour={SOLAR_COLOURS.pv} />
    <Arrow from={NODES.grid} to={NODES.inverter} active={flow.gridToInverter} watts={flow.gridW} colour={SOLAR_COLOURS.grid} />
    <Arrow from={NODES.inverter} to={NODES.load} active={flow.inverterToLoad} watts={flow.loadW} colour={SOLAR_COLOURS.load} />
    <Arrow from={NODES.inverter} to={NODES.battery} active={flow.inverterToBattery || flow.batteryToInverter} watts={flow.batteryW} colour={batteryColour} reverse={flow.batteryToInverter} />
    <g transform={`translate(${NODES.inverter.x} ${NODES.inverter.y})`}>
      <rect x="-58" y="-46" width="116" height="92" rx="14" fill="#0b202a" stroke={inverter.mode === "fault" ? SOLAR_COLOURS.bad : "#00e5ff"} strokeWidth="2.6" className="sl-node" />
      <path className="sl-wave-line" d="M-34 4 q8.5 -18 17 0 t17 0 t17 0 t17 0" fill="none" stroke="#00e5ff" strokeWidth="3.4" strokeLinecap="round" />
      <text y="-24" textAnchor="middle" className="sl-node-label">{t(`solarMode_${inverter.mode}`)}</text>
      <text y="34" textAnchor="middle" className="sl-node-value" fill="#00e5ff">{Math.round(inverter.heatsink_c)} °C</text>
    </g>
    <NodeBadge at={NODES.pv} colour={SOLAR_COLOURS.pv} label={t("solarPv")} value={formatPower(flow.pvW)}>
      <g className="sl-rays" style={{ transformOrigin: "0px -4px" }}>{Array.from({ length: 8 }, (_, i) => <line key={i} x1="0" y1="-30" x2="0" y2="-25" stroke="#ffb020" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${i * 45} 0 -4)`} />)}</g>
      <circle cy="-4" r="13" fill="#ffb020" />
      <path d="M-18 14 h36 l4 12 h-44 z" fill="#123a52" stroke="#5fc8ff" strokeWidth="1.5" />
    </NodeBadge>
    <NodeBadge at={NODES.grid} colour={flow.gridPresent ? SOLAR_COLOURS.grid : SOLAR_COLOURS.muted} label={t("solarGrid")} value={flow.gridPresent ? `${inverter.grid_v.toFixed(0)} V` : t("solarGridOff")}>
      <path d="M0 -24 L-14 20 M0 -24 L14 20 M-12 -8 h24 M-9 6 h18 M0 -24 v-6" fill="none" stroke={flow.gridPresent ? SOLAR_COLOURS.grid : SOLAR_COLOURS.muted} strokeWidth="3" strokeLinecap="round" />
      {flow.gridPresent && <path className="sl-spark" d="M18 -20 l-6 10 h8 l-6 10" fill="none" stroke="#ffe08a" strokeWidth="2.2" strokeLinecap="round" />}
    </NodeBadge>
    <NodeBadge at={NODES.load} colour={SOLAR_COLOURS.load} label={t("solarLoad")} value={formatPower(flow.loadW)}>
      <path d="M-24 4 L0 -22 L24 4 M-18 0 v22 h36 v-22" fill="none" stroke="#00e5ff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="-5" y="8" width="10" height="14" fill="#00e5ff" opacity=".8" />
    </NodeBadge>
    <NodeBadge at={NODES.battery} colour={batteryColour} label={t("solarBattery")} value={`${inverter.battery_percent.toFixed(0)} % · ${formatPower(flow.batteryW)}`}>
      <rect x="-14" y="-20" width="28" height="42" rx="5" fill="none" stroke={batteryColour} strokeWidth="3" />
      <rect x="-6" y="-26" width="12" height="6" rx="2" fill={batteryColour} />
      <rect x="-10" y={22 - 38 * Math.min(1, inverter.battery_percent / 100)} width="20" height={38 * Math.min(1, inverter.battery_percent / 100)} rx="2" fill={batteryColour} opacity=".8" className="sl-level" />
    </NodeBadge>
  </svg>;
}

// ---- the battery with its liquid --------------------------------------------------------------------------------------------------------

/** A big battery whose liquid level is the state of charge, with waves on top, arrows that rise while it charges or fall while it discharges, and the number in the middle. */
export function BatteryGraphic({ percent, state, alarm = false, size = 150 }: { percent: number | undefined; state?: "charging" | "discharging" | "idle"; alarm?: boolean; size?: number }) {
  const id = useId();
  const level = percent === undefined ? 0 : Math.min(100, Math.max(0, percent)), tone = alarm ? "bad" : levelTone(level), colour = TONE_COLOUR[tone];
  const top = 20 + (1 - level / 100) * 152;
  return <svg className="sl-battery" width={size} height={size * 1.45} viewBox="0 0 120 174" role="img" aria-label={percent === undefined ? "?" : `${level} %`}>
    <defs>
      <clipPath id={`${id}-body`}><rect x="10" y="14" width="100" height="152" rx="16" /></clipPath>
      <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colour} stopOpacity=".95" /><stop offset="1" stopColor={colour} stopOpacity=".55" /></linearGradient>
    </defs>
    <rect x="42" y="2" width="36" height="12" rx="4" fill={colour} />
    <rect x="10" y="14" width="100" height="152" rx="16" fill="#08171f" stroke={colour} strokeWidth="3" className={alarm ? "sl-alarm" : undefined} />
    <g clipPath={`url(#${id}-body)`}>
      <g className="sl-liquid" style={{ transform: `translateY(${top - 20}px)` }}>
        <path className="sl-slosh" d="M-40 20 q15 -9 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 V190 H-40 Z" fill={`url(#${id}-fill)`} />
        <path className="sl-slosh slow" d="M-30 24 q15 -7 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 V190 H-30 Z" fill={colour} opacity=".35" />
      </g>
      {state === "charging" && [0, 1, 2].map(i => <path key={i} className="sl-rise" style={{ animationDelay: `${i * 0.5}s` }} d={`M${34 + i * 26} 150 l8 -12 l8 12`} fill="none" stroke="#eafff8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
      {state === "discharging" && [0, 1, 2].map(i => <path key={i} className="sl-fall" style={{ animationDelay: `${i * 0.5}s` }} d={`M${34 + i * 26} 40 l8 12 l8 -12`} fill="none" stroke="#eafff8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
    </g>
    <text x="60" y="98" textAnchor="middle" className="sl-battery-percent">{percent === undefined ? "–" : `${Math.round(level)}`}<tspan className="sl-battery-unit">%</tspan></text>
  </svg>;
}

// ---- gauges ----------------------------------------------------------------------------------------------------------------------------

/** A half-ring gauge that sweeps to its value. */
export function Gauge({ value, max, label, display, colour }: { value: number; max: number; label: string; display: string; colour: string }) {
  const fraction = Math.min(1, Math.max(0, max > 0 ? value / max : 0)), arc = Math.PI * 46;
  return <div className="sl-gauge">
    <svg viewBox="0 0 120 76" role="img" aria-label={`${label} ${display}`}>
      <path d="M14 66 A46 46 0 0 1 106 66" fill="none" stroke="#173846" strokeWidth="10" strokeLinecap="round" />
      <path d="M14 66 A46 46 0 0 1 106 66" fill="none" stroke={colour} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${arc * fraction} ${arc}`} className="sl-gauge-arc" />
      <text x="60" y="58" textAnchor="middle" className="sl-gauge-value">{display}</text>
    </svg>
    <small>{label}</small>
  </div>;
}

// ---- charts ----------------------------------------------------------------------------------------------------------------------------

const CHART = { width: 720, height: 210, left: 46, right: 12, top: 10, bottom: 26 };

/** A history chart of one or two kinds of number: lines with the first series filled, a grid, a clock axis and a cursor that reads the nearest sample. */
export function LineChart({ samples, series, from, to, t, empty, decimals = 0 }: { samples: readonly SolarSample[]; series: readonly ChartSeries[]; from: number; to: number; t: Translate; empty?: string; decimals?: number }) {
  const [cursor, setCursor] = useState<number | null>(null);
  const inner = { width: CHART.width - CHART.left - CHART.right, height: CHART.height - CHART.top - CHART.bottom };
  const values = series.flatMap(item => samples.filter(sample => sample.t >= from && sample.t <= to).map(sample => sample[item.key]).filter((v): v is number => typeof v === "number"));
  const scale = niceScale(values);
  const ticks = timeTicks(from, to), rows: number[] = [];
  const axisDigits = Math.max(0, Math.min(4, Math.ceil(-Math.log10(scale.step) - 1e-9)));
  for (let v = scale.low; v <= scale.high + scale.step / 2; v += scale.step) rows.push(Number(v.toFixed(6)));
  const lines = series.map(item => ({ item, points: seriesPoints(samples, item.key, from, to, scale, inner.width, inner.height) }));
  if (values.length < 2) return <div className="sl-chart-empty">{empty ?? t("solarNoHistory")}</div>;
  const at = cursor === null ? undefined : nearestSample(samples, from + (cursor / inner.width) * (to - from));
  const clock = (time: number) => (to - from > 36 * 3_600_000 ? new Date(time).toLocaleDateString([], { day: "2-digit", month: "2-digit" }) : new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * CHART.width - CHART.left;
    setCursor(x < 0 || x > inner.width ? null : x);
  };
  return <div className="sl-chart">
    <div className="sl-chart-legend">{series.map(item => <span key={item.key}><i style={{ background: item.color }} />{item.label}{at && typeof at[item.key] === "number" ? <b> {(at[item.key] as number).toFixed(decimals)} {item.unit}</b> : null}</span>)}{at ? <em>{clock(at.t)}</em> : null}</div>
    <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} onPointerMove={move} onPointerLeave={() => setCursor(null)} role="img">
      <g transform={`translate(${CHART.left} ${CHART.top})`}>
        {rows.map(v => { const y = inner.height - ((v - scale.low) / (scale.high - scale.low)) * inner.height; return <g key={v}><line x1="0" x2={inner.width} y1={y} y2={y} className="sl-grid" /><text x="-8" y={y + 4} textAnchor="end" className="sl-axis">{v.toFixed(axisDigits)}</text></g>; })}
        {ticks.map(tick => { const x = ((tick - from) / (to - from)) * inner.width; return <g key={tick}><line x1={x} x2={x} y1="0" y2={inner.height} className="sl-grid faint" /><text x={x} y={inner.height + 18} textAnchor="middle" className="sl-axis">{clock(tick)}</text></g>; })}
        {lines.map(({ item, points }, index) => <g key={item.key}>
          {index === 0 && points.length > 1 && <path d={areaOf(points, inner.height)} fill={item.color} opacity=".14" />}
          <path d={pathOf(points)} fill="none" stroke={item.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" className="sl-line" />
        </g>)}
        {at && cursor !== null && <g>
          <line x1={cursor} x2={cursor} y1="0" y2={inner.height} className="sl-cursor" />
          {lines.map(({ item }) => typeof at[item.key] === "number" ? <circle key={item.key} cx={((at.t - from) / (to - from)) * inner.width} cy={inner.height - (((at[item.key] as number) - scale.low) / (scale.high - scale.low)) * inner.height} r="4.5" fill={item.color} stroke="#04131a" strokeWidth="2" /> : null)}
        </g>}
      </g>
    </svg>
  </div>;
}

// ---- the cells of a module --------------------------------------------------------------------------------------------------------------

/** One bar per cell: its height is the voltage, its colour how far it is from its neighbours, and the lowest and highest cell are marked. */
export function CellBars({ cells, t }: { cells: readonly number[]; t: Translate }) {
  const stats = cellStats(cells);
  if (!stats) return null;
  return <div className="sl-cells" role="group" aria-label={t("solarCells")}>
    {cells.map((v, i) => {
      const tone = cellTone(v, stats.mean);
      return <div key={i} className={`sl-cell ${tone} ${i === stats.minIndex && stats.spreadMv > 0 ? "lowest" : ""} ${i === stats.maxIndex && stats.spreadMv > 0 ? "highest" : ""}`} title={`${i + 1}: ${v.toFixed(3)} V`}>
        <span className="sl-cell-volts">{v.toFixed(3)}</span>
        <span className="sl-cell-track"><i style={{ height: `${Math.round(cellFill(v) * 100)}%`, background: TONE_COLOUR[tone] }} /></span>
        <span className="sl-cell-n">{i + 1}</span>
      </div>;
    })}
  </div>;
}

// ---- the energy of each day ---------------------------------------------------------------------------------------------------------

/** Day by day bars, one group per day with one bar for each series (kilowatt-hours); the day is read off the bar under the pointer. */
export function EnergyBars({ days, series, t }: { days: ReadonlyArray<{ date: string } & Record<string, number | string>>; series: ReadonlyArray<{ key: string; label: string; color: string }>; t: Translate }) {
  const [at, setAt] = useState<number | null>(null);
  if (days.length === 0) return <div className="sl-chart-empty">{t("enNone")}</div>;
  const width = 720, height = 190, left = 40, bottom = 24, top = 8, inner = { width: width - left - 8, height: height - top - bottom };
  const high = niceScale([0, ...days.flatMap(day => series.map(item => Number(day[item.key]) || 0))]).high || 1;
  const slot = inner.width / days.length, bar = Math.max(2, Math.min(18, (slot - 4) / series.length));
  const shown = at === null ? undefined : days[at];
  return <div className="sl-chart">
    <div className="sl-chart-legend">{series.map(item => <span key={item.key}><i style={{ background: item.color }} />{item.label}{shown ? <b> {Number(shown[item.key]).toFixed(2)} kWh</b> : null}</span>)}{shown && <span className="muted">{shown.date}</span>}</div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" onPointerLeave={() => setAt(null)}>
      <g transform={`translate(${left} ${top})`}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => <g key={f}><line x1="0" x2={inner.width} y1={inner.height * (1 - f)} y2={inner.height * (1 - f)} className="sl-grid" /><text x="-6" y={inner.height * (1 - f) + 4} textAnchor="end" className="sl-axis">{(high * f).toFixed(high < 10 ? 1 : 0)}</text></g>)}
        {days.map((day, index) => <g key={day.date} onPointerMove={() => setAt(index)}>
          <rect x={index * slot} y="0" width={slot} height={inner.height} fill="transparent" />
          {series.map((item, k) => { const h = (Math.max(0, Number(day[item.key]) || 0) / high) * inner.height; return <rect key={item.key} x={index * slot + (slot - bar * series.length) / 2 + k * bar} y={inner.height - h} width={Math.max(1.5, bar - 1)} height={h} fill={item.color} rx="1.5" opacity={at === null || at === index ? 1 : 0.55} />; })}
          {(days.length <= 14 || index % Math.ceil(days.length / 10) === 0) && <text x={index * slot + slot / 2} y={inner.height + 16} textAnchor="middle" className="sl-axis">{String(day.date).slice(5)}</text>}
        </g>)}
      </g>
    </svg>
  </div>;
}
