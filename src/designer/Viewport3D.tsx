/**
 * The 3D viewport: a lit, shadowed model of the whole site that can be orbited (drag), panned (right button) and zoomed,
 * turned on a turntable, seen from preset views, cut floor by floor, made see-through, and edited: select, move on the
 * ground, lift, and put chimneys, panels, antennas, pillars, lamps, masts, cameras and radars where you click.
 * Walls have real openings at their floor and height, roofs are the real planes computed for the plan, and every
 * camera and radar shows what it covers, at the height it is mounted.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Edges, Grid, Html, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { INTERIOR_KINDS } from "../domain";
import type { Building, Camera, Dimensions, Opening, Sensor, SiteFeature } from "../domain";
import type { StudioDevice } from "../api";
import { DeviceView as PlacedDevice } from "./DeviceMeshes";
import { bounds, edgeOf, floorBottom, nearestOnOutline, pointInPolygon, roofFrame, roofHeight, roofPieces, totalHeight } from "./geometry";
import { ICON } from "./icons";
import { CAMERA_HEIGHT_M, cameraView, clamp, formatMetres, headingOf, radarView, SENSOR_HEIGHT_M, TOOL_GROUPS, toMetres, type Point, type Selection, type Tool } from "./model";
import { FeatureBody, NEW_FEATURE_KINDS } from "./FeatureMeshes";
import { floorTexture } from "./floorLooks";
import { wallPlan } from "./merge";
import { FLOOR_LOOKS, floorAt, floorFinish } from "./floors";
import { arrangeToolbox, toolSections } from "./toolItems";
import type { PlaceHit } from "./Plan2D";
import { roofSurfaceZ, type SiteModel } from "./ops";
import { FloatingToolbox, type ToolboxItem } from "./Toolbox";

export type Target3D = { kind: "building" | "opening" | "roofItem" | "wallLamp" | "feature" | "camera" | "sensor" | "device"; id: string };
export type ViewportProps = {
  t: (key: string) => string;
  dimensions: Dimensions; model: SiteModel; selection: Selection; tool: Tool; onTool: (tool: Tool) => void;
  /** The devices of the system, with their live state. */
  devices: StudioDevice[];
  /** The floor to show up to (-1 shows the whole building). */
  activeFloor: number; floorCount: number; onFloor: (floor: number) => void;
  onSelect: (selection: Selection) => void;
  onDragStart: () => void;
  onMove: (target: Target3D, point: Point, delta: Point) => void;
  onElevate: (target: Target3D, dz: number) => void;
  onPlace: (point: Point, hit: PlaceHit) => void;
  onNotice: (text: string) => void;
  /** Undo, redo, delete and turn: the same buttons as in the 2D panel. */
  sharedSections: ToolboxItem[][];
};

const SELECT = "#00e5ff";
/** Light cones and rings are only drawn: they never take a click meant for what is behind them. */
const NO_PICK = () => null;
const site = (x: number, y: number, z = 0): [number, number, number] => [x, z, -y];
const ROOF_TOOLS: ReadonlySet<Tool> = new Set(["chimney", "roof-solar", "antenna", "gutter", "downpipe"]);
const WALL_TOOLS: ReadonlySet<Tool> = new Set(["door", "window", "garage", "arch", "wall-lamp"]);
/** Every tool that puts something where you click in the 3D view: all of them except selecting, moving, lifting and drawing outlines. */
const PLACING: ReadonlySet<Tool> = new Set(TOOL_GROUPS.flat().filter(spec => spec.views.includes("3d") && !["select", "move", "elevate"].includes(spec.tool)).map(spec => spec.tool));
const ELEVATABLE: ReadonlySet<Target3D["kind"]> = new Set(["building", "opening", "wallLamp", "feature", "camera", "sensor", "device"]);
const MOVABLE: ReadonlySet<Target3D["kind"]> = new Set(["building", "roofItem", "feature", "camera", "sensor", "device"]);

type Layers = { terrain: boolean; buildings: boolean; roofs: boolean; features: boolean; cameras: boolean; sensors: boolean; fields: boolean; grid: boolean };
const ALL_LAYERS: Layers = { terrain: true, buildings: true, roofs: true, features: true, cameras: true, sensors: true, fields: true, grid: true };
const LAYER_KEYS: ReadonlyArray<keyof Layers> = ["terrain", "buildings", "roofs", "features", "cameras", "sensors", "fields", "grid"];
type ViewName = "iso" | "top" | "south" | "east" | "north" | "west";
const ELEVATIONS: ViewName[] = ["south", "east", "north", "west"];

type Hooks = (kind: Target3D["kind"], id: string, roofOf?: string) => Record<string, unknown>;
const glowOf = (selected: boolean, hover: boolean) => ({ emissive: selected ? SELECT : hover ? "#0c4552" : "#000000", emissiveIntensity: selected ? 0.35 : 0.45 });

// ---- walls ---------------------------------------------------------------------------------------------------------------------

/** One wall as one solid: its bottom on the ground floor, its top the roof line (or the cut), every door and window cut out at its own floor and height. */
function wallGeometry(building: Building, edge: number, holes: readonly Opening[], visibleFloors: number): THREE.ExtrudeGeometry {
  const { a, length, ux, uy } = edgeOf(building.points, edge), floors = building.floors.slice(0, visibleFloors), top = totalHeight(floors), e = building.thickness / 2;
  const complete = visibleFloors >= building.floors.length && !building.roofHidden, frame = roofFrame(building.points, building.roof), shape = new THREE.Shape();
  const profile = (along: number) => complete && building.roof.style !== "flat" ? Math.max(0, roofHeight(frame, building.roof, a.x + ux * clamp(along, 0, length), a.y + uy * clamp(along, 0, length))) : 0;
  const steps = 60, xs = Array.from({ length: steps + 1 }, (_, index) => -e + (length + 2 * e) * index / steps), rise = xs.map(profile);
  shape.moveTo(-e, 0); shape.lineTo(length + e, 0);
  if (Math.max(...rise) < 1e-6) { shape.lineTo(length + e, top); shape.lineTo(-e, top); }
  else for (let index = xs.length - 1; index >= 0; index -= 1) shape.lineTo(xs[index], top + rise[index]);
  shape.closePath();
  for (const hole of holes) {
    const x0 = clamp(hole.offset, 0.03, length - 0.06), x1 = clamp(hole.offset + hole.width, x0 + 0.05, length - 0.03);
    const y0 = clamp(floorBottom(building.floors, hole.floor) + hole.sill, 0.02, top - 0.12), y1 = clamp(floorBottom(building.floors, hole.floor) + hole.sill + hole.height, y0 + 0.05, top - 0.03);
    const path = new THREE.Path();
    const radius = (x1 - x0) / 2, spring = y1 - radius;
    if (hole.arch && spring > y0 + 0.05) { path.moveTo(x0, y0); path.lineTo(x0, spring); path.absarc((x0 + x1) / 2, spring, radius, Math.PI, 0, true); path.lineTo(x1, y0); path.closePath(); }
    else { path.moveTo(x0, y0); path.lineTo(x0, y1); path.lineTo(x1, y1); path.lineTo(x1, y0); path.closePath(); }
    shape.holes.push(path);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: building.thickness, bevelEnabled: false });
  geometry.translate(0, 0, -building.thickness / 2);
  return geometry;
}

/** A slab the size of an opening whose top is a half circle when `arch` is set (the leaf of a door, the glass of a window), centred on the origin. */
function openingShape(w: number, h: number, arch: boolean): THREE.Shape {
  const shape = new THREE.Shape(), radius = w / 2, spring = h / 2 - radius;
  if (arch && spring > -h / 2 + 0.05) { shape.moveTo(-w / 2, -h / 2); shape.lineTo(-w / 2, spring); shape.absarc(0, spring, radius, Math.PI, 0, true); shape.lineTo(w / 2, -h / 2); shape.closePath(); }
  else { shape.moveTo(-w / 2, -h / 2); shape.lineTo(-w / 2, h / 2); shape.lineTo(w / 2, h / 2); shape.lineTo(w / 2, -h / 2); shape.closePath(); }
  return shape;
}

