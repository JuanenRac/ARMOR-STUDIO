/**
 * The Electrical menu: what the ARMOR-NODE-ELECTRICAL nodes measure, live. The totals of the house (the grid's power and energy, the nodes, the alarms), one card per node with
 * its channels (voltage, current, power, energy, frequency, power factor, whether the line is closed) and its transfer switches as their auxiliary contacts show them.
 * Read only: nothing here sends a command. It belongs with the Electrical Designer, where the same nodes are drawn into the diagram of the house.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { askConfirm } from "../askConfirm";
import { useMemo, useState } from "react";
import { listElectricalEnergy, commandDevice, electricalElements, electricalHistory, type ElectricalElement } from "../api";
import { KindIcon } from "../deviceKinds";
import { MenuLogo } from "../menuLogos";
import { DesignerLink } from "../components/DesignerLink";
import { usePolled } from "../hooks";
import { LineChart, SOLAR_COLOURS } from "../solarGraphics";
import type { ElectricalChannelReading, ElectricalNodeReading, ElectricalReadings, ElectricalSwitchReading } from "../api";
import type { Translate } from "../components/camera";
import type { Design } from "../electrical/model";
import { NodeFinder } from "../NodeFinder";
import type { NetworkOverview } from "../networkModel";
import { formatEnergy, formatPower } from "../solarModel";
import "./solar.css";
import "./electrical-live.css";
import { NodeToolsBar, NodeToolsFooter, panelFromNetwork, useNodeTools, type NodeTools } from "./NodeTools";

type Props = { openDevices?: () => void; t: Translate; origin: string; readings: ElectricalReadings | null; unreachable: boolean; design: Design; openDesigner: () => void; network?: NetworkOverview | null; now: number; isAdmin?: boolean };

const number = (value: number | undefined, digits: number, unit: string): string => (typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(digits)} ${unit}` : "–");
const ago = (iso: string, now: number): string => {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return Number.isFinite(s) ? (s < 90 ? `${s} s` : s < 5400 ? `${Math.round(s / 60)} min` : `${Math.round(s / 3600)} h`) : "–";
};

/** The ids of the nodes the diagram of the house has drawn (an element of the kind "node" carries the id of the node it stands for). */
export function drawnNodeIds(design: Design): Set<string> {
  const ids = new Set<string>();
  for (const element of design.elements) if (element.kind === "node") { const id = element.props["node_id"]; if (typeof id === "string" && id) ids.add(id.toLowerCase()); }
  return ids;
}

/** The energy of every channel for the last week, day by day, as the server adds it up from the meters' counters (a counter that wraps or is reset is taken into account). */
function ElectricalEnergyCard({ t, origin }: { t: Props["t"]; origin: string }) {
  const energy = usePolled(() => listElectricalEnergy(origin, 7), 60_000, origin).data;
  const rows = (energy?.channels ?? []).filter(item => item.days.some(day => day.kwh > 0));
  if (rows.length === 0) return null;
  const days = [...new Set(rows.flatMap(item => item.days.map(day => day.day)))].sort().slice(-7);
  return <article className="solar-card el-energy" data-tour="el-energy">
    <div className="solar-card-head"><h3>{t("elEnergyTitle")}</h3></div>
    <p className="muted">{t("elEnergyHelp")}</p>
    <div className="el-energy-table" role="table">
      <div className="el-energy-row head" role="row"><span>{t("elLiveChannel")}</span>{days.map(day => <span key={day}>{day.slice(5)}</span>)}</div>
      {rows.map(item => <div className="el-energy-row" role="row" key={`${item.node}/${item.channel}`}><span><b>{item.channel}</b> <small>{item.node}</small></span>
        {days.map(day => { const found = item.days.find(entry => entry.day === day); return <span key={day} title={found?.resets ? t("elEnergyReset") : undefined}>{found ? `${found.kwh.toFixed(2)}${found.resets ? " ↺" : ""}` : "–"}</span>; })}</div>)}
    </div>
  </article>;
}

