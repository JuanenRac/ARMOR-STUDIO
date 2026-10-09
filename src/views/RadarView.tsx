/**
 * The radar view: the operator's own site design (terrain, buildings, cameras, radars with their coverage) with the targets the
 * radars report right now drawn where they stand, their recent path, and the ignore zones; and the field nodes beside it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { readRules, readStatus, type Rules } from "../api";
import { bounds, centroid, offsetPolygon } from "../designer/geometry";
import { arcPoints, cameraView, fitTransform, formatMetres, headingOf, radarView, sectorPoints, toMetres, type Point } from "../designer/model";
import type { SiteModel } from "../designer/ops";
import { placeTargets, updateTrails, zonePolygons, type Trails } from "../designer/radarMap";
import type { Dimensions, Sensor } from "../domain";
import { RadarSensors } from "./RadarSensors";
import { ViewTabs } from "../components/ViewTabs";
import type { NodeState } from "../types";
import type { Translate } from "../components/camera";
import "./radar-map.css";
import { MenuTitle } from "../menuLogos";
import { NodeFinder } from "../NodeFinder";
import type { NetworkOverview } from "../networkModel";

type Props = {
  nodes: NodeState[]; model: SiteModel; dimensions: Dimensions; origin: string;
  forget: (id: string) => void; openDesigner: () => void; openZones: () => void; setSensors: (next: Sensor[]) => void; t: Translate;
  /** What the network node has found, to look for radar nodes on the network. */
  network?: NetworkOverview | null;
};

const LIVE_MS = 800;
const COLOR = { review: "#ffb020", high: "#ff4d5e", normal: "#00e5ff" } as const;