function OpeningView({ building, opening, selected, hover, xray, hooks, bothFaces = false }: { building: Building; opening: Opening; selected: boolean; hover: boolean; xray: boolean; hooks: Hooks; bothFaces?: boolean }) {
  const w = opening.width, h = opening.height, z0 = floorBottom(building.floors, opening.floor) + opening.sill;
  const glow = glowOf(selected, hover), frameColor = selected ? SELECT : (opening.color ?? "#eef6f8"), t = building.thickness, arch = Boolean(opening.arch);
  const leaf = useMemo(() => new THREE.ExtrudeGeometry(openingShape(w - 0.06, h - 0.04, arch), { depth: 0.05, bevelEnabled: false }), [w, h, arch]);
  const glass = useMemo(() => new THREE.ShapeGeometry(openingShape(w, h, arch)), [w, h, arch]);
  const rim = useMemo(() => { const shape = openingShape(w, h, arch), pts = shape.getPoints(24); return [...pts, pts[0]].map(point => [point.x, point.y, t / 2 + 0.01] as [number, number, number]); }, [w, h, arch, t]);
  const rimBack = useMemo(() => rim.map(([x, y]) => [x, y, -t / 2 - 0.01] as [number, number, number]), [rim, t]);   // a wall with a building on each side: the frame shows on both faces
  return <group position={[opening.offset + w / 2, z0 + h / 2, 0]} {...hooks("opening", opening.id)}>
    {opening.kind === "window"
      ? <>
          <mesh geometry={glass}><meshStandardMaterial color="#8fd8ff" transparent opacity={xray ? 0.2 : 0.38} roughness={0.08} metalness={0.3} depthWrite={false} side={THREE.DoubleSide} {...glow} /></mesh>
          <Line points={rim} color={frameColor} lineWidth={3} />
          {bothFaces && <Line points={rimBack} color={frameColor} lineWidth={3} />}
          {arch ? null : [[0, h / 2, w, 0.05], [0, -h / 2, w, 0.05], [-w / 2, 0, 0.05, h], [w / 2, 0, 0.05, h], [0, 0, 0.03, h], [0, 0, w, 0.03]].map(([x, y, fw, fh], index) =>
            <mesh key={index} position={[x, y, 0]} castShadow><boxGeometry args={[fw, fh, t * 0.85]} /><meshStandardMaterial color={frameColor} roughness={0.5} /></mesh>)}
          {arch && <mesh position={[0, -h / 2, 0]} castShadow><boxGeometry args={[w, 0.05, t * 0.85]} /><meshStandardMaterial color={frameColor} roughness={0.5} /></mesh>}
          <mesh position={[0, -h / 2 - 0.035, t / 2 + 0.05]} castShadow><boxGeometry args={[w + 0.12, 0.05, 0.14]} /><meshStandardMaterial color="#c5d2d6" roughness={0.7} /></mesh>
          {bothFaces && <mesh position={[0, -h / 2 - 0.035, -t / 2 - 0.05]} castShadow><boxGeometry args={[w + 0.12, 0.05, 0.14]} /><meshStandardMaterial color="#c5d2d6" roughness={0.7} /></mesh>}
        </>
      : opening.kind === "garage"
      ? <>
          <mesh castShadow position={[0, 0, 0.02]}><boxGeometry args={[w - 0.06, h - 0.04, 0.06]} /><meshStandardMaterial color={selected ? "#3bd9ee" : (opening.color ?? "#d7dde0")} roughness={0.6} metalness={0.25} {...glow} /></mesh>
          {Array.from({ length: Math.max(3, Math.round(h / 0.5)) - 1 }, (_, index) => <mesh key={index} position={[0, -h / 2 + (index + 1) * h / Math.max(3, Math.round(h / 0.5)), 0.056]}><boxGeometry args={[w - 0.08, 0.018, 0.012]} /><meshStandardMaterial color="#7d8b93" roughness={0.7} /></mesh>)}
          {Array.from({ length: 4 }, (_, index) => <mesh key={index} position={[-w / 2 + (index + 0.5) * (w / 4), h / 2 - 0.3, 0.06]}><boxGeometry args={[w / 4 - 0.1, 0.18, 0.012]} /><meshStandardMaterial color="#8fd8ff" roughness={0.1} metalness={0.3} /></mesh>)}
        </>
      : opening.kind === "opening"
      ? <><Line points={rim} color={frameColor} lineWidth={3} /><mesh position={[0, -h / 2 - 0.02, t / 2 + 0.03]}><boxGeometry args={[w + 0.1, 0.04, 0.1]} /><meshStandardMaterial color="#c5d2d6" roughness={0.7} /></mesh></>
      : <>
          <mesh geometry={leaf} position={[0, 0, -0.025]} castShadow><meshStandardMaterial color={selected ? "#3bd9ee" : (opening.color ?? "#6f8f9a")} roughness={0.45} metalness={0.25} {...glow} /></mesh>
          <mesh position={[w / 2 - 0.14, -0.05, 0.06]}><sphereGeometry args={[0.035, 12, 12]} /><meshStandardMaterial color="#e6eef1" metalness={0.8} roughness={0.25} /></mesh>
        </>}
    {opening.balcony && <group position={[0, -(opening.sill + h / 2) - 0.06, t / 2 + 0.55]}>
      <mesh castShadow receiveShadow><boxGeometry args={[w + 0.8, 0.12, 1.1]} /><meshStandardMaterial color="#aebcc1" roughness={0.9} /></mesh>
      {[[-1, 0], [1, 0]].map(([side]) => <mesh key={side} position={[side * (w / 2 + 0.38), 0.52, 0]} castShadow><boxGeometry args={[0.04, 1.0, 1.06]} /><meshStandardMaterial color="#6f7d84" metalness={0.5} roughness={0.5} transparent opacity={0.55} /></mesh>)}
      <mesh position={[0, 0.52, 0.52]} castShadow><boxGeometry args={[w + 0.8, 1.0, 0.04]} /><meshStandardMaterial color="#6f7d84" metalness={0.5} roughness={0.5} transparent opacity={0.55} /></mesh>
    </group>}
  </group>;
}

