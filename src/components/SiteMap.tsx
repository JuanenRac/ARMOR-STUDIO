/**
 * A small live map of the site design for the overview: terrain, buildings, roads, trees and fences, the cameras, the radars with their
 * coverage and the targets they see now, and every placed device with its state (a triggered one pulses red).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { StudioDevice } from "../api";
import { deviceProblem, KIND_COLOUR, kindGlyph } from "../deviceKinds";
import { bounds, offsetPolygon } from "../designer/geometry";
import { fitTransform, headingOf, radarView, sectorPoints, toMetres, type Point } from "../designer/model";
import type { SiteModel } from "../designer/ops";
import { placeTargets } from "../designer/radarMap";
import type { Dimensions } from "../domain";
import type { NodeState } from "../types";
import "./site-map.css";

type Props = { model: SiteModel; dimensions: Dimensions; devices: StudioDevice[]; nodes: NodeState[]; onDevice?: (id: string) => void; empty: string };

export function SiteMap({ model, dimensions, devices, nodes, onDevice, empty }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: 360 });
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => { const rect = entries[0]?.contentRect; if (rect && rect.width > 0 && rect.height > 0) setSize({ width: rect.width, height: rect.height }); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const content = useMemo(() => {
    const points: Point[] = [...model.terrain.points, ...model.buildings.flatMap(building => building.points)];
    for (const item of model.sensors) { const at = toMetres(item, dimensions); points.push({ x: at.x - 3, y: at.y - 3 }, { x: at.x + 3, y: at.y + 3 }); }
    const found = points.length ? bounds(points) : { minX: 0, minY: 0, maxX: dimensions.width, maxY: dimensions.depth };
    return { minX: found.minX - 1, minY: found.minY - 1, maxX: found.maxX + 1, maxY: found.maxY + 1 };
  }, [model, dimensions]);
  const view = useMemo(() => fitTransform(content, size, 18), [content, size]);
  const P = (point: Point) => `${(view.x + point.x * view.scale).toFixed(1)},${(view.y - point.y * view.scale).toFixed(1)}`;
  const S = (point: Point) => ({ x: view.x + point.x * view.scale, y: view.y - point.y * view.scale });
  const poly = (points: readonly Point[]) => points.map(P).join(" ");
  const { placed } = useMemo(() => placeTargets(nodes, model.sensors, dimensions), [nodes, model.sensors, dimensions]);
  const rect = (x: number, y: number, w: number, d: number, rotation: number): Point[] => {
    const cos = Math.cos(rotation * Math.PI / 180), sin = Math.sin(rotation * Math.PI / 180);
    return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([dx, dy]) => ({ x: x + dx * cos - dy * sin, y: y + dx * sin + dy * cos }));
  };
  const hasDesign = model.terrain.points.length > 2 || model.buildings.length > 0;

  return <div ref={box} className="site-map">
    {!hasDesign && <p className="site-map-empty">{empty}</p>}
    <svg width={size.width} height={size.height} role="img">
      <polygon points={poly(model.terrain.points)} className="sm-terrain" />
      {model.features.filter(feature => ["road", "path", "sidewalk"].includes(feature.kind)).map(feature => <polygon key={feature.id} points={poly(rect(feature.x, feature.y, feature.width, feature.depth, feature.rotation))} className={`sm-${feature.kind}`} />)}
      {model.features.filter(feature => feature.kind === "tree").map(feature => { const c = S(feature); return <circle key={feature.id} cx={c.x} cy={c.y} r={Math.max(3, feature.width / 2 * view.scale)} className="sm-tree" />; })}
      {model.features.filter(feature => feature.kind === "fence").map(feature => { const r = feature.rotation * Math.PI / 180, half = feature.width / 2; return <polyline key={feature.id} points={poly([{ x: feature.x - Math.cos(r) * half, y: feature.y - Math.sin(r) * half }, { x: feature.x + Math.cos(r) * half, y: feature.y + Math.sin(r) * half }])} className="sm-fence" />; })}
      {model.buildings.map(building => <g key={building.id}><polygon points={poly(offsetPolygon(building.points, building.thickness / 2))} className="sm-building" /><polygon points={poly(building.points)} className="sm-building-in" /></g>)}
      {model.sensors.map(sensor => { const at = toMetres(sensor, dimensions); return <polygon key={sensor.id} points={poly(sectorPoints(at, headingOf(sensor, dimensions), radarView(sensor).halfAngleDeg, radarView(sensor).rangeM))} className={`sm-sector ${sensor.node ? "" : "unwired"}`} />; })}
      {model.cameras.map(camera => { const c = S(toMetres(camera, dimensions)); return <circle key={camera.id} cx={c.x} cy={c.y} r="4" className="sm-camera" />; })}
      {model.placements.map(placement => {
        const device = devices.find(item => item.id === placement.device_id);
        if (!device) return null;
        const c = S(placement), problem = deviceProblem(device), scale = 11 / 24;
        return <g key={device.id} className={`sm-device ${problem ?? ""} ${device.online ? "" : "off"}`} style={{ color: KIND_COLOUR[device.kind] }} transform={`translate(${c.x} ${c.y})`} onClick={() => onDevice?.(device.id)}>
          <circle r="16" className="sm-device-halo" /><circle r="9" className="sm-device-badge" />
          <g transform={`translate(${-12 * scale} ${-12 * scale}) scale(${scale})`} className="sm-device-glyph" pointerEvents="none">{kindGlyph(device.kind)}</g>
          <title>{device.name}</title>
        </g>;
      })}
      {placed.map(target => { const c = S(target.point); return <g key={target.key}><circle cx={c.x} cy={c.y} r="14" className="sm-target-halo" /><circle cx={c.x} cy={c.y} r="5" className={`sm-target ${target.counted ? target.alert : "ignored"}`} /></g>; })}
    </svg>
  </div>;
}
