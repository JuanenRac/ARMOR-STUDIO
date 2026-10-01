/**
 * The site designer: draw the terrain and the buildings on a 2D CAD plan, put doors, windows, lamps, roof equipment and
 * ground objects where they belong, place the cameras and radars anywhere, and see and edit the same model in 3D.
 * This component owns the editing session: selection, tools, undo and redo, and the keyboard.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Dimensions, RoofItemKind, SiteFeatureKind } from "./domain";
import type { StudioDevice } from "./api";
import { Inspector } from "./designer/Inspector";
import { ICON } from "./designer/icons";
import { FloatingToolbox } from "./designer/Toolbox";
import { actionSections, toolSections, TURN_STEP, type TurnAxis } from "./designer/toolItems";
import { bounds, edgeOf, isSimplePolygon, nearestOnOutline, pointInPolygon, rectangle } from "./designer/geometry";
import { clamp, round2, snapTo, toMetres, toolForKey, toolLabelKey, toolWorksIn, toPercent, type Point, type Selection, type Tool } from "./designer/model";
import {
  addSidewalkRing, addStrip, addFeature, addOpening, addRoofItem, addWallLamp, buildingAt, createBuilding, duplicateBuilding, fitDimensions, insertBuildingVertex, moveBuilding, moveVertex, rectangularTerrain, removeSelected, rescaleDevices, rotateBuilding, setFootprint,
  translatePoints, nextId, turnSelected, canTurnAbout, placeDevice, DEVICE_HEIGHT, type SiteModel,
} from "./designer/ops";
import { Plan2D, type DragTarget, type PlaceHit } from "./designer/Plan2D";
import type { Target3D } from "./designer/Viewport3D";
import "./designer/designer.css";

const Viewport3D = lazy(() => import("./designer/Viewport3D"));

type Props = {
  t: (key: string) => string;
  dimensions: Dimensions; setDimensions: (value: Dimensions) => void;
  model: SiteModel; applyModel: (next: SiteModel) => void;
  selectedCamera: string; setSelectedCamera: (id: string) => void;
  notice: string; setNotice: (value: string) => void;
  save: () => void;
  /** Opens the versions the server keeps of this design. */
  openVersions: () => void;
  /** The field nodes the server knows, for wiring a radar to one. */
  nodeIds: string[];
  /** The devices of the system (with their live state), and a device the Devices menu asked to place. */
  devices: StudioDevice[]; wantsToPlace: string; clearWantsToPlace: () => void; openDevices: () => void;
};

type Snapshot = { model: SiteModel; dimensions: Dimensions };
const GRID_M = 0.25, HISTORY_LIMIT = 100, COALESCE_MS = 900;
const FEATURE_TOOLS: ReadonlySet<Tool> = new Set(["pillar", "lamp", "mast", "solar", "canopy", "entrance", "path", "road", "tree", "kennel", "fence", "fountain", "coop", "gate", "sidewalk"]);
const ROOF_ITEM_OF: Partial<Record<Tool, RoofItemKind>> = { chimney: "chimney", "roof-solar": "solar", antenna: "antenna" };
const REPEATING: ReadonlySet<Tool> = new Set(["door", "window", "wall-lamp", "chimney", "roof-solar", "antenna", "pillar", "lamp", "mast", "solar", "canopy", "entrance", "path", "road"]);
const NUDGE = 0.25;

