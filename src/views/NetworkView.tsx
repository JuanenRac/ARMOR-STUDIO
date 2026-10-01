/**
 * The Network menu: the local network as the ARMOR-NETWORK nodes see it, and a panel to administer it. The state of the internet (and, when it fails, whether the fault is the
 * provider's or this side's), the public connection, every device found with what is known about it and the services that can be used on it, the traffic, and what changed.
 * From here an operator can sweep the network now, ping, trace the route to, wake up, or look at the ports and the web page of a device (the node does it and reports), name
 * devices, hide them from the list and ask to be told when one comes back; an administrator marks the ones that are known, which quiets the alarm of a new device.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useMemo, useState } from "react";
import { forgetDeviceNote, listNetwork, readNetworkHistory, saveDeviceNote } from "../api";
import { ViewTabs } from "../components/ViewTabs";
import type { Translate } from "../components/camera";
import { usePolled } from "../hooks";
import { MenuTitle } from "../menuLogos";
import {
  KIND_ICON, NETWORK_KINDS, RISKY_PORTS, deviceName, describeEvent, eventTone, filterDevices, formatAgo, formatBps, formatDateTime, formatDuration, formatTime, internetTone, isKnown,
  kindOf, lastOf, linePath, type NetworkDevice, type NetworkNode, type NetworkOverview, type NetworkSample,
} from "../networkModel";
import { servicesOf, useNetworkOrders, type OrderState } from "../networkOrders";
import "./network.css";

type Tab = "devices" | "services" | "internet" | "traffic" | "events";
type Give = ReturnType<typeof useNetworkOrders>["give"];

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

/** Why an order could not be given, in words. */
const orderError = (t: Translate, code: string | undefined) => {
  const key = `no_err_${code ?? "generic"}`, text = t(key);
  return text === key ? `${t("no_err_generic")} ${code ?? ""}`.trim() : text;
};

/** What became of an order: waiting, the node's answer, or why it failed. */
function OrderResult({ t, state, label }: { t: Translate; state: OrderState | undefined; label: string }) {
  if (!state) return null;
  const result = state.order?.result;
  if (state.status === "sending" || state.status === "waiting") return <p className="net-order wait" role="status"><b>{label}</b> · {t("no_running")}</p>;
  if (state.status === "failed") return <p className="net-order bad" role="alert"><b>{label}</b> · {state.error === "expired" ? t("no_order_expired") : orderError(t, state.error)}</p>;
  return <div className={`net-order ${result?.ok ? "good" : "bad"}`} role="status">
    <p><b>{label}</b> · {result?.ok ? t("no_result_ok") : t("no_result_fail")}{result?.latency_ms !== undefined ? ` · ${result.latency_ms} ms` : ""}</p>
    {result?.output && <pre>{result.output}</pre>}
    {result?.ports && result.ports.length > 0 && <p className="net-chips">{result.ports.map(port => <span key={port.port} className={RISKY_PORTS.has(port.port) ? "risky" : ""}>{port.port}/{port.proto}{port.service ? ` ${port.service}` : ""}</span>)}</p>}
  </div>;
}

function copyText(text: string): Promise<boolean> {
  return navigator.clipboard?.writeText(text).then(() => true, () => false) ?? Promise.resolve(false);
}