export function ElectricalView({ openDevices, t, origin, readings, unreachable, design, openDesigner, network = null, now, isAdmin = false }: Props) {
  const nodes = readings?.nodes ?? [];
  const tools = useNodeTools(origin, isAdmin);
  const drawn = useMemo(() => drawnNodeIds(design), [design]);
  const totals = readings?.totals;
  return <div className="solar-view electrical-live">
    <header className="solar-head" data-tour="el-head">
      <MenuLogo kind="electrical" size={68} />
      <div className="solar-title"><p className="eyebrow">{t("navEnergy")}</p><h2>{t("electrical")}</h2><span className="muted">{t("electricalLiveHelp")}</span></div>
      {totals && <div className="solar-totals" data-tour="el-totals">
        <Tile label={t("elLiveGrid")} value={totals.grid_w === null ? "–" : `${totals.grid_estimated ? "≈ " : ""}${formatPower(totals.grid_w)}`} title={totals.grid_estimated ? t("elEstimatedTip") : undefined} />
        <Tile label={t("elLiveEnergy")} value={totals.grid_kwh === null ? "–" : formatEnergy(totals.grid_kwh)} />
        <Tile label={t("elLiveNodes")} value={`${totals.nodes - totals.stale}/${totals.nodes}`} />
        <Tile label={t("elLiveAlarms")} value={String(totals.alarms)} bad={totals.alarms > 0} />
      </div>}
    </header>
    {unreachable && <p className="solar-notice bad">{t("elLiveUnreachable")}</p>}
    <DesignerLink title={t("elLiveRole")} text={t("elLiveRoleText")} button={t("elLiveOpenDesigner")} open={openDesigner} />
    <ElectricalEnergyCard t={t} origin={origin} />
    <ElectricalDevices t={t} origin={origin} openDevices={openDevices} now={now} />
    <NodeFinder t={t} origin={origin} network={network} wantKind="electrical" knownIds={nodes.map(node => node.node_id)} />
    {nodes.length === 0 ? <div className="solar-empty"><MenuLogo kind="electrical" size={92} /><h3>{t("elLiveNone")}</h3><p>{t("elLiveNoneHelp")}</p></div>
      : nodes.map(node => <NodeCard key={node.node_id} t={t} origin={origin} node={node} drawn={drawn.has(node.node_id.toLowerCase())} now={now} tools={tools} panel={panelFromNetwork(network, node.node_id)} />)}
    <NodeToolsFooter t={t} tools={tools} />
  </div>;
}

function Tile({ label, value, bad = false, title }: { label: string; value: string; bad?: boolean; title?: string }) {
  return <div className="solar-tile" title={title} style={{ borderColor: bad ? "#ff6f7988" : "#22d3ee55" }}><small>{label}</small><b style={{ color: bad ? "#ff8e99" : "#5df0c4" }}>{value}</b></div>;
}

function NodeCard({ t, origin, node, drawn, now, tools, panel }: { t: Translate; origin: string; node: ElectricalNodeReading; drawn: boolean; now: number; tools: NodeTools; panel: { ip: string; port: number } | null }) {
  const { channels, switches = [], switching_enabled: switching } = node.reading;
  return <article className={`el-node-card ${node.stale ? "stale" : ""}`}>
    <header>
      <strong>{node.node_id}</strong>
      <span className={`el-pill ${node.stale ? "bad" : "good"}`}>{node.stale ? t("solarNodeState_stale") : t("solarNodeState_reporting")} · {ago(node.received_at, now)}</span>
      <span className={`el-pill ${drawn ? "good" : "warn"}`}>{drawn ? t("elLiveDrawn") : t("elLiveNotDrawn")}</span>
      {switching === false && <span className="el-pill warn">{t("elLiveSwitchingOff")}</span>}
      <NodeToolsBar t={t} tools={tools} id={node.node_id} panel={panel} silent={node.stale} />
    </header>
    <div className="el-channels" role="table" data-tour="el-channels">
      <div className="el-row head" role="row"><span>{t("elLiveChannel")}</span><span>V</span><span>A</span><span>W</span><span>kWh</span><span>Hz</span><span>PF</span><span>{t("elLiveState")}</span></div>
      {channels.map(channel => <Channel key={channel.id} t={t} channel={channel} />)}
    </div>
    <ChannelHistory t={t} origin={origin} node={node} now={now} />
    {switches.length > 0 && <div className="el-switches">{switches.map(item => <Switch key={item.id} t={t} item={item} />)}</div>}
  </article>;
}

