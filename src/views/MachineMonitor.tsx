/**
 * The live view of the machine the server runs on, as a task manager shows it: the processor, the memory, the temperatures, the network cards and the disks (the card, a USB
 * disk, an NVMe over PCIe), with charts of the last five minutes. The numbers come from ARMOR-SERVER's /api/v1/system/metrics, sampled every two seconds.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { readMetrics, type MachineMetrics } from "../api";
import type { Translate } from "../components/camera";
import { usePolled } from "../hooks";
import { formatBps, lastOf, linePath } from "../networkModel";
import "./machine.css";

const bytes = (value: number): string => value >= 1e12 ? `${(value / 1e12).toFixed(2)} TB` : value >= 1e9 ? `${(value / 1e9).toFixed(1)} GB` : value >= 1e6 ? `${(value / 1e6).toFixed(0)} MB` : `${Math.round(value / 1e3)} kB`;
const clampPercent = (value: number): number => Math.max(0, Math.min(100, value));

/** A line over the last samples, filled under, with its latest value. */
export function LiveChart({ title, values, unit, colour, max, text, empty }: { title: string; values: ReadonlyArray<number | null | undefined>; unit: string; colour: string; max?: number; text?: (value: number) => string; empty: string }) {
  const width = 360, height = 84;
  const series = values.map(value => value ?? undefined);
  const { d } = linePath(series, width, height, 0, max);
  const last = lastOf(series);
  const area = d ? `${d} L ${width} ${height} L 0 ${height} Z` : "";
  return <figure className="live-chart">
    <figcaption><span>{title}</span><b>{last === undefined ? "—" : text ? text(last) : `${Math.round(last * 10) / 10} ${unit}`}</b></figcaption>
    {d ? <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={title}>
      <path d={area} fill={colour} opacity=".16" stroke="none" />
      <path d={d} fill="none" stroke={colour} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg> : <p className="muted">{empty}</p>}
  </figure>;
}

function Meter({ label, used, total, detail }: { label: string; used: number; total: number; detail: string }) {
  const percent = total > 0 ? clampPercent((used / total) * 100) : 0;
  return <div className="meter"><div className="meter-head"><span>{label}</span><b>{detail}</b></div><div className="meter-bar"><i className={percent > 90 ? "hot" : percent > 75 ? "warm" : ""} style={{ width: `${percent}%` }} /></div></div>;
}

export function MachineMonitor({ t, origin }: { t: Translate; origin: string }) {
  const poll = usePolled(() => readMetrics(origin), 2000, origin);
  const metrics: MachineMetrics | null = poll.data;
  if (!metrics) return <article className="stack-card machine-card"><h3>{t("sm_title")}</h3><p className="muted">{poll.failed ? t("sm_unavailable") : t("sm_collecting")}</p></article>;
  const history = metrics.history;
  const hottest = metrics.temperatures.length ? Math.max(...metrics.temperatures.map(item => item.celsius)) : null;
  const memoryPercent = metrics.memory.total ? (metrics.memory.used / metrics.memory.total) * 100 : 0;
  const rx = metrics.network.reduce((sum, item) => sum + (item.rx_bps ?? 0), 0), tx = metrics.network.reduce((sum, item) => sum + (item.tx_bps ?? 0), 0);
  const empty = t("sm_collecting");
  return <article className="stack-card machine-card">
    <h3>{t("sm_title")}</h3>
    <p className="hint">{t("sm_help")}</p>
    <div className="machine-tiles">
      <div><small>{t("sm_cpu")}</small><strong>{metrics.cpu.percent === null ? "—" : `${metrics.cpu.percent} %`}</strong><em>{metrics.cpu.cores} {t("sm_cores")}{metrics.cpu.mhz ? ` · ${metrics.cpu.mhz} MHz` : ""} · {t("sm_load")} {metrics.cpu.load[0]}</em></div>
      <div><small>{t("sm_memory")}</small><strong>{Math.round(memoryPercent)} %</strong><em>{bytes(metrics.memory.used)} / {bytes(metrics.memory.total)}</em></div>
      <div><small>{t("sm_temperature")}</small><strong className={hottest !== null && hottest >= 80 ? "hot" : hottest !== null && hottest >= 70 ? "warm" : ""}>{hottest === null ? "—" : `${hottest} °C`}</strong><em>{metrics.temperatures.length} {t("sm_temperatures").toLowerCase()}</em></div>
      <div><small>{t("sm_network")}</small><strong>{formatBps(rx)}</strong><em>↑ {formatBps(tx)}</em></div>
    </div>
    <div className="machine-charts">
      <LiveChart title={`${t("sm_cpu")} (${t("sm_last5")})`} values={history.map(point => point.cpu)} unit="%" colour="#22d3ee" max={100} empty={empty} />
      <LiveChart title={t("sm_memory")} values={history.map(point => point.memory)} unit="%" colour="#a78bfa" max={100} empty={empty} />
      <LiveChart title={t("sm_temperature")} values={history.map(point => point.temperature)} unit="°C" colour="#ffb020" empty={empty} />
      <LiveChart title={`${t("sm_network")} · ${t("sm_rx")}`} values={history.map(point => point.rx_bps)} unit="" colour="#5df0c4" text={formatBps} empty={empty} />
      <LiveChart title={`${t("sm_network")} · ${t("sm_tx")}`} values={history.map(point => point.tx_bps)} unit="" colour="#f472b6" text={formatBps} empty={empty} />
    </div>
    <div className="machine-columns">
      <section>
        <h4>{t("sm_disks")}</h4>
        {metrics.disks.length === 0 ? <p className="muted">{t("sm_no_disks")}</p> : metrics.disks.map(disk => <Meter key={disk.device} label={`${t(`sm_disk_${disk.kind}`)} · ${disk.mount}`} used={disk.used} total={disk.total} detail={`${bytes(disk.used)} / ${bytes(disk.total)} · ${disk.fs}`} />)}
        {metrics.memory.swap_total > 0 && <Meter label={t("sm_swap")} used={metrics.memory.swap_used} total={metrics.memory.swap_total} detail={`${bytes(metrics.memory.swap_used)} / ${bytes(metrics.memory.swap_total)}`} />}
      </section>
      <section>
        <h4>{t("sm_network_cards")}</h4>
        <ul className="machine-list">{metrics.network.map(card => <li key={card.name}><span><i className={`state-dot ${card.up ? "normal" : "off"}`} /> <b>{card.name}</b> <small>{card.up ? t("sm_link_up") : t("sm_link_down")}</small></span>
          <span>↓ {formatBps(card.rx_bps ?? 0)} · ↑ {formatBps(card.tx_bps ?? 0)}</span></li>)}</ul>
        <h4>{t("sm_temperatures")}</h4>
        {metrics.temperatures.length === 0 ? <p className="muted">{t("sm_no_temperature")}</p> : <ul className="machine-list">{metrics.temperatures.map(item => <li key={item.name}><span>{item.name}</span><b className={item.celsius >= 80 ? "hot" : item.celsius >= 70 ? "warm" : ""}>{item.celsius} °C</b></li>)}</ul>}
      </section>
    </div>
  </article>;
}