/** The nodes as the server has them now: the view asks for them faster than the console does, so targets move smoothly. */
function useLiveNodes(origin: string, fallback: NodeState[]): NodeState[] {
  const [live, setLive] = useState<NodeState[] | null>(null);
  useEffect(() => {
    let cancelled = false, busy = false;
    const pull = async () => {
      if (busy) return;
      busy = true;
      try { const state = await readStatus(origin); if (!cancelled) setLive(Object.values(state.nodes).sort((a, b) => a.node_id.localeCompare(b.node_id))); } catch { /* the console's own refresh keeps the list */ }
      busy = false;
    };
    void pull();
    const timer = window.setInterval(() => void pull(), LIVE_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [origin]);
  return live ?? fallback;
}

/** The address of a node's own web panel (port 80 is left out). Only the numbers the server validated as an IPv4 address and a port reach here. */
export const panelUrl = (panel: { ip: string; port: number }): string => `http://${panel.ip}${panel.port === 80 ? "" : `:${panel.port}`}/`;

export function RadarView({ nodes: consoleNodes, model, dimensions, origin, forget, openDesigner, openZones, setSensors, t, network = null }: Props) {
  const nodes = useLiveNodes(origin, consoleNodes);
  const [rules, setRules] = useState<Rules | null>(null);
  useEffect(() => { void readRules(origin).then(setRules).catch(() => setRules(null)); }, [origin]);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 520 });
  const [view, setView] = useState<{ scale: number; x: number; y: number } | null>(null);
  const [trails, setTrails] = useState<Trails>(new Map());
  const [hover, setHover] = useState("");
  const [side, setSide] = useState<"radars" | "nodes">("radars");
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => { const rect = entries[0]?.contentRect; if (rect && rect.width > 0) setSize({ width: rect.width, height: rect.height }); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { placed, unmapped } = useMemo(() => placeTargets(nodes, model.sensors, dimensions), [nodes, model.sensors, dimensions]);
  const zones = useMemo(() => zonePolygons(rules?.zones ?? [], model.sensors, dimensions), [rules, model.sensors, dimensions]);
  useEffect(() => { setTrails(current => updateTrails(current, placed, Date.now())); }, [placed]);

  // What to frame: the terrain, the buildings and everything a radar can see.
  const content = useMemo(() => {
    const points: Point[] = [...model.terrain.points, ...model.buildings.flatMap(building => building.points)];
    for (const sensor of model.sensors) { const at = toMetres(sensor, dimensions); const reach = radarView(sensor).rangeM; points.push({ x: at.x - reach, y: at.y - reach }, { x: at.x + reach, y: at.y + reach }); }
    for (const camera of model.cameras) points.push(toMetres(camera, dimensions));
    const found = points.length ? bounds(points) : { minX: 0, minY: 0, maxX: dimensions.width, maxY: dimensions.depth };
    return { minX: found.minX - 1, minY: found.minY - 1, maxX: found.maxX + 1, maxY: found.maxY + 1 };
  }, [model, dimensions]);
  const fit = useMemo(() => fitTransform(content, size, 30), [content, size]);
  const current = view ?? fit;
  const P = (point: Point) => `${(current.x + point.x * current.scale).toFixed(1)},${(current.y - point.y * current.scale).toFixed(1)}`;
  const polygon = (points: readonly Point[]) => points.map(P).join(" ");
  const screen = (point: Point) => ({ x: current.x + point.x * current.scale, y: current.y - point.y * current.scale });

  const zoom = (factor: number, cx = size.width / 2, cy = size.height / 2) => setView(previous => {
    const base = previous ?? fit, scale = Math.min(400, Math.max(4, base.scale * factor)), ratio = scale / base.scale;
    return { scale, x: cx - (cx - base.x) * ratio, y: cy - (cy - base.y) * ratio };
  });

  const counted = placed.filter(target => target.counted).length;
  const targetsBySensor: Record<string, number> = {};
  for (const target of placed) targetsBySensor[target.sensorId] = (targetsBySensor[target.sensorId] ?? 0) + 1;

  return <section className="radar-view">
    <article className="radar-map-card">
      <header>
        <MenuTitle kind="radar"><p className="eyebrow">{t("radarFusion")}</p><h2>{t("radarMap")}</h2></MenuTitle>
        <div className="radar-map-stats"><span><b>{placed.length}</b> {t("targetsLive")}</span><span><b>{counted}</b> {t("legendCounted").toLowerCase()}</span></div>
      </header>
      <p className="muted">{t("radarMapHelp")}</p>
      <div ref={box} className="radar-map" onWheel={event => { event.preventDefault(); const rect = box.current!.getBoundingClientRect(); zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15, event.clientX - rect.left, event.clientY - rect.top); }}
        onPointerDown={event => { drag.current = { x: event.clientX, y: event.clientY, vx: current.x, vy: current.y }; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={event => { const start = drag.current; if (start) setView({ scale: current.scale, x: start.vx + event.clientX - start.x, y: start.vy + event.clientY - start.y }); }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <svg width={size.width} height={size.height} role="img" aria-label={t("radarMap")}>
          <defs><pattern id="zone-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#ff4d5e" strokeWidth="2" opacity=".55" /></pattern></defs>
          <polygon points={polygon(model.terrain.points)} className="rm-terrain" />
          {model.features.filter(feature => feature.kind === "road" || feature.kind === "path").map(feature => {
            const r = feature.rotation * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
            const corners = [[-feature.width / 2, -feature.depth / 2], [feature.width / 2, -feature.depth / 2], [feature.width / 2, feature.depth / 2], [-feature.width / 2, feature.depth / 2]].map(([dx, dy]) => ({ x: feature.x + dx * cos - dy * sin, y: feature.y + dx * sin + dy * cos }));
            return <polygon key={feature.id} points={polygon(corners)} className={feature.kind === "road" ? "rm-road" : "rm-path"} />;
          })}
          {model.buildings.map(building => {
            const centre = screen(centroid(building.points));
            return <g key={building.id}>
              <polygon points={polygon(offsetPolygon(building.points, building.thickness / 2))} className="rm-building" />
              <polygon points={polygon(building.points)} className="rm-building-in" />
              <text x={centre.x} y={centre.y} className="rm-name" textAnchor="middle">{building.name}</text>
            </g>;
          })}
          {zones.map((zone, index) => <polygon key={`${zone.id}-${zone.sensorId}-${index}`} points={polygon(zone.points)} className="rm-zone"><title>{`${t("legendZone")}: ${zone.name}`}</title></polygon>)}
          {model.cameras.map(camera => {
            const at = toMetres(camera, dimensions), heading = headingOf(camera, dimensions), p = screen(at);
            return <g key={camera.id} className={camera.enabled ? "" : "rm-off"}>
              <polygon points={polygon(sectorPoints(at, heading, cameraView(camera).halfAngleDeg, cameraView(camera).rangeM))} className="rm-fov" />
              <circle cx={p.x} cy={p.y} r="5" className="rm-camera"><title>{camera.name}</title></circle>
            </g>;
          })}
          {model.sensors.map(sensor => {
            const at = toMetres(sensor, dimensions), heading = headingOf(sensor, dimensions), p = screen(at), wired = Boolean(sensor.node);
            return <g key={sensor.id} className={wired ? "" : "rm-unwired"}>
              <polygon points={polygon(sectorPoints(at, heading, radarView(sensor).halfAngleDeg, radarView(sensor).rangeM))} className="rm-sector" />
              {[2, 4].map(r => <polyline key={r} points={polygon(arcPoints(at, r, heading - radarView(sensor).halfAngleDeg, heading + radarView(sensor).halfAngleDeg, 20))} className="rm-ring" />)}
              <rect x={p.x - 6} y={p.y - 6} width="12" height="12" rx="3" className="rm-sensor"><title>{`${sensor.name}${sensor.node ? ` · ${sensor.node}` : ` · ${t("notWired")}`}`}</title></rect>
              <text x={p.x + 9} y={p.y - 8} className="rm-label">{sensor.name}</text>
            </g>;
          })}
          {[...trails].map(([key, history]) => history.length > 1 && <polyline key={key} points={polygon(history.map(entry => entry.point))} className="rm-trail" />)}
          {placed.map(target => {
            const p = screen(target.point), colour = target.counted ? COLOR[target.alert] : "#8b9ba1", speed = target.speedMmS / 1000;
            return <g key={target.key} onPointerEnter={() => setHover(target.key)} onPointerLeave={() => setHover("")}>
              <circle cx={p.x} cy={p.y} r="16" fill={colour} opacity=".12" className="rm-pulse" />
              <circle cx={p.x} cy={p.y} r="6.5" fill={target.counted ? colour : "none"} stroke={colour} strokeWidth="2" strokeDasharray={target.inRated ? undefined : "3 2"} />
              <text x={p.x + 10} y={p.y + 4} className="rm-target-label">{`T${target.trackId}`}{hover === target.key ? ` · ${target.node} · ${speed.toFixed(2)} m/s` : ""}</text>
            </g>;
          })}
        </svg>
        <div className="radar-map-controls">
          <button onClick={() => zoom(1.25)} aria-label="+">+</button><button onClick={() => zoom(1 / 1.25)} aria-label="−">−</button><button onClick={() => setView(null)} title={t("fitView")}>⤢</button>
        </div>
        <ul className="radar-legend">
          <li><i className="dot counted" />{t("legendCounted")}</li><li><i className="dot ignored" />{t("legendIgnored")}</li><li><i className="dot outside" />{t("legendOutside")}</li><li><i className="dot zone" />{t("legendZone")}</li>
        </ul>
      </div>
      <p className="muted small">{t("radarAxisNote")}</p>
    </article>

    <div className="radar-side">
      <p className="muted small radar-role">{t("radarNodeRole")}</p>
      <ViewTabs tabs={[["radars", t("radarsOfDesign")], ["nodes", t("activeRadarNodes")]]} active={side} onChange={setSide} />
      {side === "radars" && <RadarSensors t={t} sensors={model.sensors} dimensions={dimensions} nodes={nodes} rules={rules} targetsBySensor={targetsBySensor} setSensors={setSensors} openZones={openZones} openDesigner={openDesigner} />}
      {side === "nodes" && <article className="stack-card">
        <p className="eyebrow">{t("radarFusion")}</p><h3>{t("activeRadarNodes")}</h3>
        {nodes.map(node => <div className="node-row" key={node.node_id}>
          <span className={`state-dot ${node.online && !node.stale ? node.alert_level : "silent"}`} />
          <div><strong>{node.node_id}</strong><small>{node.stale ? t("staleWord") : node.online ? t("online") : t("offlineWord")} · {node.online && !node.stale ? `${node.target_count} ${t("tracksWord")}` : `— ${t("tracksWord")}`} · {model.sensors.filter(sensor => sensor.node === node.node_id).length} {t("radarNodeLinked")} · {node.lux ?? "—"} lux{node.panel ? ` · ${t("firmwareWord")} ${node.panel.firmware}` : ""}</small></div>
          {node.panel && <a className="panel-link" href={panelUrl(node.panel)} target="_blank" rel="noopener noreferrer" title={`${node.panel.name} · ${node.panel.ip}`}>{t("openNodePanel")}</a>}
          <b>{node.online && !node.stale ? node.alert_level : "—"}</b>
          {(!node.online || node.stale) && <button className="danger-button" title={t("forgetNode")} onClick={() => { if (window.confirm(`${t("confirmForgetNode")} ${node.node_id}`)) forget(node.node_id); }}>{t("forgetNode")}</button>}
        </div>)}
        {unmapped.map(item => <p key={item.node} className="muted small warn-line"><b>{item.node}</b> {t("unmappedNode")}</p>)}
        {!nodes.length && <p className="muted">{t("noRadar")}</p>}
      </article>}
      {side === "nodes" && <NodeFinder t={t} origin={origin} network={network} wantKind="radar" knownIds={nodes.map(node => node.node_id)} knownIps={nodes.flatMap(node => (node.panel ? [node.panel.ip] : []))} />}
    </div>
  </section>;
}