function Channel({ t, channel }: { t: Translate; channel: ElectricalChannelReading }) {
  return <div className={`el-row ${channel.alarm ? "alarm" : ""}`} role="row">
    <span><b>{channel.label ?? channel.id}</b><small>{channel.domain.toUpperCase()}{channel.reading_age_ms !== undefined ? ` · ${t("elReadingAge").replace("{0}", (channel.reading_age_ms / 1000).toFixed(1))}` : ""}{channel.errors ? ` · ${t("elReadErrors").replace("{0}", String(channel.errors))}` : ""}</small></span>
    <span>{number(channel.voltage_v, 1, "")}</span><span>{number(channel.current_a, 2, "")}</span><span title={channel.power_estimated ? t("elEstimatedTip") : undefined}>{channel.power_estimated && channel.power_w !== undefined ? "≈ " : ""}{number(channel.power_w, 0, "")}</span>
    <span>{number(channel.energy_kwh, 2, "")}</span><span>{number(channel.frequency_hz, 1, "")}</span><span>{number(channel.power_factor, 2, "")}</span>
    <span className={channel.alarm ? "fail" : channel.state === "open" ? "warn" : "ok"}>{channel.alarm ? (channel.alarm_code ?? t("elLiveAlarm")) : channel.state ? t(`elLive_${channel.state}`) : "–"}</span>
  </div>;
}

function Switch({ t, item }: { t: Translate; item: ElectricalSwitchReading }) {
  const fault = item.fault !== "none";
  return <div className={`el-switch ${fault ? "alarm" : ""}`}>
    <strong>{item.label ?? item.id}</strong>
    <span>{t("elLiveSelected")}: <b>{item.selected === "none" ? t("elLiveNoSource") : `${item.selected.toUpperCase()}${(item.selected === "a" ? item.source_a : item.source_b) ? ` (${item.selected === "a" ? item.source_a : item.source_b})` : ""}`}</b></span>
    <span>A: {item.a_closed ? t("elLive_closed") : t("elLive_open")} · B: {item.b_closed ? t("elLive_closed") : t("elLive_open")}</span>
    {item.closing && <span className="el-pill warn">{t("elLiveClosing")}</span>}
    {fault && <span className="el-pill bad">{t(`elLiveFault_${item.fault}`)}</span>}
  </div>;
}

const HISTORY_RANGES = [{ minutes: 60, key: "solarRange1" }, { minutes: 360, key: "solarRange6" }, { minutes: 1440, key: "solarRange24" }, { minutes: 10_080, key: "solarRange7" }, { minutes: 43_200, key: "solarRange30" }] as const;

/** The history of one channel of a node: power, voltage and current, over the last hour up to the last month. */
function ChannelHistory({ t, origin, node, now }: { t: Translate; origin: string; node: ElectricalNodeReading; now: number }) {
  const channels = node.reading.channels;
  const [chosen, setChosen] = useState("");
  const [minutes, setMinutes] = useState<number>(60);
  const channel = channels.find(item => item.id === chosen) ?? channels.find(item => item.id === "grid") ?? channels[0];
  const history = usePolled(() => (channel ? electricalHistory(origin, node.node_id, channel.id, minutes) : Promise.resolve(null)), 15_000, `${node.node_id}/${channel?.id}/${minutes}/${origin}`).data?.samples ?? [];
  if (!channel) return null;
  const from = now - minutes * 60_000;
  return <div className="el-history">
    <div className="solar-card-head"><h4>{t("elHistory")}</h4>
      {channels.length > 1 && <select value={channel.id} aria-label={t("elLiveChannel")} onChange={event => setChosen(event.target.value)}>{channels.map(item => <option key={item.id} value={item.id}>{item.label ?? item.id}</option>)}</select>}
      <div className="solar-ranges">{HISTORY_RANGES.map(range => <button key={range.minutes} className={minutes === range.minutes ? "active" : ""} onClick={() => setMinutes(range.minutes)}>{t(range.key)}</button>)}</div>
    </div>
    <LineChart t={t} samples={history} from={from} to={now} series={[{ key: "power_w", label: t("elPower"), color: SOLAR_COLOURS.pv, unit: "W" }]} />
    <LineChart t={t} samples={history} from={from} to={now} decimals={1} series={[{ key: "voltage_v", label: t("elVoltage"), color: SOLAR_COLOURS.load, unit: "V" }]} />
    <LineChart t={t} samples={history} from={from} to={now} decimals={2} series={[{ key: "current_a", label: t("elCurrent"), color: SOLAR_COLOURS.battery, unit: "A" }]} />
  </div>;
}

