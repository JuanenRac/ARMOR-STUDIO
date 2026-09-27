/**
 * Puts live radar targets on the site the operator designed: which radar of the design produces which node's reports, where each
 * reported target stands on the ground, and where the ignore zones lie. Pure functions, so the map and its tests share them.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Dimensions, Point, Sensor } from "../domain";
import type { NodeState } from "../types";
import type { Zone } from "../api";
import { headingOf, inSector, radarView, targetToSite, toMetres } from "./model";

export type PlacedTarget = {
  key: string; node: string; sensorId: string; trackId: number; point: Point; apex: Point; speedMmS: number;
  /** False when an ignore zone covers it (the server does not count it). */
  counted: boolean;
  /** True when the reported position lies within the radar's rated sector (6 m, +-60 degrees). */
  inRated: boolean;
  alert: NodeState["alert_level"];
};

/** The radar of the design that produces a target: the one wired to its node (and its radar number, when the design names one). */
export function sensorFor(sensors: readonly Sensor[], node: string, channel: number): Sensor | undefined {
  const wired = sensors.filter(sensor => sensor.node === node);
  return wired.find(sensor => sensor.channel !== undefined && sensor.channel !== 0 && sensor.channel === channel)
    ?? wired.find(sensor => sensor.channel === undefined || sensor.channel === 0);
}

/**
 * Every live target of every node that can be placed, and the nodes that report targets no radar of the design is wired to
 * (they cannot be drawn, and the operator is told which node still needs a radar in the designer).
 * A node that is stale or offline has no live targets.
 */
export function placeTargets(nodes: readonly NodeState[], sensors: readonly Sensor[], dimensions: Dimensions): { placed: PlacedTarget[]; unmapped: Array<{ node: string; count: number }> } {
  const placed: PlacedTarget[] = [], missing = new Map<string, number>();
  for (const node of nodes) {
    if (!node.online || node.stale) continue;
    for (const target of node.targets ?? []) {
      const sensor = sensorFor(sensors, node.node_id, target.sensor_id);
      if (!sensor) { missing.set(node.node_id, (missing.get(node.node_id) ?? 0) + 1); continue; }
      const apex = toMetres(sensor, dimensions), heading = headingOf(sensor, dimensions);
      const point = targetToSite(apex, heading, target, sensor.mirror === true);
      placed.push({
        key: `${node.node_id}:${target.sensor_id}:${target.track_id}`, node: node.node_id, sensorId: sensor.id, trackId: target.track_id, point, apex, speedMmS: target.speed_mm_s,
        counted: target.counted, inRated: inSector(point, apex, heading, radarView(sensor).halfAngleDeg, radarView(sensor).rangeM), alert: node.alert_level,
      });
    }
  }
  return { placed, unmapped: [...missing].map(([node, count]) => ({ node, count })) };
}

/** The ignore zones as polygons on the site: each zone is drawn once for every radar it applies to. */
export function zonePolygons(zones: readonly Zone[], sensors: readonly Sensor[], dimensions: Dimensions): Array<{ id: string; name: string; sensorId: string; points: Point[] }> {
  const shapes: Array<{ id: string; name: string; sensorId: string; points: Point[] }> = [];
  for (const zone of zones) {
    for (const sensor of sensors) {
      if (!sensor.node || (zone.node_id && zone.node_id !== sensor.node)) continue;
      if (zone.sensor_id !== undefined && sensor.channel !== undefined && sensor.channel !== 0 && zone.sensor_id !== sensor.channel) continue;
      const apex = toMetres(sensor, dimensions), heading = headingOf(sensor, dimensions);
      const corner = (x: number, y: number) => targetToSite(apex, heading, { x_mm: x, y_mm: y }, sensor.mirror === true);
      shapes.push({ id: zone.id, name: zone.name, sensorId: sensor.id, points: [corner(zone.x_min_mm, zone.y_min_mm), corner(zone.x_max_mm, zone.y_min_mm), corner(zone.x_max_mm, zone.y_max_mm), corner(zone.x_min_mm, zone.y_max_mm)] });
    }
  }
  return shapes;
}

/** A short trail of where each track has been, newest last; tracks not seen for a while are dropped. */
export type Trails = Map<string, Array<{ point: Point; at: number }>>;
export function updateTrails(trails: Trails, placed: readonly PlacedTarget[], now: number, keepMs = 6000, maxPoints = 14): Trails {
  const next: Trails = new Map();
  for (const target of placed) {
    const history = [...(trails.get(target.key) ?? [])];
    const last = history[history.length - 1];
    if (!last || Math.hypot(last.point.x - target.point.x, last.point.y - target.point.y) > 0.03) history.push({ point: target.point, at: now });
    next.set(target.key, history.filter(entry => now - entry.at <= keepMs).slice(-maxPoints));
  }
  return next;
}
