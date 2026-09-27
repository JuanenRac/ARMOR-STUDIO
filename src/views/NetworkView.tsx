/**
 * The Network menu: the local network as the ARMOR-NETWORK nodes see it. The state of the internet (and, when it fails, whether the fault is the provider's or this side's),
 * every device found with what is known about it, the traffic, and what changed. An administrator names devices and marks the ones that are known, which is what quiets the
 * alarm of a new device. It only observes: nothing here sends anything to a device.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useMemo, useState } from "react";
import { forgetDeviceNote, readNetworkHistory, saveDeviceNote } from "../api";
import { ViewTabs } from "../components/ViewTabs";
import type { Translate } from "../components/camera";
import { usePolled } from "../hooks";
import { MenuTitle } from "../menuLogos";
import {
  KIND_ICON, NETWORK_KINDS, RISKY_PORTS, deviceName, describeEvent, eventTone, filterDevices, formatAgo, formatBps, formatDateTime, formatDuration, formatTime, internetTone, isKnown,
  kindOf, lastOf, linePath, type NetworkDevice, type NetworkNode, type NetworkOverview, type NetworkSample,
} from "../networkModel";
import "./network.css";

type Tab = "devices" | "internet" | "traffic" | "events";

function Chart({ t, title, values, unit, colour, max, empty }: { t: Translate; title: string; values: ReadonlyArray<number | undefined>; unit: string; colour: string; max?: number; empty: string }) {
  const width = 640, height = 120;
  const { d, min, max: top } = linePath(values, width, height, 0, max);
  const last = lastOf(values);
  return <figure className="net-chart">
    <figcaption><span>{title}</span><b>{last === undefined ? "—" : `${Math.round(last * 10) / 10} ${unit}`}</b></figcaption>
    {d ? <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={title}>
      <line x1="0" y1={height} x2={width} y2={height} className="axis" /><line x1="0" y1="0" x2={width} y2="0" className="axis dim" />
      <path d={d} fill="none" stroke={colour} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg> : <p className="muted">{empty}</p>}
    {d && <small><span>{Math.round(min * 10) / 10}</span><span>{Math.round(top * 10) / 10} {unit}</span></small>}
    <span className="sr-only">{t("net_chart_empty")}</span>
  </figure>;
}

function DeviceDetail({ t, origin, node, device, isAdmin, reload, now, close }: { t: Translate; origin: string; node: NetworkNode; device: NetworkDevice; isAdmin: boolean; reload: () => void; now: number; close: () => void }) {
  const note = device.note;
  const [name, setName] = useState(note?.name ?? ""), [notes, setNotes] = useState(note?.notes ?? ""), [trusted, setTrusted] = useState(note?.trusted === true), [kind, setKind] = useState(note?.kind ?? "");
  const [message, setMessage] = useState("");
  useEffect(() => { setName(note?.name ?? ""); setNotes(note?.notes ?? ""); setTrusted(note?.trusted === true); setKind(note?.kind ?? ""); setMessage(""); }, [device.id, note?.updated_at]);   // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    try { await saveDeviceNote(origin, device.id, { name, notes, trusted, kind }); setMessage(t("net_saved")); reload(); } catch { setMessage(t("net_failed")); }
  };
  const forget = async () => { try { await forgetDeviceNote(origin, device.id); setMessage(t("net_saved")); reload(); } catch { setMessage(t("net_failed")); } };
  const row = (label: string, value: string | undefined) => value ? <div><dt>{label}</dt><dd>{value}</dd></div> : null;
  return <aside className="net-detail stack-card">
    <header><h3>{KIND_ICON[kindOf(device)]} {deviceName(device)}</h3><button onClick={close} aria-label={t("close")}>×</button></header>
    <p className={`net-state ${device.online ? "on" : "off"}`}><i className="state-dot" /> {device.online ? t("net_online") : t("net_offline")} · {isKnown(device) ? t("net_known") : t("net_new")}{device.ip === node.interface.ip ? ` · ${t("net_this_machine")}` : ""}</p>
    <dl>
      {row(t("net_col_address"), device.ip)}{row(t("net_col_mac"), device.mac)}{device.randomized_mac && <div className="wide"><dt /><dd className="hint">{t("net_random_mac")}</dd></div>}
      {row(t("net_hostname"), device.hostname)}{row(t("net_col_maker"), device.vendor)}{row(t(`netkind_${device.kind ?? "unknown"}`) ? t("net_col_kind") : "", t(`netkind_${device.kind ?? "unknown"}`))}
      {row(t("net_os"), device.os)}{row(t("net_col_latency"), device.latency_ms !== undefined ? `${device.latency_ms} ms` : undefined)}
      {row(t("net_first_seen"), formatDateTime(device.first_seen_ms))}{row(t("net_col_seen"), `${formatDateTime(device.last_seen_ms)} (${formatAgo(device.last_seen_ms, now)})`)}
    </dl>
    <h4>{t("net_ports")}</h4>
    {device.ports?.length ? <ul className="net-ports">{device.ports.map(port => <li key={`${port.proto}${port.port}`} className={RISKY_PORTS.has(port.port) ? "risky" : ""} title={RISKY_PORTS.has(port.port) ? t("net_risky_port") : undefined}>
      <b>{port.port}/{port.proto}</b> {port.service ?? ""}{port.banner ? <small> — {port.banner}</small> : null}</li>)}</ul> : <p className="muted">{t("net_no_ports")}</p>}
    {device.services?.length ? <><h4>{t("net_services")}</h4><p className="net-chips">{device.services.map(service => <span key={service}>{service}</span>)}</p></> : null}
    <p className="hint">{t("net_guess_note")}</p>
    <h4>{t("net_edit")}</h4>
    {isAdmin ? <form className="net-form" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label>{t("net_name")}<input value={name} maxLength={48} onChange={event => setName(event.target.value)} /></label>
      <label>{t("net_notes")}<textarea value={notes} maxLength={300} rows={3} onChange={event => setNotes(event.target.value)} /></label>
      <label>{t("net_kind_own")}<select value={kind} onChange={event => setKind(event.target.value)}><option value="">{t("net_kind_auto")}</option>{NETWORK_KINDS.map(item => <option key={item} value={item}>{t(`netkind_${item}`)}</option>)}</select></label>
      <label className="check"><input type="checkbox" checked={trusted} onChange={event => setTrusted(event.target.checked)} /> {t("net_trusted")}</label>
      <div className="net-actions"><button className="primary" type="submit">{t("net_save")}</button>{note && <button type="button" onClick={() => void forget()}>{t("net_forget")}</button>}</div>
      {message && <p className="muted" role="status">{message}</p>}
    </form> : <p className="muted">{t("net_admin_only")}</p>}
  </aside>;
}

export function NetworkView({ t, origin, isAdmin, overview, reload, now }: { t: Translate; origin: string; isAdmin: boolean; overview: NetworkOverview | null; reload: () => void; now: number }) {
  const [tab, setTab] = useState<Tab>("devices");
  const [query, setQuery] = useState(""), [kind, setKind] = useState(""), [onlyUnknown, setOnlyUnknown] = useState(false), [onlyOffline, setOnlyOffline] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const node = overview?.nodes[0];
  const history = usePolled(() => node ? readNetworkHistory(origin, node.node_id, 60) : Promise.resolve({ samples: [] as NetworkSample[] }), 15000, `${origin}:${node?.node_id ?? ""}`).data;
  const samples = history?.samples ?? [];
  const devices = node?.devices ?? [];
  const shown = useMemo(() => filterDevices(devices, { query, kind, onlyUnknown, onlyOffline }), [devices, query, kind, onlyUnknown, onlyOffline]);
  const selectedDevice = devices.find(device => device.id === selected);
  const events = overview?.events ?? [];
  const internet = node?.internet;

  return <section className="network-view">
    <header className="devices-head"><MenuTitle kind="network"><p className="eyebrow">{t("net_title")}</p><h2>{t("network")}</h2><p className="muted">{t("net_help")}</p></MenuTitle></header>
    {!node && <p className="muted net-empty">{t("net_no_nodes")}</p>}
    {node && internet && <>
      {node.stale && <p className="net-warning" role="alert">{t("net_node_stale")}</p>}
      <div className={`net-hero ${internetTone(internet.state)}`}>
        <div className="net-state-card">
          <small>{t("net_internet")}</small>
          <strong>{t(`netstate_${internet.state}`)}</strong>
          {(internet.state === "down" || internet.state === "lan_down") && <p>{t(`netstate_hint_${internet.state}`)}</p>}
          {internet.since_ms !== undefined && <p className="muted">{t("net_since")} {formatDateTime(internet.since_ms)} ({formatAgo(internet.since_ms, now)})</p>}
        </div>
        <div><small>{t("net_latency")}</small><strong>{internet.latency_ms !== undefined ? `${internet.latency_ms} ms` : "—"}</strong></div>
        <div><small>{t("net_loss")}</small><strong>{internet.loss_percent !== undefined ? `${internet.loss_percent} %` : "—"}</strong></div>
        <div><small>{t("net_outages24")}</small><strong>{internet.outages_24h ?? 0}</strong></div>
        <div><small>{t("net_downtime24")}</small><strong>{formatDuration(internet.downtime_24h_s ?? 0)}</strong></div>
        <div><small>{t("net_devices")}</small><strong>{overview!.totals.online}/{overview!.totals.devices}</strong><em>{overview!.totals.unknown} {t("net_not_known")}</em></div>
      </div>
      <p className="muted net-meta">{t("net_interface")}: <b>{node.interface.name}</b> · {node.interface.ip} · {t("net_network")} {node.interface.cidr} · {t("net_router")} {node.interface.gateway ?? "—"}
        {node.scan ? ` · ${t("net_last_scan")}: ${formatTime(node.scan.last_ms)} (${node.scan.hosts} ${t("net_scan_hosts")})` : ""}</p>
      <ViewTabs tabs={[["devices", t("net_tab_devices")], ["internet", t("net_tab_internet")], ["traffic", t("net_tab_traffic")], ["events", t("net_tab_events")]] as const} active={tab} onChange={setTab} />

      {tab === "devices" && <div className={`net-devices ${selectedDevice ? "with-detail" : ""}`}>
        <div>
          <div className="devices-filters">
            <input type="search" value={query} placeholder={t("net_search")} onChange={event => setQuery(event.target.value)} />
            <select value={kind} onChange={event => setKind(event.target.value)}><option value="">{t("net_all_kinds")}</option>{NETWORK_KINDS.map(item => <option key={item} value={item}>{t(`netkind_${item}`)}</option>)}</select>
            <button className={onlyUnknown ? "on" : ""} onClick={() => setOnlyUnknown(value => !value)}>{t("net_only_unknown")}</button>
            <button className={onlyOffline ? "on" : ""} onClick={() => setOnlyOffline(value => !value)}>{t("net_only_offline")}</button>
          </div>
          <div className="net-table" role="table">
            <div className="net-row head" role="row"><span>{t("net_col_status")}</span><span>{t("net_col_name")}</span><span>{t("net_col_address")}</span><span>{t("net_col_kind")}</span><span>{t("net_col_maker")}</span><span>{t("net_col_ports")}</span><span>{t("net_col_seen")}</span></div>
            {shown.map(device => <button key={device.id} className={`net-row ${device.online ? "" : "off"} ${selected === device.id ? "active" : ""} ${isKnown(device) ? "" : "new"}`} role="row" onClick={() => setSelected(device.id === selected ? null : device.id)}>
              <span className="st"><i className={`state-dot ${device.online ? "normal" : "off"}`} title={device.online ? t("net_online") : t("net_offline")} /></span>
              <span className="nm"><b>{KIND_ICON[kindOf(device)]} {deviceName(device)}</b>{!isKnown(device) && <em>{t("net_new")}</em>}</span>
              <span className="mono">{device.ip}<small>{device.mac ?? ""}</small></span>
              <span>{t(`netkind_${kindOf(device)}`)}</span>
              <span>{device.vendor ?? "—"}</span>
              <span className="pt">{(device.ports ?? []).slice(0, 6).map(port => <i key={port.port} className={RISKY_PORTS.has(port.port) ? "risky" : ""}>{port.port}</i>)}{(device.ports?.length ?? 0) > 6 ? <i>+{(device.ports?.length ?? 0) - 6}</i> : null}</span>
              <span>{device.online ? "" : formatAgo(device.last_seen_ms, now)}</span>
            </button>)}
            {shown.length === 0 && <p className="muted net-empty">{t("net_none_found")}</p>}
          </div>
        </div>
        {selectedDevice && <DeviceDetail t={t} origin={origin} node={node} device={selectedDevice} isAdmin={isAdmin} reload={reload} now={now} close={() => setSelected(null)} />}
      </div>}

      {tab === "internet" && <div className="net-grid">
        <article className="stack-card">
          <h3>{t("net_probes")}</h3>
          <p className={`net-router ${internet.gateway_ok === false ? "bad" : "good"}`}><i className="state-dot" /> {t("net_router")} {node.interface.gateway ?? ""}: {internet.gateway_ok === false ? t("net_router_no") : t("net_router_ok")}</p>
          <div className="net-table small" role="table">
            <div className="net-row head" role="row"><span>{t("net_probe_target")}</span><span>{t("net_probe_kind")}</span><span>{t("net_probe_result")}</span></div>
            {(internet.probes ?? []).map(probe => <div className="net-row" role="row" key={`${probe.kind}${probe.target}`}><span className="mono">{probe.target}</span><span>{probe.kind.toUpperCase()}</span><span className={probe.ok ? "ok" : "fail"}>{probe.ok ? `${t("net_probe_ok")}${probe.latency_ms !== undefined ? ` · ${Math.round(probe.latency_ms)} ms` : ""}` : t("net_probe_fail")}</span></div>)}
          </div>
        </article>
        <article className="stack-card">
          <Chart t={t} title={t("net_chart_latency")} values={samples.map(sample => sample.latency_ms)} unit="ms" colour="#22d3ee" empty={t("net_chart_empty")} />
          <Chart t={t} title={t("net_chart_loss")} values={samples.map(sample => sample.loss_percent)} unit="%" colour="#ffb020" max={100} empty={t("net_chart_empty")} />
        </article>
        <article className="stack-card wide">
          <h3>{t("net_outages")}</h3>
          {overview!.outages.length === 0 ? <p className="muted">{t("net_no_outages")}</p> : <div className="net-table small" role="table">
            <div className="net-row head" role="row"><span>{t("net_outage_when")}</span><span>{t("net_outage_len")}</span><span>{t("net_outage_kind")}</span></div>
            {overview!.outages.map(outage => <div className="net-row" role="row" key={`${outage.started_ms}${outage.kind}`}><span>{formatDateTime(outage.started_ms)}</span><span>{formatDuration(outage.duration_s)}</span><span>{t(`net_outage_${outage.kind}`)}</span></div>)}
          </div>}
        </article>
      </div>}

      {tab === "traffic" && <div className="net-grid">
        <article className="stack-card">
          <div className="net-hero small"><div><small>{t("net_rx")}</small><strong>{formatBps(node.interface.rx_bps)}</strong></div><div><small>{t("net_tx")}</small><strong>{formatBps(node.interface.tx_bps)}</strong></div></div>
          <Chart t={t} title={t("net_chart_rx")} values={samples.map(sample => sample.rx_bps === undefined ? undefined : sample.rx_bps / 1e6)} unit="Mbit/s" colour="#5df0c4" empty={t("net_chart_empty")} />
          <Chart t={t} title={t("net_chart_tx")} values={samples.map(sample => sample.tx_bps === undefined ? undefined : sample.tx_bps / 1e6)} unit="Mbit/s" colour="#a78bfa" empty={t("net_chart_empty")} />
          <p className="hint">{t("net_traffic_note")}</p>
        </article>
      </div>}

      {tab === "events" && <article className="stack-card">
        <h3>{t("net_events")}</h3>
        {events.length === 0 ? <p className="muted">{t("net_no_events")}</p> : <ul className="net-events">
          {events.map(event => <li key={`${event.node_id}${event.id}`} className={eventTone(event)}><time>{formatDateTime(event.at_ms)}</time><span>{describeEvent(event, devices, t)}</span></li>)}
        </ul>}
      </article>}
    </>}
  </section>;
}