/** The devices of the house that measure or switch electricity (Zigbee plugs and breakers, meters, lights), next to the channels of the nodes' meters. */
function ElectricalDevices({ t, origin, openDevices, now }: { t: Translate; origin: string; openDevices?: () => void; now: number }) {
  const poll = usePolled(() => electricalElements(origin), 5000, origin);
  const [busy, setBusy] = useState("");
  const [problem, setProblem] = useState("");
  const data = poll.data;
  const send = async (element: ElectricalElement, command: "on" | "off") => {
    if (element.risk !== "low" && !(await askConfirm(t(element.risk === "critical" ? "confirmCritical" : "confirmCircuit"), t))) return;
    setBusy(element.id); setProblem("");
    try { await commandDevice(origin, element.id, command, element.risk !== "low"); poll.reload(); } catch (error) { setProblem(error instanceof Error ? error.message : "error"); }
    setBusy("");
  };
  return <section className="solar-nodes el-devices" data-tour="el-devices">
    <div className="solar-card-head"><h3>{t("elDevicesTitle")}</h3>
      {data && data.totals.elements > 0 && <span className="muted">{data.totals.online}/{data.totals.elements} · {formatPower(data.totals.power_w)} · {formatEnergy(data.totals.energy_kwh)}</span>}
      {openDevices && <button type="button" onClick={openDevices}>{t("elDevicesOpen")}</button>}
    </div>
    <p className="muted small">{t("elDevicesHelp")}</p>
    {problem && <p className="solar-notice bad" role="alert">{problem}</p>}
    {data && data.elements.length === 0 ? <p className="muted">{t("elDevicesNone")}</p> : <div className="el-device-list">
      {data?.elements.map(element => <article key={element.id} className={`el-device ${element.online ? "" : "stale"}`}>
        <span className="el-device-icon"><KindIcon kind={element.kind} size={22} /></span>
        <div className="el-device-title"><strong>{element.name}</strong><small>{t(`kind_${element.kind}`)}{element.location ? ` · ${element.location}` : ""} · {element.online ? ago(element.last_seen ?? "", now) : t("deviceOffline")}</small></div>
        <div className="el-device-values">
          {typeof element.on === "boolean" && <span className={`el-pill ${element.on ? "good" : "warn"}`}>{element.on ? t("elDevicesOn") : t("elDevicesOff")}</span>}
          {typeof element.power_w === "number" && <span>{formatPower(element.power_w)}</span>}
          {typeof element.voltage_v === "number" && <span>{element.voltage_v.toFixed(1)} V</span>}
          {typeof element.current_a === "number" && <span>{element.current_a.toFixed(2)} A</span>}
          {typeof element.energy_kwh === "number" && <span>{formatEnergy(element.energy_kwh)}</span>}
        </div>
        {element.switchable && <div className="el-device-actions">
          <button disabled={busy === element.id || !element.online} onClick={() => void send(element, "on")}>{t("elDevicesSwitchOn")}</button>
          <button className={element.risk === "low" ? "" : "danger"} disabled={busy === element.id || !element.online} onClick={() => void send(element, "off")}>{t("elDevicesSwitchOff")}</button>
        </div>}
      </article>)}
    </div>}
  </section>;
}