/** The slab of one level: plain concrete, or the finish chosen for that level painted on its top at the real size of its planks, tiles or slabs. */
function FloorSlab({ building, floor, geometry, xray, hooks }: { building: Building; floor: number; geometry: THREE.BufferGeometry; xray: boolean; hooks: Record<string, unknown> }) {
  const finish = floorFinish(building, floor);
  const map = useMemo(() => {
    const base = finish.chosen ? floorTexture(finish.style, finish.colour) : null;
    if (!base) return null;
    const texture = base.clone();
    texture.needsUpdate = true;
    texture.repeat.set(1 / FLOOR_LOOKS[finish.style].tile, 1 / FLOOR_LOOKS[finish.style].tile);   // the slab's coordinates are metres
    return texture;
  }, [finish.chosen, finish.style, finish.colour]);
  const smooth = finish.style === "flMarble" ? 0.2 : finish.style === "flCeramic" ? 0.3 : 0.9;
  return <mesh geometry={geometry} position={[0, floorBottom(building.floors, floor) - (floor === 0 ? 0.12 : 0.14), 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow {...hooks}>
    {/* a chosen finish glows a little with its own pattern: inside a small building the walls shade the whole floor, and the colour that was chosen would not be seen */}
    <meshStandardMaterial attach="material-0" color={map ? "#ffffff" : "#aebcc1"} map={map ?? undefined} roughness={map ? smooth : 0.9} transparent={xray} opacity={xray ? 0.3 : 1} depthWrite={!xray}
      {...(map ? { emissive: "#ffffff", emissiveMap: map, emissiveIntensity: 0.55 } : {})} />
    <meshStandardMaterial attach="material-1" color="#aebcc1" roughness={0.9} transparent={xray} opacity={xray ? 0.3 : 1} depthWrite={!xray} />
  </mesh>;
}

function BuildingView({ building, model, selected, selection, hoverKey, floorLimit, xray, layers, hooks }: {
  building: Building; model: SiteModel; selected: boolean; selection: Selection; hoverKey: string | null; floorLimit: number; xray: boolean; layers: Layers; hooks: Hooks;
}) {
  const visible = floorLimit < 0 ? building.floors.length : clamp(floorLimit + 1, 1, building.floors.length);
  const complete = visible === building.floors.length;
  // merged buildings: the walls they share are built once (by the taller one), the other leaves a gap there, and the openings of both are cut through the one wall
  const plan = wallPlan(model, building);
  const own = model.openings.filter(item => item.buildingId === building.id && item.floor < visible && !plan.handedOver.has(item.id));
  const holes = [...own, ...plan.borrowed];
  const gaps: Opening[] = plan.cuts.map((cut, index) => ({ id: `gap-${index}`, buildingId: building.id, edge: cut.edge, floor: 0, kind: "opening", offset: cut.from, width: cut.to - cut.from, height: 99, sill: 0 }));
  const shapeKey = JSON.stringify([building.points, building.floors, building.thickness, building.roof, holes, gaps, visible]);
  const walls = useMemo(() => building.points.map((_, edge) => wallGeometry(building, edge, [...holes, ...gaps].filter(item => item.edge === edge), visible)), [shapeKey]);   // eslint-disable-line react-hooks/exhaustive-deps
  const slabs = useMemo(() => {
    const shape = new THREE.Shape(building.points.map(point => new THREE.Vector2(point.x, point.y)));
    return new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false });
  }, [JSON.stringify(building.points)]);   // eslint-disable-line react-hooks/exhaustive-deps
  const roof = useMemo(() => {
    const positions: number[] = [];
    for (const piece of roofPieces(building.points, building.roof)) for (let index = 1; index < piece.length - 1; index += 1) for (const vertex of [piece[0], piece[index], piece[index + 1]]) positions.push(vertex.x, vertex.z, -vertex.y);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, [JSON.stringify([building.points, building.roof])]);   // eslint-disable-line react-hooks/exhaustive-deps
  const bodyHooks = hooks("building", building.id), roofHooks = hooks("building", building.id, building.id);
  const hover = hoverKey === `building:${building.id}`, glow = glowOf(selected, hover);
  const wallMaterial = <meshStandardMaterial color={building.color ?? "#d9e3e6"} roughness={0.88} transparent={xray} opacity={xray ? 0.28 : 1} depthWrite={!xray} side={THREE.DoubleSide} {...glow} emissiveIntensity={selected ? 0.12 : 0.4} />;
  const top = building.base + totalHeight(building.floors.slice(0, visible));
  const outline = [...building.points, building.points[0]];
  return <group>
    {layers.buildings && <group position={site(0, 0, building.base)}>
      {building.floors.slice(0, visible).map((_, floor) => <FloorSlab key={floor} building={building} floor={floor} geometry={slabs} xray={xray} hooks={bodyHooks} />)}
      {walls.map((geometry, edge) => {
        const { a, ux, uy } = edgeOf(building.points, edge);
        return <group key={edge} position={site(a.x, a.y)} rotation={[0, Math.atan2(uy, ux), 0]}>
          <mesh geometry={geometry} castShadow receiveShadow {...bodyHooks}>{wallMaterial}{selected && <Edges color={SELECT} threshold={25} />}</mesh>
          {holes.filter(item => item.edge === edge).map(opening => <OpeningView key={opening.id} bothFaces={plan.twoFaced.has(edge)} building={building} opening={opening} selected={selection.kind === "opening" && selection.id === opening.id} hover={hoverKey === `opening:${opening.id}`} xray={xray} hooks={hooks} />)}
        </group>;
      })}
    </group>}
    {layers.roofs && layers.buildings && complete && !building.roofHidden && <group position={site(0, 0, building.base + totalHeight(building.floors))}>
      <mesh geometry={roof} castShadow receiveShadow {...roofHooks}>
        <meshStandardMaterial color={building.roofColor ?? "#9a4d3f"} roughness={0.78} side={THREE.DoubleSide} transparent={xray} opacity={xray ? 0.3 : 1} depthWrite={!xray} {...glow} emissiveIntensity={selected ? 0.16 : 0.4} />
        <Edges color={selected ? SELECT : "#5d2f27"} threshold={12} />
      </mesh>
    </group>}
    {selected && layers.buildings && <>
      <Line points={outline.map(point => site(point.x, point.y, building.base + 0.03))} color={SELECT} lineWidth={2} />
      <Line points={outline.map(point => site(point.x, point.y, top))} color={SELECT} lineWidth={1.5} dashed dashSize={0.4} gapSize={0.25} />
      <Html position={site(...(() => { const c = bounds(building.points); return [(c.minX + c.maxX) / 2, (c.minY + c.maxY) / 2, top + 1.4] as const; })())} center className="v3d-tag" zIndexRange={[20, 0]}>{building.name} · {formatMetres(totalHeight(building.floors))}</Html>
    </>}
  </group>;
}

// ---- things on roofs, walls and the ground ---------------------------------------------------------------------------------------

function RoofItemView({ item, building, selected, hover, hooks }: { item: SiteModel["roofItems"][number]; building: Building; selected: boolean; hover: boolean; hooks: Hooks }) {
  // a gutter and a downpipe belong to the eaves (the top of the walls); everything else follows the roof surface
  const eaves = item.kind === "gutter" || item.kind === "downpipe", z = eaves ? building.base + totalHeight(building.floors) : roofSurfaceZ(building, item.x, item.y), glow = glowOf(selected, hover);
  // The panel lies on the roof: tilt it by the slope of the roof plane where it stands.
  const frame = roofFrame(building.points, building.roof), k = 0.4;
  const hx = (roofHeight(frame, building.roof, item.x + k, item.y) - roofHeight(frame, building.roof, item.x - k, item.y)) / (2 * k);
  const hy = (roofHeight(frame, building.roof, item.x, item.y + k) - roofHeight(frame, building.roof, item.x, item.y - k)) / (2 * k);
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-hx, 1, hy).normalize()), [hx, hy]);
  const w = item.width, d = item.depth, h = item.height, yaw = item.rotation * Math.PI / 180, panelTilt = Math.max(0, Math.min(80, item.tilt || 0)) * Math.PI / 180;
  return <group position={site(item.x, item.y, z)} {...hooks("roofItem", item.id)}>
    {item.kind === "chimney" && <group rotation={[0, yaw, 0]}>
      <mesh position={[0, h / 2 - 0.2, 0]} castShadow><boxGeometry args={[w, h + 0.4, d]} /><meshStandardMaterial color={item.color ?? "#8a5a4a"} roughness={0.9} {...glow} /></mesh>
      <mesh position={[0, h + 0.03, 0]} castShadow><boxGeometry args={[w + 0.14, 0.08, d + 0.14]} /><meshStandardMaterial color="#5c6a70" roughness={0.6} /></mesh>
    </group>}
    {item.kind === "solar" && <group quaternion={quaternion}><group rotation={[0, yaw, 0]}>
      {/* the panel can be raised off the roof by its tilt: one edge goes up, the other stays on the roof */}
      <group position={[0, Math.sin(panelTilt) * d / 2, 0]} rotation={[-panelTilt, 0, 0]}>
        <mesh position={[0, 0.08, 0]} castShadow><boxGeometry args={[w, Math.max(h, 0.05), d]} /><meshStandardMaterial color={item.color ?? "#173f7a"} metalness={0.65} roughness={0.28} {...glow} /><Edges color="#9fc9ee" /></mesh>
        <mesh position={[0, 0.035, 0]}><boxGeometry args={[w * 0.92, 0.04, d * 0.92]} /><meshStandardMaterial color="#7d8b93" roughness={0.6} /></mesh>
      </group>
    </group></group>}
    {item.kind === "antenna" && <group>
      <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.025, 0.04, h, 10]} /><meshStandardMaterial color={item.color ?? "#c3d0d4"} metalness={0.6} roughness={0.35} {...glow} /></mesh>
      {[0.55, 0.75, 0.92].map(f => <mesh key={f} position={[0, h * f, 0]} rotation={[0, yaw, 0]}><boxGeometry args={[0.7 * (1.1 - f * 0.5), 0.02, 0.02]} /><meshStandardMaterial color="#c3d0d4" metalness={0.6} roughness={0.35} /></mesh>)}
      <mesh position={[0, h + 0.05, 0]}><sphereGeometry args={[0.05, 10, 10]} /><meshStandardMaterial color="#ff4040" emissive="#ff4040" emissiveIntensity={1.2} /></mesh>
    </group>}
    {item.kind === "gutter" && <group rotation={[0, yaw, 0]}>
      {/* an open channel: the bottom and the two sides, along its length (w) */}
      <mesh position={[0, -0.06, 0]} castShadow><boxGeometry args={[w, 0.03, d]} /><meshStandardMaterial color={item.color ?? "#8d9aa1"} metalness={0.5} roughness={0.4} {...glow} /></mesh>
      {[-1, 1].map(side => <mesh key={side} position={[0, -0.06 + h / 2, side * (d / 2 - 0.015)]} castShadow><boxGeometry args={[w, h, 0.03]} /><meshStandardMaterial color={item.color ?? "#8d9aa1"} metalness={0.5} roughness={0.4} {...glow} /></mesh>)}
    </group>}
    {item.kind === "downpipe" && (() => {
      // a vertical tube from the roof's edge down to the ground (never below the building's foot), with a small elbow at the top
      const length = Math.max(0.2, Math.min(h, z - building.base)), radius = Math.max(0.03, w / 2);
      return <group rotation={[0, yaw, 0]}>
        <mesh position={[0, -length / 2, 0]} castShadow><cylinderGeometry args={[radius, radius, length, 12]} /><meshStandardMaterial color={item.color ?? "#8d9aa1"} metalness={0.5} roughness={0.4} {...glow} /></mesh>
        <mesh position={[0, 0.02, 0]} castShadow><sphereGeometry args={[radius * 1.25, 10, 10]} /><meshStandardMaterial color={item.color ?? "#8d9aa1"} metalness={0.5} roughness={0.4} /></mesh>
      </group>;
    })()}
    {item.kind === "vent" && <mesh position={[0, h / 2, 0]} castShadow rotation={[0, yaw, 0]}><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={item.color ?? "#7d8b93"} roughness={0.6} {...glow} /></mesh>}
  </group>;
}