function DeviceDetail({ t, origin, node, device, isAdmin, reload, now, close, states, give }: {
  t: Translate; origin: string; node: NetworkNode; device: NetworkDevice; isAdmin: boolean; reload: () => void; now: number; close: () => void; states: Record<string, OrderState>; give: Give;
}) {
  const note = device.note;
  const [name, setName] = useState(note?.name ?? ""), [notes, setNotes] = useState(note?.notes ?? ""), [trusted, setTrusted] = useState(note?.trusted === true), [kind, setKind] = useState(note?.kind ?? "");
  const [message, setMessage] = useState(""), [copied, setCopied] = useState("");
  useEffect(() => { setName(note?.name ?? ""); setNotes(note?.notes ?? ""); setTrusted(note?.trusted === true); setKind(note?.kind ?? ""); setMessage(""); }, [device.id, note?.updated_at]);   // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (work: () => Promise<unknown>) => { try { await work(); setMessage(t("net_saved")); reload(); } catch { setMessage(t("net_failed")); } };
  const save = () => act(() => saveDeviceNote(origin, device.id, { name, notes, kind, ...(isAdmin ? { trusted } : {}) }));
  const forget = () => act(() => forgetDeviceNote(origin, device.id));
  const key = (type: string) => `${type}:${device.id}`;
  const services = servicesOf(device);
  const web = services.find(service => service.href?.startsWith("http"));
  const copy = async (text: string) => { if (await copyText(text)) { setCopied(text); window.setTimeout(() => setCopied(""), 1500); } };
  const row = (label: string, value: string | undefined) => value ? <div><dt>{label}</dt><dd>{value}</dd></div> : null;
  return <aside className="net-detail stack-card">
    <header><h3>{KIND_ICON[kindOf(device)]} {deviceName(device)}</h3><button onClick={close} aria-label={t("close")}>×</button></header>
    <p className={`net-state ${device.online ? "on" : "off"}`}><i className="state-dot" /> {device.online ? t("net_online") : t("net_offline")} · {isKnown(device) ? t("net_known") : t("net_new")}{device.ip === node.interface.ip ? ` · ${t("net_this_machine")}` : ""}{note?.hidden ? ` · ${t("no_hidden_is")}` : ""}</p>
    <dl>
      {row(t("net_col_address"), device.ip)}{row(t("net_col_mac"), device.mac)}{device.randomized_mac && <div className="wide"><dt /><dd className="hint">{t("net_random_mac")}</dd></div>}
      {row(t("net_hostname"), device.hostname)}{row(t("net_col_maker"), device.vendor)}{row(t(`netkind_${device.kind ?? "unknown"}`) ? t("net_col_kind") : "", t(`netkind_${device.kind ?? "unknown"}`))}
      {row(t("net_os"), device.os)}{row(t("net_col_latency"), device.latency_ms !== undefined ? `${device.latency_ms} ms` : undefined)}
      {row(t("net_first_seen"), formatDateTime(device.first_seen_ms))}{row(t("net_col_seen"), `${formatDateTime(device.last_seen_ms)} (${formatAgo(device.last_seen_ms, now)})`)}
    </dl>
    <p className="net-copy">{device.ip && <button onClick={() => void copy(device.ip)}>{copied === device.ip ? t("no_copied") : `${t("no_copy")} IP`}</button>}{device.mac && <button onClick={() => void copy(device.mac!)}>{copied === device.mac ? t("no_copied") : `${t("no_copy")} MAC`}</button>}</p>

    <h4>{t("no_actions")}</h4>
    <div className="net-order-buttons">
      <button onClick={() => give(key("ping"), { type: "ping", device_id: device.id })}>{t("no_ping")}</button>
      <button onClick={() => give(key("traceroute"), { type: "traceroute", device_id: device.id })}>{t("no_traceroute")}</button>
      <button onClick={() => give(key("ports"), { type: "ports", device_id: device.id })}>{t("no_rescan_ports")}</button>
      <button onClick={() => give(key("http"), { type: "http", device_id: device.id, port: web ? web.port : 80 })}>{t("no_look_page")}</button>
      {device.mac && <button onClick={() => give(key("wake"), { type: "wake", device_id: device.id })}>{t("no_wake")}</button>}
    </div>
    {(["ping", "traceroute", "ports", "http", "wake"] as const).map(type => <OrderResult key={type} t={t} state={states[key(type)]} label={t(type === "ports" ? "no_rescan_ports" : type === "http" ? "no_look_page" : `no_${type}`)} />)}

    <h4>{t("net_ports")}</h4>
    {device.ports?.length ? <ul className="net-ports">{device.ports.map(port => <li key={`${port.proto}${port.port}`} className={RISKY_PORTS.has(port.port) ? "risky" : ""} title={RISKY_PORTS.has(port.port) ? t("net_risky_port") : undefined}>
      <b>{port.port}/{port.proto}</b> {port.service ?? ""}{port.banner ? <small> — {port.banner}</small> : null}</li>)}</ul> : <p className="muted">{t("net_no_ports")}</p>}
    {services.length > 0 && <>
      <h4>{t("no_services")}</h4>
      <ul className="net-services">{services.map(service => <li key={service.port} className={service.risky ? "risky" : ""}>
        <span>{service.labelKey === "no_svc_other" ? `${t("no_svc_other")} ${service.port}` : t(service.labelKey)} <small>:{service.port}</small></span>
        <span className="net-service-actions">
          {service.href && <a href={service.href} target="_blank" rel="noreferrer noopener">{t("no_open")}</a>}
          {service.command && <button onClick={() => void copy(service.command!)}>{copied === service.command ? t("no_copied") : `${t("no_copy")} ${service.command}`}</button>}
        </span></li>)}</ul>
    </>}
    {device.services?.length ? <><h4>{t("net_services")}</h4><p className="net-chips">{device.services.map(service => <span key={service}>{service}</span>)}</p></> : null}
    <p className="hint">{t("net_guess_note")}</p>

    <h4>{t("net_edit")}</h4>
    <div className="net-order-buttons">
      <button onClick={() => void act(() => saveDeviceNote(origin, device.id, { hidden: !note?.hidden }))}>{note?.hidden ? t("no_unhide") : t("no_hide")}</button>
      <button className={note?.watch ? "on" : ""} onClick={() => void act(() => saveDeviceNote(origin, device.id, { watch: !note?.watch }))}>{note?.watch ? t("no_unwatch") : t("no_watch")}</button>
    </div>
    {note?.watch && <p className="hint">{t("no_watching")}</p>}
    <form className="net-form" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label>{t("net_name")}<input value={name} maxLength={48} onChange={event => setName(event.target.value)} /></label>
      <label>{t("net_notes")}<textarea value={notes} maxLength={300} rows={3} onChange={event => setNotes(event.target.value)} /></label>
      <label>{t("net_kind_own")}<select value={kind} onChange={event => setKind(event.target.value)}><option value="">{t("net_kind_auto")}</option>{NETWORK_KINDS.map(item => <option key={item} value={item}>{t(`netkind_${item}`)}</option>)}</select></label>
      <label className="check"><input type="checkbox" checked={trusted} disabled={!isAdmin} onChange={event => setTrusted(event.target.checked)} /> {t("net_trusted")}</label>
      {!isAdmin && <p className="hint">{t("net_admin_only")}</p>}
      <div className="net-actions"><button className="primary" type="submit">{t("net_save")}</button>{note && <button type="button" onClick={() => void forget()}>{t("net_forget")}</button>}</div>
      {message && <p className="muted" role="status">{message}</p>}
    </form>
  </aside>;
}

