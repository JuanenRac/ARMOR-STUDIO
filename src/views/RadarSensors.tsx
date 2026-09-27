/**
 * The configuration of the radars (LD2450 or LD2461) of the site: each one's name, which field node and channel reports for it, where it stands,
 * how high, which way it faces and how it is tilted, with the ignore zones that belong to it. The same data the designer edits, here
 * as a list because a radar is a piece of equipment to set up, not only a symbol on a plan. Adding and deleting work here too.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState } from "react";
import type { Rules } from "../api";
import type { Translate } from "../components/camera";
import { headingOf, radarView, SENSOR_HEIGHT_M, toMetres, toPercent } from "../designer/model";
import { node270Sensors } from "../designer/node270";
import type { Dimensions, Sensor } from "../domain";
import type { NodeState } from "../types";
import "./radar-sensors.css";

type Props = {
  t: Translate; sensors: Sensor[]; dimensions: Dimensions; nodes: NodeState[]; rules: Rules | null; targetsBySensor: Record<string, number>;
  setSensors: (next: Sensor[]) => void; openZones: () => void; openDesigner: () => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, places = 2) => Math.round(value * 10 ** places) / 10 ** places;

function Field({ label, unit, value, min, max, step, onChange }: { label: string; unit?: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className="rs-field">{label}<span><input type="number" min={min} max={max} step={step} value={Number.isFinite(value) ? value : 0} onChange={event => { const next = Number(event.target.value); if (event.target.value !== "" && Number.isFinite(next)) onChange(clamp(next, min, max)); }} />{unit && <em>{unit}</em>}</span></label>;
}

export function RadarSensors({ t, sensors, dimensions, nodes, rules, targetsBySensor, setSensors, openZones, openDesigner }: Props) {
  const [open, setOpen] = useState(sensors[0]?.id ?? "");
  const [wizard, setWizard] = useState<{ name: string; node: string; heading: number; kind: Sensor["kind"] } | null>(null);
  const patch = (id: string, change: Partial<Sensor>) => setSensors(sensors.map(sensor => sensor.id === id ? { ...sensor, ...change } : sensor));
  const add = () => {
    let n = sensors.length + 1, id = `sensor-${String(n).padStart(2, "0")}`;
    while (sensors.some(sensor => sensor.id === id)) { n += 1; id = `sensor-${String(n).padStart(2, "0")}`; }
    setSensors([...sensors, { id, name: `${t("radarWord")} ${n}`, kind: "LD2450", x: 50, y: 50 }]);
    setOpen(id);
  };
  const addNode = () => {
    if (!wizard || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(wizard.node)) return;
    const made = node270Sensors(sensors, { name: wizard.name || wizard.node, node: wizard.node, x: 50, y: 50, heading: wizard.heading, kind: wizard.kind });
    setSensors([...sensors, ...made]);
    setOpen(made[1].id); setWizard(null);
  };
  const remove = (sensor: Sensor) => { if (window.confirm(`${t("confirmDeleteSensor")} ${sensor.name}`)) { setSensors(sensors.filter(item => item.id !== sensor.id)); setOpen(""); } };
  const zonesOf = (sensor: Sensor) => (rules?.zones ?? []).filter(zone => zone.node_id === sensor.node && (zone.sensor_id === undefined || zone.sensor_id === (sensor.channel ?? 0))).length;

  return <article className="stack-card radar-sensors">
    <header className="rs-head"><div><p className="eyebrow">LD2450 · LD2461</p><h3>{t("radarsOfDesign")}</h3></div><div className="rs-head-actions"><button onClick={() => setWizard(wizard ? null : { name: "", node: nodes[0]?.node_id ?? "", heading: 90, kind: "LD2450" })}>{t("addNode270")}</button><button className="primary" onClick={add}>{t("addRadar")}</button></div></header>
    {wizard && <section className="rs-card open"><div className="rs-body">
      <p className="muted small">{t("node270Help")}</p>
      <div className="rs-grid">
        <label className="rs-field wide">{t("node270Name")}<input value={wizard.name} maxLength={60} onChange={event => setWizard({ ...wizard, name: event.target.value })} /></label>
        <label className="rs-field wide" title={t("sensorNodeHelp")}>{t("sensorNode")}<input list="rs-node-ids" value={wizard.node} maxLength={64} placeholder="perimetro-1" onChange={event => setWizard({ ...wizard, node: event.target.value.trim().toLowerCase() })} /><datalist id="rs-node-ids">{nodes.map(item => <option key={item.node_id} value={item.node_id} />)}</datalist></label>
        <label className="rs-field">{t("sensorModel")}<select value={wizard.kind} onChange={event => setWizard({ ...wizard, kind: event.target.value === "LD2461" ? "LD2461" : "LD2450" })}><option value="LD2450">LD2450</option><option value="LD2461">LD2461</option></select></label>
        <Field label={t("node270Heading")} unit="°" min={0} max={359} step={5} value={wizard.heading} onChange={value => setWizard({ ...wizard, heading: Math.round(value) })} />
      </div>
      <div className="rs-actions"><button className="primary" disabled={!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(wizard.node)} onClick={addNode}>{t("node270Create")}</button><button onClick={() => setWizard(null)}>{t("cancel")}</button></div>
    </div></section>}
    <p className="muted small">{t("radarSetupHelp")}</p>
    {sensors.length === 0 && <p className="muted">{t("noRadarsYet")}</p>}
    {sensors.map(sensor => {
      const at = toMetres(sensor, dimensions), node = nodes.find(item => item.node_id === sensor.node), isOpen = open === sensor.id;
      const state = !sensor.node ? "unwired" : !node ? "offline" : node.stale ? "stale" : node.online ? "online" : "offline";
      return <section key={sensor.id} className={`rs-card ${isOpen ? "open" : ""}`}>
        <button className="rs-summary" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? "" : sensor.id)}>
          <span className={`rs-dot ${state}`} />
          <span className="rs-title"><strong>{sensor.name}</strong><small>{sensor.node ? `${sensor.node}${sensor.channel ? ` · #${sensor.channel}` : ""} · ${t(`radarState_${state}`)}` : t("notWired")}</small></span>
          <span className="rs-meta">{targetsBySensor[sensor.id] ?? 0} {t("targetsShort")}{zonesOf(sensor) ? ` · ${zonesOf(sensor)} ${t("zonesShort")}` : ""}</span>
          <span className="rs-chevron">{isOpen ? "▾" : "▸"}</span>
        </button>
        {isOpen && <div className="rs-body">
          <div className="rs-grid">
            <label className="rs-field wide">{t("deviceName")}<input value={sensor.name} maxLength={80} onChange={event => patch(sensor.id, { name: event.target.value })} /></label>
            <label className="rs-field">{t("sensorModel")}<select value={sensor.kind} onChange={event => patch(sensor.id, { kind: event.target.value === "LD2461" ? "LD2461" : "LD2450" })}><option value="LD2450">LD2450</option><option value="LD2461">LD2461</option></select></label>
            <label className="rs-field wide" title={t("sensorNodeHelp")}>{t("sensorNode")}
              <select value={sensor.node ?? ""} onChange={event => patch(sensor.id, { node: event.target.value || undefined, channel: event.target.value ? sensor.channel : undefined })}>
                <option value="">{t("noNodeChosen")}</option>
                {nodes.map(item => <option key={item.node_id} value={item.node_id}>{item.node_id}</option>)}
                {sensor.node && !nodes.some(item => item.node_id === sensor.node) && <option value={sensor.node}>{sensor.node}</option>}
              </select>
            </label>
            <Field label={t("sensorChannel")} min={0} max={255} step={1} value={sensor.channel ?? 0} onChange={value => patch(sensor.id, { channel: Math.round(value) || undefined })} />
            <Field label="X" unit="m" min={0} max={dimensions.width} step={0.1} value={round(at.x)} onChange={value => patch(sensor.id, toPercent({ x: value, y: at.y }, dimensions))} />
            <Field label="Y" unit="m" min={0} max={dimensions.depth} step={0.1} value={round(at.y)} onChange={value => patch(sensor.id, toPercent({ x: at.x, y: value }, dimensions))} />
            <Field label={t("mountHeight")} unit="m" min={0} max={100} step={0.1} value={sensor.z ?? SENSOR_HEIGHT_M} onChange={value => patch(sensor.id, { z: round(value) })} />
            <Field label={t("deviceHeading")} unit="°" min={0} max={359} step={5} value={Math.round(headingOf(sensor, dimensions))} onChange={value => patch(sensor.id, { heading: ((Math.round(value) % 360) + 360) % 360 })} />
            <Field label={t("tiltDown")} unit="°" min={-90} max={90} step={5} value={sensor.tilt ?? 0} onChange={value => patch(sensor.id, { tilt: value || undefined })} />
            <label className="rs-check"><input type="checkbox" checked={sensor.mirror === true} onChange={event => patch(sensor.id, { mirror: event.target.checked || undefined })} /> {t("sensorMirror")}</label>
          </div>
          <p className="muted small">{t("radarRated")} {radarView(sensor).rangeM} m, ±{radarView(sensor).halfAngleDeg}°. {t("radarMountNote")}</p>
          <div className="rs-actions">
            <button onClick={openZones}>{t("ignoreZonesOf")} ({zonesOf(sensor)})</button>
            <button onClick={openDesigner}>{t("openDesigner")}</button>
            <button className="danger-button" onClick={() => remove(sensor)}>{t("deleteSensor")}</button>
          </div>
        </div>}
      </section>;
    })}
    <p className="muted small">{t("radarHardwareNote")}</p>
  </article>;
}