function WallLampView({ lamp, building, selected, hover, hooks }: { lamp: SiteModel["wallLamps"][number]; building: Building; selected: boolean; hover: boolean; hooks: Hooks }) {
  if (lamp.edge >= building.points.length) return null;
  const { a, ux, uy, nx, ny } = edgeOf(building.points, lamp.edge), reach = Math.max(0.25, lamp.reach), glow = glowOf(selected, hover);
  const at = { x: a.x + ux * lamp.offset + nx * building.thickness / 2, y: a.y + uy * lamp.offset + ny * building.thickness / 2 };
  return <group position={site(at.x, at.y, building.base + lamp.z)} rotation={[0, Math.atan2(ny, nx), 0]} {...hooks("wallLamp", lamp.id)}>
    <mesh position={[reach / 2, 0, 0]} castShadow><boxGeometry args={[reach, 0.04, 0.04]} /><meshStandardMaterial color="#5a6a72" metalness={0.6} roughness={0.5} {...glow} /></mesh>
    <mesh position={[reach, -0.06, 0]} castShadow><cylinderGeometry args={[0.09, 0.14, 0.16, 14]} /><meshStandardMaterial color="#e8eef0" roughness={0.5} {...glow} /></mesh>
    <mesh position={[reach, -0.16, 0]}><sphereGeometry args={[0.08, 12, 12]} /><meshStandardMaterial color={lamp.color ?? "#ffe9a8"} emissive={lamp.color ?? "#ffd36b"} emissiveIntensity={1.4} /></mesh>
    <mesh raycast={NO_PICK} position={[reach, -1.15, 0]} rotation={[0, 0, 0]}><coneGeometry args={[0.9, 2, 20, 1, true]} /><meshBasicMaterial color={lamp.color ?? "#ffe9a8"} transparent opacity={0.05} depthWrite={false} side={THREE.DoubleSide} /></mesh>
  </group>;
}