export function SiteDesignerInteractive(props: Props) {
  const { t, dimensions, model } = props;
  const [view, setView] = useState<"2d" | "3d">("2d");
  const [tool, setTool] = useState<Tool>("select");
  const [selection, setSelection] = useState<Selection>({ kind: "none" });
  const [activeFloor, setActiveFloor] = useState(-1);
  const [fitSignal, setFitSignal] = useState(0);
  const [pending, setPending] = useState("");
  const [, setHistoryVersion] = useState(0);
  const canvas = useRef<HTMLDivElement>(null);
  const modelRef = useRef(model), dimsRef = useRef(dimensions);
  modelRef.current = model; dimsRef.current = dimensions;
  const past = useRef<Snapshot[]>([]), future = useRef<Snapshot[]>([]);
  const lastKey = useRef<{ key: string; at: number } | null>(null);
  const gesture = useRef<Snapshot | null>(null);
  const floorCount = Math.max(1, ...model.buildings.map(building => building.floors.length));
  const floorsChosen = activeFloor >= floorCount ? -1 : activeFloor;

  // ---- the model, with history ----
  const pushSnapshot = (snapshot: Snapshot) => {
    past.current.push(snapshot);
    if (past.current.length > HISTORY_LIMIT) past.current.shift();
    future.current = [];
    setHistoryVersion(value => value + 1);
  };
  const checkpoint = (key?: string) => {
    const now = Date.now();
    gesture.current = null;
    if (key && lastKey.current?.key === key && now - lastKey.current.at < COALESCE_MS) { lastKey.current.at = now; return; }
    pushSnapshot({ model: modelRef.current, dimensions: dimsRef.current });
    lastKey.current = key ? { key, at: now } : null;
  };
  /** A drag remembers how things were when it began, but only becomes an undo step if it really changes something. */
  const beginGesture = () => { gesture.current = { model: modelRef.current, dimensions: dimsRef.current }; };
  /** Make `next` the model. The work area grows to hold it, and cameras and radars keep their place on the ground while it does. */
  const commit = (next: SiteModel, options: { key?: string; history?: boolean } = {}) => {
    if (next === modelRef.current) return;
    if (options.history !== false) checkpoint(options.key);
    else if (gesture.current) { pushSnapshot(gesture.current); gesture.current = null; lastKey.current = null; }
    const fitted = fitDimensions(dimsRef.current, next);
    let result = next;
    if (fitted.width !== dimsRef.current.width || fitted.depth !== dimsRef.current.depth) {
      result = rescaleDevices(next, dimsRef.current, fitted);
      dimsRef.current = fitted;
      props.setDimensions(fitted);
    }
    modelRef.current = result;
    props.applyModel(result);
  };
  const edit = (change: (model: SiteModel) => SiteModel, key?: string) => commit(change(modelRef.current), { key });
  const restore = (snapshot: Snapshot) => {
    modelRef.current = snapshot.model; dimsRef.current = snapshot.dimensions;
    props.setDimensions(snapshot.dimensions); props.applyModel(snapshot.model);
    setSelection(current => stillThere(snapshot.model, current) ? current : { kind: "none" });
  };
  const undo = () => { const previous = past.current.pop(); if (!previous) return; future.current.push({ model: modelRef.current, dimensions: dimsRef.current }); lastKey.current = null; restore(previous); setHistoryVersion(value => value + 1); };
  const redo = () => { const next = future.current.pop(); if (!next) return; past.current.push({ model: modelRef.current, dimensions: dimsRef.current }); lastKey.current = null; restore(next); setHistoryVersion(value => value + 1); };
  const setWorkArea = (next: Dimensions) => {
    const fitted = fitDimensions(next, modelRef.current);
    checkpoint("workarea");
    const result = rescaleDevices(modelRef.current, dimsRef.current, fitted);
    dimsRef.current = fitted; modelRef.current = result;
    props.setDimensions(fitted); props.applyModel(result);
  };

  const select = (next: Selection) => {
    setSelection(next);
    if (next.kind === "camera") props.setSelectedCamera(next.id);
  };
  const finishTool = () => { setTool("select"); };

  // ---- creating ----
  const finishRect = (kind: "terrain" | "building", a: Point, b: Point) => {
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), width = Math.abs(b.x - a.x), depth = Math.abs(b.y - a.y);
    if (width < 0.5 || depth < 0.5) { props.setNotice(t("shapeTooSmall")); return; }
    if (kind === "terrain") {
      commit({ ...modelRef.current, terrain: rectangularTerrain(x, y, width, depth) });
      select({ kind: "terrain" }); setFitSignal(value => value + 1); props.setNotice(t("terrainCreated"));
    } else {
      const created = createBuilding(modelRef.current, rectangle(x, y, width, depth), `${t("building")} ${modelRef.current.buildings.length + 1}`);
      commit(created.model); select({ kind: "building", id: created.id }); props.setNotice(t("buildingCreated"));
    }
    finishTool();
  };
  const finishPolygon = (kind: "terrain" | "building", points: Point[]) => {
    if (!isSimplePolygon(points)) { props.setNotice(t("polygonInvalid")); return; }
    if (kind === "terrain") {
      commit({ ...modelRef.current, terrain: { points: points.map(point => ({ x: round2(point.x), y: round2(point.y) })) } });
      select({ kind: "terrain" }); setFitSignal(value => value + 1); props.setNotice(t("terrainCreated"));
    } else {
      const created = createBuilding(modelRef.current, points, `${t("building")} ${modelRef.current.buildings.length + 1}`);
      commit(created.model); select({ kind: "building", id: created.id }); props.setNotice(t("buildingCreated"));
    }
    finishTool();
  };
  const setRectTerrain = (width: number, depth: number) => {
    const box = bounds(modelRef.current.terrain.points);
    edit(m => ({ ...m, terrain: rectangularTerrain(box.minX, box.minY, width, depth) }), "terrain:size");
  };
  const insertVertex = (owner: { kind: "terrain" } | { kind: "building"; id: string }, edge: number, at: Point) => {
    const current = modelRef.current;
    if (owner.kind === "terrain") {
      const points = [...current.terrain.points.slice(0, edge + 1), { x: round2(at.x), y: round2(at.y) }, ...current.terrain.points.slice(edge + 1)];
      commit({ ...current, terrain: { points } }); setSelection({ kind: "terrain", vertex: edge + 1 });
    } else {
      const inserted = insertBuildingVertex(current, owner.id, edge, at);
      commit(inserted.model); setSelection({ kind: "building", id: owner.id, vertex: inserted.index });
    }
  };

  const place = (raw: Point, hit: PlaceHit) => {
    const point = { x: round2(snapTo(raw.x, GRID_M)), y: round2(snapTo(raw.y, GRID_M)) }, current = modelRef.current;
    const floor = (buildingId: string) => { const building = current.buildings.find(item => item.id === buildingId); return building ? clamp(hit.floor ?? (floorsChosen < 0 ? 0 : floorsChosen), 0, building.floors.length - 1) : 0; };
    if (tool === "door" || tool === "window") {
      const edge = hit.edge;
      if (!edge) { props.setNotice(t("clickWall")); return; }
      const added = addOpening(current, edge.buildingId, edge.edge, floor(edge.buildingId), tool, edge.along);
      if (added) { commit(added.model); select({ kind: "opening", id: added.id }); props.setNotice(`${t(tool === "door" ? "doorAdded" : "windowAdded")} · ${t("floorShort")} ${floor(edge.buildingId) + 1}`); }
      return;
    }
    if (tool === "wall-lamp") {
      const edge = hit.edge;
      if (!edge) { props.setNotice(t("clickWall")); return; }
      const added = addWallLamp(current, edge.buildingId, edge.edge, edge.along);
      if (added) { commit(added.model); select({ kind: "wallLamp", id: added.id }); props.setNotice(t("wallLampAdded")); }
      return;
    }
    const roofKind = ROOF_ITEM_OF[tool];
    if (roofKind) {
      const building = hit.building ? current.buildings.find(item => item.id === hit.building) : buildingAt(current, point);
      if (!building) { props.setNotice(t("clickRoof")); return; }
      const added = addRoofItem(current, building.id, roofKind, point.x, point.y);
      if (added) { commit(added.model); select({ kind: "roofItem", id: added.id }); props.setNotice(t("roofItemAdded")); } else props.setNotice(t("clickRoof"));
      return;
    }
    if (tool === "sidewalk" && hit.building) {
      const ring = addSidewalkRing(current, hit.building);
      if (ring) { commit(ring.model); select({ kind: "feature", id: ring.ids[0] }); props.setNotice(t("sidewalkAdded")); }
      return;
    }
    if (FEATURE_TOOLS.has(tool)) {
      const added = addFeature(current, tool as SiteFeatureKind, point.x, point.y);
      commit(added.model); select({ kind: "feature", id: added.id }); props.setNotice(`${t(toolLabelKey(tool))} · ${t("objectCreated")}`);
      return;
    }
    if (tool === "camera") {
      const id = selection.kind === "camera" ? selection.id : props.selectedCamera;
      if (!id || !current.cameras.some(item => item.id === id)) { props.setNotice(t("selectCameraFirst")); return; }
      commit({ ...current, cameras: current.cameras.map(item => item.id === id ? { ...item, ...toPercent(point, dimsRef.current) } : item) });
      select({ kind: "camera", id }); props.setNotice(t("cameraPlaced")); finishTool();
      return;
    }
    if (tool === "device") {
      const next = pending || props.devices.find(device => !current.placements.some(item => item.device_id === device.id))?.id;
      const device = props.devices.find(item => item.id === next);
      if (!device) { props.setNotice(t("noDeviceToPlace")); return; }
      // Clicked high on a wall in 3D: it goes there. On the ground or in the plan it goes at its usual height.
      commit(placeDevice(current, device.id, point, hit.z !== undefined && hit.z > 0.15 ? hit.z : DEVICE_HEIGHT[device.kind] ?? 1.2));
      select({ kind: "device", id: device.id });
      const after = props.devices.find(item => item.id !== device.id && !current.placements.some(p => p.device_id === item.id));
      setPending(after?.id ?? "");
      props.setNotice(after ? `${device.name} ✓ · ${t("nextDevice")}: ${after.name}` : `${device.name} ✓`);
      if (!after) finishTool();
      return;
    }
    if (tool === "sensor") {
      const id = nextId("sensor", current.sensors.map(item => item.id));
      commit({ ...current, sensors: [...current.sensors, { id, name: `Radar ${current.sensors.length + 1}`, kind: "LD2450", ...toPercent(point, dimsRef.current) }] });
      select({ kind: "sensor", id }); props.setNotice(t("sensorPlaced")); finishTool();
    }
  };

  // ---- moving (2D drags and 3D drags share what they do) ----
  const moveItem = (kind: string, id: string, point: Point, delta: Point) => {
    const current = modelRef.current;
    let next = current;
    switch (kind) {
      case "terrain": next = { ...current, terrain: { points: translatePoints(current.terrain.points, delta.x, delta.y) } }; break;
      case "building": next = moveBuilding(current, id, delta.x, delta.y); break;
      case "feature": {
        // The strips of one sidewalk move together.
        const group = current.features.find(item => item.id === id)?.group;
        next = { ...current, features: current.features.map(item => (group ? item.group === group : item.id === id) ? { ...item, x: round2(item.x + delta.x), y: round2(item.y + delta.y) } : item) };
        break;
      }
      case "camera": next = { ...current, cameras: current.cameras.map(item => item.id === id ? { ...item, ...toPercent(point, dimsRef.current) } : item) }; break;
      case "device": next = { ...current, placements: current.placements.map(item => item.device_id === id ? { ...item, x: round2(point.x), y: round2(point.y) } : item) }; break;
      case "sensor": next = { ...current, sensors: current.sensors.map(item => item.id === id ? { ...item, ...toPercent(point, dimsRef.current) } : item) }; break;
      case "roofItem": {
        const item = current.roofItems.find(entry => entry.id === id), owner = item && current.buildings.find(building => building.id === item.buildingId);
        if (item && owner && pointInPolygon(point, owner.points)) next = { ...current, roofItems: current.roofItems.map(entry => entry.id === id ? { ...entry, x: round2(point.x), y: round2(point.y) } : entry) };
        break;
      }
      case "opening": {
        const opening = current.openings.find(entry => entry.id === id), owner = opening && current.buildings.find(building => building.id === opening.buildingId);
        if (!opening || !owner) break;
        const found = nearestOnOutline(owner.points, point), length = edgeOf(owner.points, found.edge).length, width = Math.min(opening.width, Math.max(0.3, length - 0.2));
        next = { ...current, openings: current.openings.map(entry => entry.id === id ? { ...entry, edge: found.edge, width: round2(width), offset: round2(clamp(found.along - width / 2, 0.1, Math.max(0.1, length - width - 0.1))) } : entry) };
        break;
      }
      case "wallLamp": {
        const lamp = current.wallLamps.find(entry => entry.id === id), owner = lamp && current.buildings.find(building => building.id === lamp.buildingId);
        if (!lamp || !owner) break;
        const found = nearestOnOutline(owner.points, point);
        next = { ...current, wallLamps: current.wallLamps.map(entry => entry.id === id ? { ...entry, edge: found.edge, offset: round2(found.along) } : entry) };
        break;
      }
    }
    commit(next, { history: false });
  };
  const turnDevice = (kind: "camera" | "sensor", id: string, point: Point) => {
    const current = modelRef.current, item = (kind === "camera" ? current.cameras : current.sensors).find(entry => entry.id === id);
    if (!item) return;
    const apex = toMetres(item, dimsRef.current), heading = Math.round(((Math.atan2(point.y - apex.y, point.x - apex.x) * 180 / Math.PI) + 360) % 360 / 5) * 5 % 360;
    commit(kind === "camera" ? { ...current, cameras: current.cameras.map(entry => entry.id === id ? { ...entry, heading } : entry) } : { ...current, sensors: current.sensors.map(entry => entry.id === id ? { ...entry, heading } : entry) }, { history: false });
  };
  const dragPlan = (target: DragTarget, point: Point, delta: Point) => {
    const current = modelRef.current;
    switch (target.kind) {
      case "terrain-vertex": commit({ ...current, terrain: { points: moveVertex(current.terrain.points, target.index, point) } }, { history: false }); break;
      case "building-vertex": { const building = current.buildings.find(item => item.id === target.id); if (building) commit(setFootprint(current, target.id, moveVertex(building.points, target.index, point)), { history: false }); break; }
      case "building-rotate": {
        const building = current.buildings.find(item => item.id === target.id);
        if (!building) break;
        const c = { x: building.points.reduce((sum, p) => sum + p.x, 0) / building.points.length, y: building.points.reduce((sum, p) => sum + p.y, 0) / building.points.length };
        const before = Math.atan2(point.y - delta.y - c.y, point.x - delta.x - c.x), after = Math.atan2(point.y - c.y, point.x - c.x);
        let turn = (after - before) * 180 / Math.PI;
        if (turn > 180) turn -= 360; if (turn < -180) turn += 360;
        commit(rotateBuilding(current, target.id, turn), { history: false });
        break;
      }
      case "heading-camera": turnDevice("camera", target.id, point); break;
      case "heading-sensor": turnDevice("sensor", target.id, point); break;
      default: moveItem(target.kind === "wall-lamp" ? "wallLamp" : target.kind === "roof-item" ? "roofItem" : target.kind, "id" in target ? target.id : "", point, delta);
    }
  };
  const drag3d = (target: Target3D, point: Point, delta: Point) => moveItem(target.kind, target.id, { x: round2(snapTo(point.x, GRID_M)), y: round2(snapTo(point.y, GRID_M)) }, { x: delta.x, y: delta.y });
  const elevate3d = (target: Target3D, dz: number) => {
    const current = modelRef.current, lift = (value: number, min = 0) => round2(Math.max(min, value + dz));
    let next = current;
    switch (target.kind) {
      case "building": next = { ...current, buildings: current.buildings.map(item => item.id === target.id ? { ...item, base: lift(item.base, -5) } : item) }; break;
      case "opening": next = { ...current, openings: current.openings.map(item => item.id === target.id ? { ...item, sill: lift(item.sill) } : item) }; break;
      case "wallLamp": next = { ...current, wallLamps: current.wallLamps.map(item => item.id === target.id ? { ...item, z: lift(item.z) } : item) }; break;
      case "feature": next = { ...current, features: current.features.map(item => item.id === target.id ? { ...item, z: lift(item.z) } : item) }; break;
      case "camera": next = { ...current, cameras: current.cameras.map(item => item.id === target.id ? { ...item, z: lift(item.z ?? 2.4, 0.1) } : item) }; break;
      case "sensor": next = { ...current, sensors: current.sensors.map(item => item.id === target.id ? { ...item, z: lift(item.z ?? 1.5, 0.1) } : item) }; break;
      case "device": next = { ...current, placements: current.placements.map(item => item.device_id === target.id ? { ...item, z: lift(item.z) } : item) }; break;
      default: break;
    }
    commit(next, { history: false });
  };

  const placeFence = (from: Point, to: Point, kind: "fence" | "sidewalk") => {
    const added = addStrip(modelRef.current, kind, from, to);
    if (added) { commit(added.model); select({ kind: "feature", id: added.id }); }
  };
  const turn = (axis: TurnAxis, degrees: number) => {
    if (!canTurnAbout(selection, axis)) { props.setNotice(t("cannotTurn")); return; }
    edit(m => turnSelected(m, selection, axis, degrees), `turn:${axis}`);
  };
  const removeCurrent = () => {
    if (selection.kind === "camera") { props.setNotice(t("cameraManagedInConfig")); return; }
    if (selection.kind === "terrain" && selection.vertex === undefined) { props.setNotice(t("terrainCannotDelete")); return; }
    const next = removeSelected(modelRef.current, selection);
    if (next === modelRef.current) return;
    commit(next);
    setSelection(selection.kind === "building" && selection.vertex !== undefined ? { kind: "building", id: selection.id } : selection.kind === "terrain" ? { kind: "terrain" } : { kind: "none" });
    props.setNotice(t("objectDeleted"));
  };
  const duplicateCurrent = () => {
    if (selection.kind !== "building") return;
    const copy = duplicateBuilding(modelRef.current, selection.id);
    if (copy) { commit(copy.model); select({ kind: "building", id: copy.id }); }
  };
  const nudge = (dx: number, dy: number) => {
    const s = selection;
    if (s.kind === "building") moveItem("building", s.id, { x: 0, y: 0 }, { x: dx, y: dy });
    else if (s.kind === "feature") moveItem("feature", s.id, { x: 0, y: 0 }, { x: dx, y: dy });
    else return false;
    return true;
  };

  // The Devices menu can ask for a device to be placed: the designer picks the tool and waits for the click.
  useEffect(() => {
    if (!props.wantsToPlace) return;
    setPending(props.wantsToPlace); setTool("device");
    props.setNotice(`${t("clickToPlaceDevice")}: ${props.devices.find(item => item.id === props.wantsToPlace)?.name ?? props.wantsToPlace}`);
    props.clearWantsToPlace();
  }, [props.wantsToPlace]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ---- keys: a letter picks a tool, Escape drops the action, Delete removes, Ctrl+Z undoes ----
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const ctrl = event.ctrlKey || event.metaKey;
      if (ctrl && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if (ctrl && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); return; }
      if (ctrl && event.key.toLowerCase() === "d") { event.preventDefault(); duplicateCurrent(); return; }
      if (ctrl || event.altKey) return;
      if (event.key === "Escape") { setTool("select"); setSelection({ kind: "none" }); return; }
      if (event.key === "Delete" || (event.key === "Backspace" && tool === "select")) { event.preventDefault(); removeCurrent(); return; }
      if (event.key.startsWith("Arrow") && tool === "select") {
        const step = event.shiftKey ? 1 : NUDGE, dx = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0, dy = event.key === "ArrowUp" ? step : event.key === "ArrowDown" ? -step : 0;
        if (nudge(dx, dy)) event.preventDefault();
        return;
      }
      const turnKey: Record<string, [TurnAxis, number]> = { "[": ["yaw", TURN_STEP], "]": ["yaw", -TURN_STEP], ",": ["pitch", -TURN_STEP], ".": ["pitch", TURN_STEP], ";": ["roll", TURN_STEP], "'": ["roll", -TURN_STEP] };
      if (turnKey[event.key]) { event.preventDefault(); turn(turnKey[event.key][0], turnKey[event.key][1]); return; }
      const chosen = event.key.length === 1 ? toolForKey(event.key, view) : undefined;
      if (chosen) setTool(chosen);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const switchView = (next: "2d" | "3d") => {
    setView(next);
    // The tool panel is the same in both views; a tool the other view cannot use falls back to selecting.
    if (!toolWorksIn(tool, next)) setTool("select");
  };

  const actions = { undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0, turn, canTurn: (axis: TurnAxis) => canTurnAbout(selection, axis), remove: removeCurrent, canRemove: selection.kind !== "none" && selection.kind !== "camera" && !(selection.kind === "terrain" && selection.vertex === undefined) };
  const shared = actionSections(t, actions);
  const planSections = [...toolSections(t, "2d", tool, setTool), ...shared];

  const dimensionsBar = <div className="designer-status">
    <span title={t("workArea")}>{dimensions.width} × {dimensions.depth} m</span>
    <span>{model.buildings.length} {t("buildingsCount").toLowerCase()}</span>
    <span>{model.cameras.length} {t("toolCamera").toLowerCase()} · {model.sensors.length} {t("toolSensor").toLowerCase()}</span>
  </div>;

  return <section className="layout-workspace advanced-designer unified-site-designer">
    <div className="panel-heading unified-designer-heading">
      <div><p className="eyebrow">{t("siteDesigner")}</p><h2>{t("siteDesignerTitle")}</h2><p className="muted">{view === "2d" ? t("site2dProfessionalHelp") : t("site3dProfessionalHelp")}</p></div>
      <div className="designer-heading-actions">
        <div className="designer-view-actions">
          <div className="designer-view-toggle" role="tablist"><button className={view === "2d" ? "active" : ""} onClick={() => switchView("2d")}>{t("view2d")}</button><button className={view === "3d" ? "active" : ""} onClick={() => switchView("3d")}>{t("view3d")}</button></div>
          <button className="designer-icon-button" onClick={undo} disabled={past.current.length === 0} title={`${t("undo")} (Ctrl+Z)`} aria-label={t("undo")}>{ICON.undo}</button>
          <button className="designer-icon-button" onClick={redo} disabled={future.current.length === 0} title={`${t("redo")} (Ctrl+Y)`} aria-label={t("redo")}>{ICON.redo}</button>
          <button onClick={props.openVersions} title={t("versionsTitle")}>{t("versionsButton")}</button>
          <button className="designer-save" onClick={props.save}>{t("savePreferences")}</button>
        </div>
        {dimensionsBar}
      </div>
    </div>
    <div className="site-designer-grid">
      <div className="designer-canvas pro-canvas" ref={canvas}>
        {view === "2d"
          ? <>
              <Plan2D t={t} devices={props.devices} dimensions={dimensions} model={model} selection={selection} tool={tool} activeFloor={floorsChosen} floorCount={floorCount} fitSignal={fitSignal}
                onSelect={select} onDragStart={beginGesture} onDrag={dragPlan} onPlace={place} onFinishPolygon={finishPolygon} onFinishRect={finishRect} onPlaceLine={placeFence}
                onInsertVertex={insertVertex} onFloor={setActiveFloor} onNotice={props.setNotice} />
              <FloatingToolbox storageKey="armor-studio-toolbox-2d-v1" title={t("toolboxTitle2d")} sections={planSections} containerRef={canvas} labels={{ drag: t("toolboxDrag"), collapse: t("toolboxCollapse"), expand: t("toolboxExpand") }} initial={{ x: 32, y: 32 }} />
            </>
          : <Suspense fallback={<div className="viewport-loading">{t("loading")}</div>}>
              <Viewport3D t={t} devices={props.devices} dimensions={dimensions} model={model} selection={selection} tool={tool} onTool={setTool} activeFloor={floorsChosen} floorCount={floorCount} onFloor={setActiveFloor}
                onSelect={select} onDragStart={beginGesture} onMove={drag3d} onElevate={elevate3d} onPlace={place} onNotice={props.setNotice} sharedSections={shared} />
            </Suspense>}
        {props.notice && props.notice !== t("configuration") && <p className="notice canvas-notice">{props.notice}</p>}
      </div>
      <Inspector t={t} dimensions={dimensions} setDimensions={setWorkArea} model={model} selection={selection} edit={edit} onSelect={select} onRemove={removeCurrent} onDuplicate={duplicateCurrent} onRectTerrain={setRectTerrain} nodeIds={props.nodeIds} onTool={setTool} devices={props.devices} pendingDevice={pending} onPickDevice={id => { setPending(id); setTool("device"); props.setNotice(`${t("clickToPlaceDevice")}: ${props.devices.find(item => item.id === id)?.name ?? id}`); }} onOpenDevices={props.openDevices} />
    </div>
  </section>;
}

/** Whether a selection still points at something in the model (after undo or delete). */
function stillThere(model: SiteModel, selection: Selection): boolean {
  switch (selection.kind) {
    case "none": case "terrain": return true;
    case "building": return model.buildings.some(item => item.id === selection.id);
    case "opening": return model.openings.some(item => item.id === selection.id);
    case "roofItem": return model.roofItems.some(item => item.id === selection.id);
    case "wallLamp": return model.wallLamps.some(item => item.id === selection.id);
    case "feature": return model.features.some(item => item.id === selection.id);
    case "camera": return model.cameras.some(item => item.id === selection.id);
    case "sensor": return model.sensors.some(item => item.id === selection.id);
    case "device": return model.placements.some(item => item.device_id === selection.id);
  }
}