export function NetworkView({ t, origin, isAdmin, overview, reload, now }: { t: Translate; origin: string; isAdmin: boolean; overview: NetworkOverview | null; reload: () => void; now: number }) {
  const [tab, setTab] = useState<Tab>("devices");
  const [query, setQuery] = useState(""), [kind, setKind] = useState(""), [onlyUnknown, setOnlyUnknown] = useState(false), [onlyOffline, setOnlyOffline] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const { states, give } = useNetworkOrders(origin, reload);
  // The list the page polls leaves the hidden devices out; asking to see them is a poll of its own.
  const withHidden = usePolled(() => showHidden ? listNetwork(origin, true) : Promise.resolve(null), 5000, `${origin}:${showHidden}`).data;
  const data = showHidden && withHidden ? withHidden : overview;
  const node = data?.nodes[0];
  const history = usePolled(() => node ? readNetworkHistory(origin, node.node_id, 60) : Promise.resolve({ samples: [] as NetworkSample[] }), 15000, `${origin}:${node?.node_id ?? ""}`).data;
  const samples = history?.samples ?? [];
  const devices = node?.devices ?? [];
  const shown = useMemo(() => filterDevices(devices, { query, kind, onlyUnknown, onlyOffline }), [devices, query, kind, onlyUnknown, onlyOffline]);
  const selectedDevice = devices.find(device => device.id === selected);
  const events = data?.events ?? [];
  const internet = node?.internet;
  const sweep = states.scan_now;
  const withPorts = useMemo(() => devices.filter(device => (device.ports?.length ?? 0) > 0), [devices]);

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
        <div><small>{t("net_devices")}</small><strong>{data!.totals.online}/{data!.totals.devices}</strong><em>{data!.totals.unknown} {t("net_not_known")}</em></div>
      </div>
      <div className="net-toolbar">
        <p className="muted net-meta">{t("net_interface")}: <b>{node.interface.name}</b> · {node.interface.ip} · {t("net_network")} {node.interface.cidr} · {t("net_router")} {node.interface.gateway ?? "—"}
          {node.public ? <> · {t("no_public_ip")} <b>{node.public.ip}</b></> : null}
          {node.scan ? ` · ${t("net_last_scan")}: ${formatTime(node.scan.last_ms)} (${node.scan.hosts} ${t("net_scan_hosts")})` : ""}</p>
        <button className="primary" disabled={node.stale || sweep?.status === "sending" || sweep?.status === "waiting"} onClick={() => give("scan_now", { type: "scan_now" })}>{t("no_scan_now")}</button>
      </div>
      {sweep && <p className={`net-order ${sweep.status === "failed" ? "bad" : sweep.status === "done" ? "good" : "wait"}`} role="status">
        {sweep.status === "failed" ? (sweep.error === "expired" ? t("no_order_expired") : orderError(t, sweep.error)) : sweep.status === "done" ? t("no_scan_done") : t("no_scan_waiting")}</p>}
      <ViewTabs tabs={[["devices", t("net_tab_devices")], ["services", t("no_tab_services")], ["internet", t("net_tab_internet")], ["traffic", t("net_tab_traffic")], ["events", t("net_tab_events")]] as const} active={tab} onChange={setTab} />

      {tab === "devices" && <div className={`net-devices ${selectedDevice ? "with-detail" : ""}`}>
        <div>
          <div className="devices-filters">
            <input type="search" value={query} placeholder={t("net_search")} onChange={event => setQuery(event.target.value)} />
            <select value={kind} onChange={event => setKind(event.target.value)}><option value="">{t("net_all_kinds")}</option>{NETWORK_KINDS.map(item => <option key={item} value={item}>{t(`netkind_${item}`)}</option>)}</select>
            <button className={onlyUnknown ? "on" : ""} onClick={() => setOnlyUnknown(value => !value)}>{t("net_only_unknown")}</button>
            <button className={onlyOffline ? "on" : ""} onClick={() => setOnlyOffline(value => !value)}>{t("net_only_offline")}</button>
            {((node.hidden ?? 0) > 0 || showHidden) && <button className={showHidden ? "on" : ""} onClick={() => setShowHidden(value => !value)}>{t("no_hidden_show")} ({node.hidden ?? 0})</button>}
          </div>
          <div className="net-table" role="table">
            <div className="net-row head" role="row"><span>{t("net_col_status")}</span><span>{t("net_col_name")}</span><span>{t("net_col_address")}</span><span>{t("net_col_kind")}</span><span>{t("net_col_maker")}</span><span>{t("net_col_ports")}</span><span>{t("net_col_seen")}</span></div>
            {shown.map(device => <button key={device.id} className={`net-row ${device.online ? "" : "off"} ${selected === device.id ? "active" : ""} ${isKnown(device) ? "" : "new"}`} role="row" onClick={() => setSelected(device.id === selected ? null : device.id)}>
              <span className="st"><i className={`state-dot ${device.online ? "normal" : "off"}`} title={device.online ? t("net_online") : t("net_offline")} /></span>
              <span className="nm"><b>{KIND_ICON[kindOf(device)]} {deviceName(device)}</b>{!isKnown(device) && <em>{t("net_new")}</em>}{device.note?.watch && <em>👁</em>}{device.note?.hidden && <em>{t("no_hidden_is")}</em>}</span>
              <span className="mono">{device.ip}<small>{device.mac ?? ""}</small></span>
              <span>{t(`netkind_${kindOf(device)}`)}</span>
              <span>{device.vendor ?? "—"}</span>
              <span className="pt">{(device.ports ?? []).slice(0, 6).map(port => <i key={port.port} className={RISKY_PORTS.has(port.port) ? "risky" : ""}>{port.port}</i>)}{(device.ports?.length ?? 0) > 6 ? <i>+{(device.ports?.length ?? 0) - 6}</i> : null}</span>
              <span>{device.online ? "" : formatAgo(device.last_seen_ms, now)}</span>
            </button>)}
            {shown.length === 0 && <p className="muted net-empty">{t("net_none_found")}</p>}
          </div>
        </div>
        {selectedDevice && <DeviceDetail t={t} origin={origin} node={node} device={selectedDevice} isAdmin={isAdmin} reload={reload} now={now} close={() => setSelected(null)} states={states} give={give} />}
      </div>}

      {tab === "services" && <article className="stack-card">
        <h3>{t("no_tab_services")}</h3>
        <p className="hint">{t("no_services_help")}</p>
        {withPorts.length === 0 ? <p className="muted">{t("no_services_none")}</p> : <div className="net-table small services" role="table">
          <div className="net-row head" role="row"><span>{t("no_for_device")}</span><span>{t("net_col_address")}</span><span>{t("no_services")}</span></div>
          {withPorts.map(device => <div className="net-row" role="row" key={device.id}>
            <span className="nm"><b>{KIND_ICON[kindOf(device)]} {deviceName(device)}</b></span>
            <span className="mono">{device.ip}</span>
            <span className="net-svc-list">{servicesOf(device).map(service => service.href
              ? <a key={service.port} className={service.risky ? "risky" : ""} href={service.href} target="_blank" rel="noreferrer noopener" title={service.risky ? t("net_risky_port") : undefined}>{service.labelKey === "no_svc_other" ? `${t("no_svc_other")} ${service.port}` : t(service.labelKey)} :{service.port}</a>
              : <span key={service.port} className={service.risky ? "risky" : ""} title={service.risky ? t("net_risky_port") : undefined}>{service.labelKey === "no_svc_other" ? `${t("no_svc_other")} ${service.port}` : t(service.labelKey)} :{service.port}</span>)}</span>
          </div>)}
        </div>}
      </article>}

      {tab === "internet" && <div className="net-grid">
        <article className="stack-card">
          <h3>{t("no_public_title")}</h3>
          {node.public ? <dl className="net-facts">
            <div><dt>{t("no_public_ip")}</dt><dd className="mono">{node.public.ip}</dd></div>
            {node.public.org && <div><dt>{t("no_public_provider")}</dt><dd>{node.public.org}</dd></div>}
            {(node.public.city || node.public.region || node.public.country) && <div><dt>{t("no_public_place")}</dt><dd>{[node.public.city, node.public.region, node.public.country].filter(Boolean).join(", ")}</dd></div>}
            {node.public.hostname && <div><dt>{t("no_public_host")}</dt><dd className="mono">{node.public.hostname}</dd></div>}
            {node.public.timezone && <div><dt>{t("no_public_timezone")}</dt><dd>{node.public.timezone}</dd></div>}
            <div><dt>{t("no_public_checked")}</dt><dd>{formatDateTime(node.public.checked_ms)} ({formatAgo(node.public.checked_ms, now)})</dd></div>
            {node.public.changed_ms !== undefined && <div><dt>{t("no_public_changed")}</dt><dd>{formatDateTime(node.public.changed_ms)}</dd></div>}
          </dl> : <p className="muted">{t("no_public_none")}</p>}
          <p className="hint">{t("no_public_note")}</p>
        </article>
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
          {data!.outages.length === 0 ? <p className="muted">{t("net_no_outages")}</p> : <div className="net-table small" role="table">
            <div className="net-row head" role="row"><span>{t("net_outage_when")}</span><span>{t("net_outage_len")}</span><span>{t("net_outage_kind")}</span></div>
            {data!.outages.map(outage => <div className="net-row" role="row" key={`${outage.started_ms}${outage.kind}`}><span>{formatDateTime(outage.started_ms)}</span><span>{formatDuration(outage.duration_s)}</span><span>{t(`net_outage_${outage.kind}`)}</span></div>)}
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