function FeatureView({ feature, selected, hover, hooks }: { feature: SiteFeature; selected: boolean; hover: boolean; hooks: Hooks }) {
  const glow = glowOf(selected, hover), w = feature.width, d = feature.depth, h = feature.height;
  const body = NEW_FEATURE_KINDS.has(feature.kind) ? <FeatureBody feature={feature} glow={glow} /> : (() => {
    switch (feature.kind) {
      case "road": return <>
        <mesh position={[0, h / 2, 0]} receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={feature.color ?? "#1c252b"} roughness={0.95} {...glow} /></mesh>
        {Array.from({ length: Math.max(1, Math.floor(d / 1.6)) }, (_, index) => <mesh key={index} position={[0, h + 0.002, -d / 2 + 0.8 + index * 1.6]}><boxGeometry args={[0.12, 0.004, 0.8]} /><meshStandardMaterial color="#e6b93a" /></mesh>)}
      </>;
      case "path": return <mesh position={[0, h / 2, 0]} receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={feature.color ?? "#6f8b93"} roughness={0.9} {...glow} /></mesh>;
      case "entrance": return <>{[0, 1, 2].map(step => <mesh key={step} position={[0, (step + 0.5) * h / 3, -d / 2 + (step + 0.5) * d / 3]} castShadow receiveShadow><boxGeometry args={[w, h / 3 * (step + 1) * 0.999, d / 3]} /><meshStandardMaterial color={feature.color ?? "#9fb1b7"} roughness={0.85} {...glow} /></mesh>)}</>;
      case "solar": {
        const tilt = -feature.slope * Math.PI / 180, lift = 0.3 + Math.sin(-tilt) * d / 2;
        return <group>
          <mesh position={[0, lift, 0]} rotation={[tilt, 0, 0]} castShadow receiveShadow><boxGeometry args={[w, 0.05, d]} /><meshStandardMaterial color={feature.color ?? "#173f7a"} metalness={0.65} roughness={0.28} {...glow} /><Edges color="#9fc9ee" /></mesh>
          {[-w / 2 + 0.1, w / 2 - 0.1].map(x => <mesh key={x} position={[x, lift / 2, 0]} castShadow><boxGeometry args={[0.05, lift, 0.05]} /><meshStandardMaterial color="#8895a0" metalness={0.7} roughness={0.4} /></mesh>)}
        </group>;
      }
      case "canopy": return <group>
        <mesh position={[0, h, 0]} castShadow receiveShadow><boxGeometry args={[w, 0.12, d]} /><meshStandardMaterial color={feature.color ?? "#4b6f7a"} roughness={0.6} {...glow} /></mesh>
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => <mesh key={`${sx}${sz}`} position={[sx * (w / 2 - 0.08), h / 2, sz * (d / 2 - 0.08)]} castShadow><cylinderGeometry args={[0.05, 0.05, h, 12]} /><meshStandardMaterial color={feature.color ?? "#c3d0d4"} metalness={0.6} roughness={0.35} /></mesh>)}
      </group>;
      case "pillar": return <group>
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={feature.color ?? "#a8b4b8"} roughness={0.75} {...glow} /></mesh>
        <mesh position={[0, h + 0.03, 0]} castShadow><boxGeometry args={[w + 0.12, 0.06, d + 0.12]} /><meshStandardMaterial color="#8895a0" roughness={0.7} /></mesh>
      </group>;
      case "lamp": {
        const r = Math.max(w / 2, 0.04);
        return <group>
          <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[r * 0.75, r, h, 12]} /><meshStandardMaterial color={feature.color ?? "#59666d"} metalness={0.65} roughness={0.42} {...glow} /></mesh>
          <mesh position={[0, 0.12, 0]} castShadow><cylinderGeometry args={[r * 1.7, r * 2.2, 0.24, 12]} /><meshStandardMaterial color={feature.color ?? "#59666d"} metalness={0.6} roughness={0.5} /></mesh>
          <mesh position={[0.28, h + 0.04, 0]} castShadow><boxGeometry args={[0.7, 0.05, 0.06]} /><meshStandardMaterial color={feature.color ?? "#59666d"} metalness={0.65} roughness={0.42} /></mesh>
          <mesh position={[0.6, h - 0.02, 0]}><boxGeometry args={[0.36, 0.06, 0.2]} /><meshStandardMaterial color="#ffe9a8" emissive="#ffd36b" emissiveIntensity={1.6} /></mesh>
          <mesh raycast={NO_PICK} position={[0.6, h / 2 - 0.03, 0]}><coneGeometry args={[Math.min(3.2, h * 0.55), h - 0.05, 24, 1, true]} /><meshBasicMaterial color="#ffe9a8" transparent opacity={0.045} depthWrite={false} side={THREE.DoubleSide} /></mesh>
        </group>;
      }
      case "mast": {
        const r = Math.max(w / 2, 0.06);
        return <group>
          <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[r * 0.6, r, h, 12]} /><meshStandardMaterial color={feature.color ?? "#c3d0d4"} metalness={0.6} roughness={0.35} {...glow} /></mesh>
          {[0.25, 0.5, 0.75].map(f => <mesh key={f} position={[0, h * f, 0]}><boxGeometry args={[0.9 * (1.1 - f * 0.6), 0.03, 0.03]} /><meshStandardMaterial color={feature.color ?? "#c3d0d4"} metalness={0.6} roughness={0.35} /></mesh>)}
          <mesh position={[0, h + 0.06, 0]}><sphereGeometry args={[0.07, 10, 10]} /><meshStandardMaterial color="#ff4040" emissive="#ff4040" emissiveIntensity={1.3} /></mesh>
          {(feature.parts ?? []).map((part, index) => <MastPartView key={index} part={part} radius={r} />)}
        </group>;
      }
    }
  })();
  // Turned about the vertical axis first, then tipped about the world's east-west (X) and north-south (Z) axes.
  return <group position={site(feature.x, feature.y, feature.z)} rotation={[(feature.pitch ?? 0) * Math.PI / 180, feature.rotation * Math.PI / 180, (feature.roll ?? 0) * Math.PI / 180, "XZY"]} {...hooks("feature", feature.id)}>
    {body}
    {selected && <mesh raycast={NO_PICK} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[Math.max(w, d, 0.3) * 0.7, Math.max(w, d, 0.3) * 0.75 + 0.05, 48]} /><meshBasicMaterial color={SELECT} transparent opacity={0.85} /></mesh>}
  </group>;
}

/** A television antenna (a boom with elements), a satellite dish or a Wi-Fi dish, fixed to the side of a mast at its own height and turned by its own angle. */
function MastPartView({ part, radius }: { part: NonNullable<SiteFeature["parts"]>[number]; radius: number }) {
  const s = part.size, metal = <meshStandardMaterial color="#d5dde0" metalness={0.6} roughness={0.35} />;
  return <group position={[0, part.z, 0]} rotation={[0, part.rotation * Math.PI / 180, 0]}>
    <mesh position={[radius + 0.06, 0, 0]}><boxGeometry args={[0.12, 0.04, 0.04]} />{metal}</mesh>
    {part.kind === "tv" && <group position={[radius + 0.12, 0, 0]}>
      <mesh position={[s * 0.4, 0, 0]}><boxGeometry args={[s * 0.8, 0.025, 0.025]} />{metal}</mesh>
      {[0.05, 0.22, 0.38, 0.52, 0.66, 0.78].map((f, index) => <mesh key={index} position={[s * f, 0, 0]}><boxGeometry args={[0.02, 0.02, s * (0.5 - index * 0.04)]} />{metal}</mesh>)}
    </group>}
    {part.kind === "satellite" && <group position={[radius + 0.12, 0.05, 0]} rotation={[0, 0, Math.PI / 6]}>
      <mesh rotation={[0, 0, -Math.PI / 2]} castShadow><sphereGeometry args={[s * 0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.6]} /><meshStandardMaterial color="#e8eef0" roughness={0.45} metalness={0.3} side={THREE.DoubleSide} /></mesh>
      <mesh position={[s * 0.32, 0, 0]}><cylinderGeometry args={[0.012, 0.012, s * 0.5, 6]} /><meshStandardMaterial color="#4a5459" /></mesh>
    </group>}
    {part.kind === "wifi" && <group position={[radius + 0.12, 0, 0]}>
      <mesh rotation={[0, 0, -Math.PI / 2]}><cylinderGeometry args={[s * 0.5, s * 0.5, 0.04, 20]} /><meshStandardMaterial color="#c9d3d6" roughness={0.5} metalness={0.3} /></mesh>
      <mesh position={[0.04, 0, 0]}><boxGeometry args={[0.07, s * 0.35, s * 0.35]} /><meshStandardMaterial color="#3b4a50" /></mesh>
    </group>}
  </group>;
}

/** A translucent fan lying at `height`, apex at the origin, opening along +X (rotate the group to the heading). */
function Fan({ range, half, color, opacity, height }: { range: number; half: number; color: string; opacity: number; height: number }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    for (let step = 0; step <= 28; step += 1) { const angle = (-half + 2 * half * step / 28) * Math.PI / 180; shape.lineTo(Math.cos(angle) * range, Math.sin(angle) * range); }
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, [range, half]);
  return <group position={[0, height, 0]} rotation={[-Math.PI / 2, 0, 0]}>
    <mesh geometry={geometry}><meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <lineSegments><edgesGeometry args={[geometry]} /><lineBasicMaterial color={color} transparent opacity={0.7} /></lineSegments>
  </group>;
}

function DeviceView({ kind, item, dimensions, selected, hover, showField, hooks }: { kind: "camera" | "sensor"; item: Camera | Sensor; dimensions: Dimensions; selected: boolean; hover: boolean; showField: boolean; hooks: Hooks }) {
  const at = toMetres(item, dimensions), heading = headingOf(item, dimensions) * Math.PI / 180, height = item.z ?? (kind === "camera" ? CAMERA_HEIGHT_M : SENSOR_HEIGHT_M);
  const enabled = kind === "sensor" || (item as Camera).enabled, glow = glowOf(selected, hover);
  const view = kind === "camera" ? cameraView(item as Camera) : radarView(item as Sensor), range = view.rangeM, half = view.halfAngleDeg;
  const cone = kind === "camera" ? [-half, half].map(angle => [Math.cos(angle * Math.PI / 180) * range, Math.sin(angle * Math.PI / 180) * range]) : [];
  return <group position={site(at.x, at.y)}>
    <mesh position={[0, height / 2, 0]} castShadow><cylinderGeometry args={[0.03, 0.04, height, 10]} /><meshStandardMaterial color="#5a6a72" metalness={0.6} roughness={0.5} /></mesh>
    <group position={[0, height, 0]} rotation={[0, heading, -(item.tilt ?? 0) * Math.PI / 180]} {...hooks(kind, item.id)}>
      {kind === "camera"
        ? <><mesh castShadow><boxGeometry args={[0.32, 0.16, 0.16]} /><meshStandardMaterial color={enabled ? "#e8eef0" : "#7d8a90"} roughness={0.5} {...glow} /></mesh>
            <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.06, 0.075, 0.08, 16]} /><meshStandardMaterial color="#0b1418" metalness={0.8} roughness={0.2} /></mesh>
            <mesh position={[0.224, 0, 0]}><sphereGeometry args={[0.035, 12, 12]} /><meshStandardMaterial color="#ffb020" emissive="#ffb020" emissiveIntensity={enabled ? 1.2 : 0} /></mesh></>
        : <><mesh castShadow><boxGeometry args={[0.16, 0.12, 0.05]} /><meshStandardMaterial color="#12303a" roughness={0.4} {...glow} /></mesh>
            <mesh position={[0.03, 0, 0]}><boxGeometry args={[0.02, 0.08, 0.12]} /><meshStandardMaterial color={SELECT} emissive={SELECT} emissiveIntensity={0.8} /></mesh></>}
    </group>
    {showField && <group rotation={[0, heading, 0]}>
      {kind === "sensor"
        ? <Fan range={range} half={half} color="#00e5ff" opacity={selected ? 0.2 : 0.11} height={height} />
        : <>
            <Fan range={range} half={half} color="#ffb020" opacity={selected ? 0.16 : 0.07} height={0.03} />
            {cone.map(([x, z], index) => <Line key={index} points={[[0, height, 0], [x, 0.03, -z]]} color="#ffb020" transparent opacity={selected ? 0.55 : 0.22} lineWidth={1} />)}
          </>}
    </group>}
    {selected && <>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.3, 0.36, 40]} /><meshBasicMaterial color={SELECT} /></mesh>
      <Html position={[0, height + 0.5, 0]} center className="v3d-tag" zIndexRange={[20, 0]}>{item.name} · Z {formatMetres(height)}</Html>
    </>}
  </group>;
}

// ---- the scene ---------------------------------------------------------------------------------------------------------------------

type ViewRequest = { name: ViewName | "fit" | "focus"; n: number };

/** Moves the camera when asked (preset views, fit, focus on the selection) and keeps the compass pointing north. */
function ViewController({ request, centre, span, focus, compass }: { request: ViewRequest; centre: THREE.Vector3; span: number; focus: THREE.Vector3 | null; compass: React.RefObject<HTMLDivElement | null> }) {
  const camera = useThree(state => state.camera), controls = useThree(state => state.controls) as OrbitControlsImpl | null;
  useEffect(() => {
    if (!controls || request.n === 0) return;
    let target = centre.clone(), offset = new THREE.Vector3(span * 0.7, span * 0.75, span * 0.9);
    switch (request.name) {
      case "top": offset = new THREE.Vector3(0, span * 1.6, 0.01); break;
      case "south": offset = new THREE.Vector3(0, span * 0.32, span * 1.35); break;
      case "north": offset = new THREE.Vector3(0, span * 0.32, -span * 1.35); break;
      case "east": offset = new THREE.Vector3(span * 1.35, span * 0.32, 0); break;
      case "west": offset = new THREE.Vector3(-span * 1.35, span * 0.32, 0); break;
      case "focus": if (focus) {
        // Look at it from the outside of the site, so nothing stands between the view and the object.
        const outward = new THREE.Vector3(focus.x - centre.x, 0, focus.z - centre.z);
        if (outward.lengthSq() < 1e-6) outward.set(0.6, 0, 0.8); else outward.normalize();
        const distance = Math.max(7, span * 0.16);
        target = focus.clone(); offset = outward.multiplyScalar(distance).setY(Math.max(3, distance * 0.55));
      } break;
      default: break;
    }
    camera.position.copy(target).add(offset);
    controls.target.copy(target);
    controls.update();
  }, [request.n]);   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    const control = controls as OrbitControlsImpl | null;
    if (control && compass.current) compass.current.style.setProperty("--az", `${(control.getAzimuthalAngle() * 180 / Math.PI).toFixed(1)}deg`);
  });
  return null;
}

function Scene(props: ViewportProps & { shadows: boolean; xray: boolean; turntable: boolean; layers: Layers; request: ViewRequest; compass: React.RefObject<HTMLDivElement | null> }) {
  const { dimensions, model, selection, tool, shadows, xray, turntable, layers } = props;
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const { camera, gl } = useThree();
  const controls = useThree(state => state.controls) as OrbitControlsImpl | null;
  const drag = useRef<{ target: Target3D; mode: "move" | "elevate"; planeY: number; last: Point; startY: number; lastDz: number; metresPerPixel: number } | null>(null);
  const tools = useRef({ props, controls });
  tools.current = { props, controls };

  const all = [...model.terrain.points, ...model.buildings.flatMap(building => building.points)];
  const box = all.length ? bounds(all) : { minX: 0, minY: 0, maxX: dimensions.width, maxY: dimensions.depth };
  const cx = (box.minX + box.maxX) / 2, cy = (box.minY + box.maxY) / 2, span = Math.max(20, box.maxX - box.minX, box.maxY - box.minY);
  const centre = new THREE.Vector3(...site(cx, cy, 2));
  // The orbit target is set once. Editing moves the middle of the site, and the view must not jump while it does.
  const startTarget = useMemo(() => centre.clone(), []);   // eslint-disable-line react-hooks/exhaustive-deps
  const selectedFocus = (() => {
    const s = selection;
    if (s.kind === "building") { const b = model.buildings.find(item => item.id === s.id); if (b) { const q = bounds(b.points); return new THREE.Vector3(...site((q.minX + q.maxX) / 2, (q.minY + q.maxY) / 2, b.base + totalHeight(b.floors) / 2)); } }
    if (s.kind === "camera" || s.kind === "sensor") { const item = (s.kind === "camera" ? model.cameras : model.sensors).find(i => i.id === s.id); if (item) { const p = toMetres(item, dimensions); return new THREE.Vector3(...site(p.x, p.y, item.z ?? (s.kind === "camera" ? CAMERA_HEIGHT_M : SENSOR_HEIGHT_M))); } }
    if (s.kind === "feature") { const f = model.features.find(i => i.id === s.id); if (f) return new THREE.Vector3(...site(f.x, f.y, f.z + f.height / 2)); }
    if (s.kind === "device") { const p = model.placements.find(i => i.device_id === s.id); if (p) return new THREE.Vector3(...site(p.x, p.y, p.z)); }
    if (s.kind === "roofItem") { const r = model.roofItems.find(i => i.id === s.id), b = r && model.buildings.find(i => i.id === r.buildingId); if (r && b) return new THREE.Vector3(...site(r.x, r.y, roofSurfaceZ(b, r.x, r.y))); }
    return null;
  })();

  // ---- picking rays and dragging ----
  useEffect(() => {
    const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), out = new THREE.Vector3(), ndc = new THREE.Vector2();
    const onMove = (event: PointerEvent) => {
      const current = drag.current;
      if (!current) return;
      const { props: live } = tools.current;
      if (current.mode === "elevate") {
        const dz = (current.startY - event.clientY) * current.metresPerPixel;
        live.onElevate(current.target, dz - current.lastDz);
        current.lastDz = dz;
        return;
      }
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      plane.constant = -current.planeY;
      if (!raycaster.ray.intersectPlane(plane, out)) return;
      const now = { x: out.x, y: -out.z };
      live.onMove(current.target, now, { x: now.x - current.last.x, y: now.y - current.last.y });
      current.last = now;
    };
    // Whatever ends the gesture - the button released anywhere, the pointer cancelled, the window losing focus - gives the orbit back.
    const end = () => { drag.current = null; const control = tools.current.controls; if (control) control.enabled = true; };
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", end); window.addEventListener("pointercancel", end); window.addEventListener("blur", end);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", end); window.removeEventListener("blur", end); end(); };
  }, [camera, gl]);

  const pointOf = (event: ThreeEvent<PointerEvent | MouseEvent>): Point => ({ x: event.point.x, y: -event.point.z });
  const hooks: Hooks = (kind, id, roofOf) => ({
    onPointerOver: (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setHoverKey(`${kind}:${id}`); },
    onPointerOut: () => setHoverKey(current => current === `${kind}:${id}` ? null : current),
    onPointerDown: (event: ThreeEvent<PointerEvent>) => {
      // Move and Lift always drag; with the Select tool, an object that is already selected can be dragged too (the first click selects it).
      const already = selection.kind === kind && "id" in selection && selection.id === id;
      const mode = tool === "move" || tool === "elevate" ? tool : tool === "select" && already && MOVABLE.has(kind) ? "move" : null;
      if (event.nativeEvent.button !== 0 || !mode) return;
      event.stopPropagation();
      const target: Target3D = { kind, id };
      props.onSelect({ kind, id } as Selection);
      if (mode === "move" && !MOVABLE.has(kind)) { props.onNotice(props.t(kind === "opening" || kind === "wallLamp" ? "moveIn2D" : "cannotMove")); return; }
      if (mode === "elevate" && !ELEVATABLE.has(kind)) { props.onNotice(props.t("cannotElevate")); return; }
      props.onDragStart();
      const rect = gl.domElement.getBoundingClientRect(), fov = (camera as THREE.PerspectiveCamera).fov ?? 42;
      drag.current = { target, mode, planeY: event.point.y, last: pointOf(event), startY: event.nativeEvent.clientY, lastDz: 0, metresPerPixel: 2 * camera.position.distanceTo(event.point) * Math.tan(fov * Math.PI / 360) / Math.max(1, rect.height) };
      if (controls) controls.enabled = false;
    },
    onClick: (event: ThreeEvent<MouseEvent>) => {
      if (event.delta > 4) return;
      event.stopPropagation();
      if (ROOF_TOOLS.has(tool)) { if (roofOf) props.onPlace(pointOf(event), { building: roofOf }); else props.onNotice(props.t("clickRoof")); return; }
      if (WALL_TOOLS.has(tool)) {
        // A click on a wall: which wall of the building, how far along it, and (from the height clicked) which floor.
        const building = kind === "building" && !roofOf ? model.buildings.find(item => item.id === id) : undefined;
        if (!building) { props.onNotice(props.t("clickWall")); return; }
        const found = nearestOnOutline(building.points, pointOf(event));
        let floor = 0;
        for (let index = 0; index < building.floors.length; index += 1) if (event.point.y - building.base >= floorBottom(building.floors, index)) floor = index;
        props.onPlace(pointOf(event), { edge: { buildingId: building.id, edge: found.edge, along: found.along, distance: found.distance }, floor });
        return;
      }
      if (PLACING.has(tool)) { props.onPlace(pointOf(event), { ...(tool === "sidewalk" && kind === "building" ? { building: id } : {}), z: event.point.y }); return; }
      props.onSelect({ kind, id } as Selection);
    },
  });

  const isSelected = (kind: Selection["kind"], id: string) => selection.kind === kind && "id" in selection && selection.id === id;
  const floorLimit = props.activeFloor;
  const terrainShape = useMemo(() => new THREE.Shape(model.terrain.points.map(point => new THREE.Vector2(point.x, point.y))), [model.terrain.points]);
  const terrainLine = [...model.terrain.points, model.terrain.points[0]].map(point => site(point.x, point.y, 0.04));
  const w = Math.max(dimensions.width, box.maxX + 4), d = Math.max(dimensions.depth, box.maxY + 4);
  const ground = box.minX < 0 || box.minY < 0 ? Math.max(box.minX, box.minY) : 0;

  return <>
    <color attach="background" args={["#060d13"]} />
    <fog attach="fog" args={["#060d13", span * 2.4, span * 6.5]} />
    <hemisphereLight args={["#bcdcf2", "#0b1418", 0.75]} />
    <ambientLight intensity={0.18} />
    <directionalLight position={[cx + span * 0.8, span * 1.4 + 8, -cy + span * 0.6]} intensity={2.1} castShadow={shadows} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}
      shadow-camera-left={-span * 1.3} shadow-camera-right={span * 1.3} shadow-camera-top={span * 1.3} shadow-camera-bottom={-span * 1.3} shadow-camera-near={1} shadow-camera-far={span * 6}
      />
    <OrbitControls makeDefault target={startTarget} enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI / 2.02} minDistance={2} maxDistance={span * 5} autoRotate={turntable} autoRotateSpeed={1.4} screenSpacePanning />
    <ViewController request={props.request} centre={centre} span={span} focus={selectedFocus} compass={props.compass} />
    {/* the ground: a click on the empty ground places, or clears the selection */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.004, -cy]} receiveShadow
      onClick={event => {
        if (event.delta > 4) return;
        const point = pointOf(event);
        if (PLACING.has(tool)) { if (ROOF_TOOLS.has(tool)) props.onNotice(props.t("clickRoof")); else props.onPlace({ x: clamp(point.x, ground, w + 20), y: clamp(point.y, ground, d + 20) }, {}); return; }
        props.onSelect(pointInPolygon(point, model.terrain.points) ? { kind: "terrain" } : { kind: "none" });
      }}>
      <planeGeometry args={[span * 10, span * 10]} /><meshStandardMaterial color="#0a151b" roughness={1} />
    </mesh>
    {layers.terrain && <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow onClick={event => { if (event.delta <= 4 && !PLACING.has(tool)) { event.stopPropagation(); props.onSelect({ kind: "terrain" }); } else if (event.delta <= 4) { event.stopPropagation(); props.onPlace(pointOf(event), {}); } }}>
        <shapeGeometry args={[terrainShape]} /><meshStandardMaterial color={model.terrain.color ?? "#17414d"} roughness={0.95} emissive={selection.kind === "terrain" ? SELECT : "#000000"} emissiveIntensity={0.12} side={THREE.DoubleSide} />
      </mesh>
      <Line points={terrainLine} color={selection.kind === "terrain" ? SELECT : "#4fe0d0"} lineWidth={selection.kind === "terrain" ? 3 : 2} />
      {model.terrain.points.map((point, index) => <mesh key={index} position={site(point.x, point.y, 0.3)}><cylinderGeometry args={[0.05, 0.05, 0.6, 8]} /><meshStandardMaterial color="#4fe0d0" emissive="#4fe0d0" emissiveIntensity={0.5} /></mesh>)}
    </>}
    {layers.grid && <Grid position={[(box.minX + box.maxX) / 2, 0.006, -(box.minY + box.maxY) / 2]} args={[box.maxX - box.minX + 4, box.maxY - box.minY + 4]} cellSize={1} cellThickness={0.6} cellColor="#2a6674" sectionSize={5} sectionThickness={1.2} sectionColor="#3f9aaa" fadeDistance={span * 3} fadeStrength={1.5} infiniteGrid={false} />}
    {model.buildings.map(building => <BuildingView key={building.id} building={building} model={model} selected={isSelected("building", building.id)} selection={selection} hoverKey={hoverKey} floorLimit={floorLimit} xray={xray} layers={layers} hooks={hooks} />)}
    {layers.buildings && layers.roofs && floorLimit < 0 && model.roofItems.map(item => { const building = model.buildings.find(candidate => candidate.id === item.buildingId); return building ? <RoofItemView key={item.id} item={item} building={building} selected={isSelected("roofItem", item.id)} hover={hoverKey === `roofItem:${item.id}`} hooks={hooks} /> : null; })}
    {layers.buildings && model.wallLamps.map(lamp => { const building = model.buildings.find(candidate => candidate.id === lamp.buildingId); return building ? <WallLampView key={lamp.id} lamp={lamp} building={building} selected={isSelected("wallLamp", lamp.id)} hover={hoverKey === `wallLamp:${lamp.id}`} hooks={hooks} /> : null; })}
    {layers.features && model.features.filter(feature => !(floorLimit >= 0 && INTERIOR_KINDS.has(feature.kind) && (floorAt(model.buildings, { x: feature.x, y: feature.y }, feature.z)?.floor ?? 0) > floorLimit)).map(feature => <FeatureView key={feature.id} feature={feature} selected={isSelected("feature", feature.id)} hover={hoverKey === `feature:${feature.id}`} hooks={hooks} />)}
    {layers.sensors && model.placements.map(placement => {
      const device = props.devices.find(item => item.id === placement.device_id);
      return device ? <PlacedDevice key={placement.device_id} device={device} selected={isSelected("device", placement.device_id)} hover={hoverKey === `device:${placement.device_id}`} hooks={hooks("device", placement.device_id)}
        x={placement.x} y={placement.y} z={placement.z} rotation={placement.rotation} pitch={placement.pitch ?? 0} roll={placement.roll ?? 0} /> : null;
    })}
    {layers.cameras && model.cameras.map(camera => <DeviceView key={camera.id} kind="camera" item={camera} dimensions={dimensions} selected={isSelected("camera", camera.id)} hover={hoverKey === `camera:${camera.id}`} showField={layers.fields} hooks={hooks} />)}
    {layers.sensors && model.sensors.map(sensor => <DeviceView key={sensor.id} kind="sensor" item={sensor} dimensions={dimensions} selected={isSelected("sensor", sensor.id)} hover={hoverKey === `sensor:${sensor.id}`} showField={layers.fields} hooks={hooks} />)}
  </>;
}

export default function Viewport3D(props: ViewportProps) {
  const { t, tool } = props;
  const host = useRef<HTMLDivElement>(null), compass = useRef<HTMLDivElement>(null);
  const [shadows, setShadows] = useState(true), [xray, setXray] = useState(false), [turntable, setTurntable] = useState(false);
  const [layers, setLayers] = useState<Layers>(ALL_LAYERS), [layersOpen, setLayersOpen] = useState(false);
  const [request, setRequest] = useState<ViewRequest>({ name: "iso", n: 0 });
  const elevation = useRef(0);
  const ask = (name: ViewRequest["name"]) => setRequest(current => ({ name, n: current.n + 1 }));
  const nextElevation = () => { ask(ELEVATIONS[elevation.current % ELEVATIONS.length]); elevation.current += 1; };
  const item = (id: string, icon: React.ReactNode, label: string, help: string, onClick: () => void, extra: Partial<ToolboxItem> = {}): ToolboxItem => ({ id, icon, label, help, onClick, ...extra });
  const viewControls: ToolboxItem[][] = [
    [
      item("iso", ICON.iso, t("viewIso"), t("viewIsoHelp"), () => ask("iso")),
      item("top", ICON.top, t("viewTop"), t("viewTopHelp"), () => ask("top")),
      item("elevation", ICON.front, t("viewElevation"), t("viewElevationHelp"), nextElevation),
      item("fit", ICON.fit, t("fitView"), t("fitViewHelp"), () => ask("fit")),
      item("focus", ICON.focus, t("focusSelection"), t("focusSelectionHelp"), () => ask("focus"), { disabled: props.selection.kind === "none" || props.selection.kind === "terrain" }),
    ],
    [
      item("turntable", ICON.turntable, t("turntable"), t("turntableHelp"), () => setTurntable(value => !value), { active: turntable }),
      item("xray", ICON.xray, t("xray"), t("xrayHelp"), () => setXray(value => !value), { active: xray }),
      item("shadows", ICON.shadow, t("shadowsToggle"), t("shadowsHelp"), () => setShadows(value => !value), { active: shadows }),
      item("roofs", ICON.roofToggle, layers.roofs ? t("roofsOff") : t("roofsOn"), t("roofsToggleHelp"), () => setLayers(current => ({ ...current, roofs: !current.roofs })), { active: !layers.roofs }),
      item("layers", ICON.layers, t("layers"), t("layersHelp"), () => setLayersOpen(value => !value), { active: layersOpen }),
    ],
  ];
  const tools3d = toolSections(t, "3d", tool, props.onTool);
  const sections = arrangeToolbox(tools3d, props.sharedSections, viewControls);
  const floors = Array.from({ length: props.floorCount }, (_, index) => index);
  const start = useMemo(() => {
    const all = [...props.model.terrain.points, ...props.model.buildings.flatMap(building => building.points)], box = all.length ? bounds(all) : { minX: 0, minY: 0, maxX: 60, maxY: 40 };
    const span = Math.max(20, box.maxX - box.minX, box.maxY - box.minY), cx = (box.minX + box.maxX) / 2, cy = (box.minY + box.maxY) / 2;
    return { position: [cx + span * 0.7, span * 0.75, -cy + span * 0.9] as [number, number, number], span };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={host} className={`viewport3d tool-${tool}`}>
    <Canvas shadows={shadows} dpr={[1, 2]} camera={{ position: start.position, fov: 42, near: 0.1, far: start.span * 40 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      onPointerMissed={() => { /* selection is cleared by the ground itself */ }}>
      <Scene {...props} shadows={shadows} xray={xray} turntable={turntable} layers={layers} request={request} compass={compass} />
    </Canvas>
    <FloatingToolbox storageKey="armor-studio-toolbox-3d-v1" title={t("toolboxTitle3d")} sections={sections} containerRef={host} labels={{ drag: t("toolboxDrag"), collapse: t("toolboxCollapse"), expand: t("toolboxExpand") }} initial={{ x: 12, y: 12 }} />
    {tools3d.branches.map((branch, index) => <FloatingToolbox key={branch.id} storageKey={`armor-studio-toolbox-3d-${branch.id}-v1`} title={branch.title} sections={branch.sections} containerRef={host} labels={{ drag: t("toolboxDrag"), collapse: t("toolboxCollapse"), expand: t("toolboxExpand") }} initial={{ x: 150 + index * 140, y: 12 }} />)}
    {layersOpen && <div className="v3d-layers" role="group" aria-label={t("layers")}>
      <strong>{t("layers")}</strong>
      {LAYER_KEYS.map(key => <label key={key}><input type="checkbox" checked={layers[key]} onChange={event => setLayers(current => ({ ...current, [key]: event.target.checked }))} /> {t(`layer_${key}`)}</label>)}
    </div>}
    <div className="plan-floors" role="group" aria-label={t("floorSelector")}>
      <button className={props.activeFloor < 0 ? "on" : ""} onClick={() => props.onFloor(-1)} title={t("allFloors")}>{t("allFloorsShort")}</button>
      {floors.map(floor => <button key={floor} className={props.activeFloor === floor ? "on" : ""} onClick={() => props.onFloor(floor)} title={`${t("floor")} ${floor + 1}`}>{floor === 0 ? t("groundShort") : floor}</button>)}
      <button className={`roof-chip ${layers.roofs ? "" : "on"}`} aria-pressed={!layers.roofs} onClick={() => setLayers(current => ({ ...current, roofs: !current.roofs }))} title={layers.roofs ? t("roofsOff") : t("roofsOn")} aria-label={layers.roofs ? t("roofsOff") : t("roofsOn")}>{ICON.roof}</button>
    </div>
    <div ref={compass} className="v3d-compass" aria-label={t("north")} title={t("north")}><svg viewBox="0 0 40 40" width="42" height="42"><circle cx="20" cy="20" r="17" className="n-ring" /><g className="n-rot"><path d="M20 6l5 14H15z" className="n-needle" /><path d="M20 34l-5-14h10z" className="n-tail" /><text x="20" y="4.6" textAnchor="middle" className="n-n">N</text></g></svg></div>
    <p className="v3d-hint">{t("orbitHint")}</p>
  </div>;
}
