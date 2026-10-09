/**
 * The 2D plan: a CAD-style drawing of the whole site. You draw the terrain and the buildings line by line (with live
 * dimensions, snapping and typed lengths), then place doors and windows on any floor, lamps on walls and posts on the
 * ground, chimneys, solar panels and antennas on roofs, and the cameras and radars anywhere. Everything is drawn from
 * the same model as the 3D view and can be selected, dragged, rotated and have its corners moved.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import type { Building, Camera, Dimensions, Point, Sensor, SiteFeature } from "../domain";
import type { StudioDevice } from "../api";
import { deviceProblem, KIND_COLOUR, kindGlyph, MAIN_FIELD } from "../deviceKinds";
import { extraShape, SMALL_EXTRA_KINDS } from "./extraShapes";
import { bounds, centroid, edgeOf, nearestOnOutline, offsetPolygon, pointInPolygon, roofLines, signedArea } from "./geometry";
import { ICON } from "./icons";
import {
  arcPoints, cameraLensDeg, cameraTeleDeg, cameraTeleRangeM, cameraZoom, cameraView, clamp, isMotorised, fitTransform, formatMetres, headingOf, niceScaleLength, radarView, round2, sectorPoints, snapTo, toMetres, type Selection, type Tool,
} from "./model";
import type { SiteModel } from "./ops";

export type DragTarget =
  | { kind: "terrain" } | { kind: "terrain-vertex"; index: number }
  | { kind: "building"; id: string } | { kind: "building-vertex"; id: string; index: number } | { kind: "building-rotate"; id: string }
  | { kind: "opening" | "wall-lamp" | "roof-item" | "feature" | "camera" | "sensor" | "device" | "heading-camera" | "heading-sensor"; id: string };

/** What was under the pointer when a placing tool was used. */
export type PlaceHit = { edge?: { buildingId: string; edge: number; along: number; distance: number }; building?: string; /** The floor clicked, when the view knows it (the 3D view does). */ floor?: number; /** The height clicked, in metres, when the view knows it. */ z?: number };

export type PlanProps = {
  t: (key: string) => string;
  dimensions: Dimensions; model: SiteModel; selection: Selection; tool: Tool; devices: StudioDevice[];
  /** The floor being worked on (-1 shows every floor). */
  activeFloor: number; floorCount: number; fitSignal: number;
  onSelect: (selection: Selection) => void;
  onDragStart: () => void;
  onDrag: (target: DragTarget, point: Point, delta: Point) => void;
  onPlace: (point: Point, hit: PlaceHit) => void;
  onFinishPolygon: (kind: "terrain" | "building", points: Point[]) => void;
  onFinishRect: (kind: "terrain" | "building", a: Point, b: Point) => void;
  /** A fence from one point to the next (the plan keeps going from the end, so a fence can be drawn in a run). */
  onPlaceLine: (from: Point, to: Point, kind: "fence" | "sidewalk") => void;
  onInsertVertex: (owner: { kind: "terrain" } | { kind: "building"; id: string }, edge: number, at: Point) => void;
  onFloor: (floor: number) => void;
  onNotice: (text: string) => void;
};

type View = { scale: number; x: number; y: number };
const MIN_SCALE = 4, MAX_SCALE = 260, RULER = 22;
const isPlacing = (tool: Tool) => tool !== "select" && tool !== "move" && tool !== "elevate";
const isDrawing = (tool: Tool) => tool === "terrain-rect" || tool === "terrain-poly" || tool === "building-rect" || tool === "building-poly";
const EDGE_TOOLS: ReadonlySet<Tool> = new Set(["door", "window", "garage", "arch", "wall-lamp"]);
const ROOF_TOOLS: ReadonlySet<Tool> = new Set(["chimney", "roof-solar", "antenna", "gutter", "downpipe"]);

/** The nearest corner of any outline, if one is within `tolerance`; what is being dragged is never snapped to itself. */
function nearestCorner(model: SiteModel, point: Point, tolerance: number, skip: { terrain?: boolean; building?: string } = {}): Point | null {
  let best: Point | null = null, bestDistance = tolerance;
  for (const corner of [...(skip.terrain ? [] : model.terrain.points), ...model.buildings.filter(building => building.id !== skip.building).flatMap(building => building.points)]) {
    const distance = Math.hypot(corner.x - point.x, corner.y - point.y);
    if (distance < bestDistance) { best = corner; bestDistance = distance; }
  }
  return best;
}

export function Plan2D(props: PlanProps) {
  const { t, dimensions, model, selection, tool, activeFloor } = props;
  const host = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 900, height: 560 });
  const [view, setView] = useState<View>({ scale: 16, x: 60, y: 500 });
  const [fitted, setFitted] = useState(false);
  /** Once the person has zoomed or panned the view stays where they put it; until then it re-fits when the panel changes size. */
  const adjusted = useRef(false);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [snapOn, setSnapOn] = useState(true);
  const [gridOn, setGridOn] = useState(true);
  const [roofsOn, setRoofsOn] = useState(true);
  const [dimsOn, setDimsOn] = useState(true);
  const [space, setSpace] = useState(false);
  const [draft, setDraft] = useState<Point[]>([]);
  const [rectStart, setRectStart] = useState<Point | null>(null);
  const [typed, setTyped] = useState("");
  const [lineStart, setLineStart] = useState<Point | null>(null);
  const [ortho, setOrtho] = useState(false);
  const drag = useRef<{ target: DragTarget; last: Point } | null>(null);
  const panning = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const moved = useRef(false);
  const consumed = useRef(false);
  const pressStart = useRef<Point | null>(null);
  const downAt = useRef<{ x: number; y: number } | null>(null);
  const inv = 1 / view.scale;
  const Y = (y: number) => -y;

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => { const box = entries[0]?.contentRect; if (box && box.width > 0) setSize({ width: box.width, height: box.height }); });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const contentBox = useMemo(() => {
    const points = [...model.terrain.points, ...model.buildings.flatMap(building => building.points)];
    const box = points.length ? bounds(points) : { minX: 0, minY: 0, maxX: dimensions.width, maxY: dimensions.depth };
    return { minX: box.minX - 3, minY: box.minY - 3, maxX: box.maxX + 3, maxY: box.maxY + 3 };
  }, [model.terrain.points, model.buildings, dimensions.width, dimensions.depth]);
  const fit = useCallback(() => {
    const result = fitTransform(contentBox, { width: size.width - RULER, height: size.height - RULER }, 70);
    setView({ scale: clamp(result.scale, MIN_SCALE, MAX_SCALE), x: RULER + result.x, y: RULER + result.y });
  }, [contentBox, size.width, size.height]);
  useEffect(() => { if (size.width > 0 && !fitted) { fit(); setFitted(true); } }, [fit, fitted, size.width]);
  useEffect(() => { if (props.fitSignal > 0) { adjusted.current = false; fit(); } }, [props.fitSignal]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!adjusted.current && size.width > 0 && fitted) fit(); }, [size.width, size.height]); // eslint-disable-line react-hooks/exhaustive-deps

  // A different tool starts from a clean sheet.
  useEffect(() => { setDraft([]); setRectStart(null); setTyped(""); setLineStart(null); }, [tool]);

  const toSite = (clientX: number, clientY: number): Point => {
    const box = svg.current!.getBoundingClientRect();
    return { x: (clientX - box.left - view.x) / view.scale, y: -(clientY - box.top - view.y) / view.scale };
  };
  const zoomAt = (factor: number, px: number, py: number) => { adjusted.current = true; return setView(current => {
    const scale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE), ratio = scale / current.scale;
    return { scale, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio };
  }); };
  const onWheel = (event: ReactWheelEvent<SVGSVGElement>) => { const box = svg.current!.getBoundingClientRect(); zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, event.clientX - box.left, event.clientY - box.top); };

  const gridStep = view.scale < 10 ? 1 : 0.25;
  /** Snap a point to a corner if one is near, else to the grid; with Ctrl held nothing snaps. */
  const snap = (point: Point, from?: Point): Point => {
    let next = point;
    if (ortho && from) {
      const dx = point.x - from.x, dy = point.y - from.y, angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), length = Math.hypot(dx, dy);
      next = { x: from.x + Math.cos(angle) * length, y: from.y + Math.sin(angle) * length };
    }
    if (!snapOn) return { x: round2(next.x), y: round2(next.y) };
    const corner = nearestCorner(model, next, 10 * inv, skipOf());
    return corner ?? { x: round2(snapTo(next.x, gridStep)), y: round2(snapTo(next.y, gridStep)) };
  };
  const skipOf = (): { terrain?: boolean; building?: string } => {
    const target = drag.current?.target;
    if (!target) return {};
    if (target.kind === "terrain" || target.kind === "terrain-vertex") return { terrain: true };
    if (target.kind === "building" || target.kind === "building-vertex" || target.kind === "building-rotate") return { building: target.id };
    return {};
  };

  // ---- keyboard while drawing --------------------------------------------------------------------------------------------
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.code === "Space") { setSpace(true); event.preventDefault(); return; }
      if (event.key === "Shift") { setOrtho(true); return; }
      if (event.key === "Escape") setLineStart(null);
      if (!isDrawing(tool)) return;
      if (event.key === "Escape") { setDraft([]); setRectStart(null); setTyped(""); return; }
      if (tool.endsWith("poly")) {
        if (event.key === "Backspace") { event.preventDefault(); if (typed) setTyped(value => value.slice(0, -1)); else setDraft(points => points.slice(0, -1)); return; }
        if (event.key === "Enter") {
          event.preventDefault();
          if (typed && draft.length && cursor) {
            const last = draft[draft.length - 1], length = Number(typed.replace(",", "."));
            const angle = Math.atan2(cursor.y - last.y, cursor.x - last.x);
            if (Number.isFinite(length) && length > 0) { setDraft(points => [...points, { x: round2(last.x + Math.cos(angle) * length), y: round2(last.y + Math.sin(angle) * length) }]); setTyped(""); return; }
          }
          finishPolygon();
          return;
        }
        if (/^[0-9.,]$/.test(event.key) && draft.length) { setTyped(value => (value + event.key).slice(0, 8)); event.preventDefault(); }
      }
    };
    const up = (event: KeyboardEvent) => { if (event.code === "Space") setSpace(false); if (event.key === "Shift") setOrtho(false); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  });

  /** Double-clicking a side of the selected terrain or building adds a corner right there. */
  const addCornerAt = (point: Point) => {
    if (tool !== "select") return;
    const tolerance = 9 * inv;
    if (selection.kind === "terrain") {
      const found = nearestOnOutline(model.terrain.points, point);
      if (found.distance < tolerance) props.onInsertVertex({ kind: "terrain" }, found.edge, snap(found.point));
    } else if (selection.kind === "building") {
      const building = model.buildings.find(item => item.id === selection.id);
      const found = building ? nearestOnOutline(building.points, point) : null;
      if (building && found && found.distance < tolerance) props.onInsertVertex({ kind: "building", id: building.id }, found.edge, snap(found.point));
    }
  };
  const finishPolygon = () => {
    if (draft.length < 3) { props.onNotice(t("polygonNeedsThree")); return; }
    props.onFinishPolygon(tool === "terrain-poly" ? "terrain" : "building", draft);
    setDraft([]); setTyped("");
  };

  // ---- pointer handling ---------------------------------------------------------------------------------------------------
  const beginDrag = (target: DragTarget, selectionOf: Selection, event: ReactPointerEvent<SVGElement>) => {
    if (event.button !== 0 || space) return;
    if (isPlacing(tool)) return;                       // a placing tool acts on the click, not on a drag
    event.stopPropagation();
    consumed.current = true;
    props.onSelect(selectionOf);
    props.onDragStart();
    const start = toSite(event.clientX, event.clientY);
    drag.current = { target, last: start };
    drag.current.last = snapTargetPoint(target, start);
    moved.current = false;
    svg.current?.setPointerCapture(event.pointerId);
  };
  const snapTargetPoint = (target: DragTarget, point: Point): Point => target.kind.startsWith("heading") || target.kind === "building-rotate" ? point : snap(point);

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    consumed.current = false;
    downAt.current = { x: event.clientX, y: event.clientY };
    pressStart.current = event.button === 0 && !space && isDrawing(tool) && tool.endsWith("rect") ? snap(toSite(event.clientX, event.clientY)) : null;
    const onBackground = event.target === svg.current || (event.target as Element).getAttribute("data-bg") === "1";
    const wantsPan = event.button === 1 || event.button === 2 || (event.button === 0 && (space || (!isPlacing(tool) && onBackground)));
    if (!wantsPan) return;
    event.preventDefault();
    panning.current = { startX: event.clientX, startY: event.clientY, x: view.x, y: view.y };
    moved.current = false;
    svg.current?.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const raw = toSite(event.clientX, event.clientY);
    setCursor(raw);
    if (panning.current) {
      const dx = event.clientX - panning.current.startX, dy = event.clientY - panning.current.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
      adjusted.current = true;
      setView(current => ({ ...current, x: panning.current!.x + dx, y: panning.current!.y + dy }));
      return;
    }
    const active = drag.current;
    if (!active) return;
    const now = snapTargetPoint(active.target, raw), delta = { x: now.x - active.last.x, y: now.y - active.last.y };
    if (Math.abs(delta.x) + Math.abs(delta.y) > 1e-9) moved.current = true;
    props.onDrag(active.target, now, delta);
    active.last = now;
  };
  const endPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (svg.current?.hasPointerCapture(event.pointerId)) svg.current.releasePointerCapture(event.pointerId);
    drag.current = null; panning.current = null;
    // A drag rectangle: releasing far from where it started completes it.
    const start = pressStart.current;
    pressStart.current = null;
    if (start && isDrawing(tool) && tool.endsWith("rect") && downAt.current && Math.hypot(event.clientX - downAt.current.x, event.clientY - downAt.current.y) > 8) {
      props.onFinishRect(tool === "terrain-rect" ? "terrain" : "building", start, snap(toSite(event.clientX, event.clientY), start));
      setRectStart(null); moved.current = true;
    }
  };

  /** What a click at `point` would land on: the nearest wall of any building (for doors, windows and lamps), or the building it is inside. */
  const hitAt = (point: Point): PlaceHit => {
    let best: PlaceHit["edge"];
    for (const building of model.buildings) {
      const found = nearestOnOutline(building.points, point);
      if (found.distance < 0.9 && (!best || found.distance < best.distance)) best = { buildingId: building.id, edge: found.edge, along: found.along, distance: found.distance };
    }
    return best ? { edge: best } : {};
  };
  const onBackgroundClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (consumed.current) { consumed.current = false; moved.current = false; return; }
    if (moved.current) { moved.current = false; return; }
    if (space) return;
    const raw = toSite(event.clientX, event.clientY);
    if (tool === "select" || tool === "move") { props.onSelect(pointInPolygon(raw, model.terrain.points) ? { kind: "terrain" } : { kind: "none" }); return; }
    if (tool === "elevate") return;
    if (tool === "fence" || tool === "sidewalk") {
      // A click on (or beside) a building with the sidewalk tool lays a sidewalk all round it.
      if (tool === "sidewalk" && !lineStart) {
        const owner = model.buildings.find(building => pointInPolygon(raw, building.points)) ?? model.buildings.find(building => nearestOnOutline(building.points, raw).distance < 1.6);
        if (owner) { props.onPlace(raw, { building: owner.id }); return; }
      }
      const point = snap(raw, lineStart ?? undefined);
      if (lineStart) { if (Math.hypot(point.x - lineStart.x, point.y - lineStart.y) >= 0.3) { props.onPlaceLine(lineStart, point, tool); setLineStart(point); } } else setLineStart(point);
      return;
    }
    if (tool === "terrain-poly" || tool === "building-poly") {
      const point = snap(raw, draft[draft.length - 1]);
      if (draft.length >= 3 && Math.hypot(point.x - draft[0].x, point.y - draft[0].y) < 12 * inv) { finishPolygon(); return; }
      if (typed && draft.length) { setTyped(""); }
      setDraft(points => [...points, point]);
      return;
    }
    if (tool === "terrain-rect" || tool === "building-rect") {
      const point = snap(raw, rectStart ?? undefined);
      if (!rectStart) { setRectStart(point); return; }
      props.onFinishRect(tool === "terrain-rect" ? "terrain" : "building", rectStart, point);
      setRectStart(null);
      return;
    }
    const hit = EDGE_TOOLS.has(tool) ? hitAt(raw) : {};
    props.onPlace(snap(raw), hit);
  };

  // ---- drawing helpers -------------------------------------------------------------------------------------------------------
  const path = (points: readonly Point[], close = true) => points.map((p, index) => `${index ? "L" : "M"}${p.x} ${Y(p.y)}`).join("") + (close ? "Z" : "");
  const label = (text: string, at: Point, className = "p-dim", rotate = 0, dy = 0, size = 11) => (
    <text x={at.x} y={Y(at.y)} className={className} fontSize={size * inv} textAnchor="middle" transform={`rotate(${rotate} ${at.x} ${Y(at.y)}) translate(0 ${dy * inv})`} pointerEvents="none">{text}</text>
  );
  /** A length label lying along a side, kept upright and on the outside. */
  const sideLabel = (a: Point, b: Point, className = "p-dim", offsetPx = 12) => {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length < 0.3) return null;
    const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI, upright = Math.abs(angle) > 90 ? angle + 180 : angle;
    return label(formatMetres(length), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, className, -upright, -offsetPx);
  };

  const gridPath = useMemo(() => {
    const box = contentBox, parts = { minor: "", major: "" };
    const x0 = Math.floor(box.minX), x1 = Math.ceil(box.maxX), y0 = Math.floor(box.minY), y1 = Math.ceil(box.maxY);
    for (let x = x0; x <= x1; x += 1) (x % 5 === 0 ? (parts.major += `M${x} ${Y(y0)}V${Y(y1)}`) : (parts.minor += `M${x} ${Y(y0)}V${Y(y1)}`));
    for (let y = y0; y <= y1; y += 1) (y % 5 === 0 ? (parts.major += `M${x0} ${Y(y)}H${x1}`) : (parts.minor += `M${x0} ${Y(y)}H${x1}`));
    return parts;
  }, [contentBox]);

  const step = niceScaleLength(view.scale, 64);
  const rulerX: number[] = [], rulerY: number[] = [];
  const left = (0 - view.x) / view.scale, right = (size.width - view.x) / view.scale, top = view.y / view.scale, bottom = (view.y - size.height) / view.scale;
  for (let x = Math.ceil(left / step) * step; x <= right; x += step) rulerX.push(round2(x));
  for (let y = Math.ceil(bottom / step) * step; y <= top; y += step) rulerY.push(round2(y));
  const screenX = (x: number) => view.x + x * view.scale, screenY = (y: number) => view.y - y * view.scale;
  const scaleBar = niceScaleLength(view.scale, 110);

  // ---- the parts ----------------------------------------------------------------------------------------------------------------
  const selected = (kind: Selection["kind"], id?: string) => selection.kind === kind && (id === undefined || ("id" in selection && selection.id === id));
  const terrainSelected = selection.kind === "terrain";
  const interactive = !isPlacing(tool);

  const terrainShape = <g className={`p-terrain ${terrainSelected ? "selected" : ""}`}>
    <path d={path(model.terrain.points)} className="p-terrain-fill" style={model.terrain.color ? { fill: model.terrain.color, fillOpacity: 0.55 } : undefined} data-bg={interactive ? "1" : undefined}
      onPointerDown={event => { if (interactive && terrainSelected) beginDrag({ kind: "terrain" }, { kind: "terrain" }, event); }} />
    <path d={path(model.terrain.points)} className="p-terrain-edge" pointerEvents="none" />
    {dimsOn && (terrainSelected || draft.length === 0) && model.terrain.points.map((p, index) => <g key={index}>{sideLabel(p, model.terrain.points[(index + 1) % model.terrain.points.length], "p-dim terrain", 10)}</g>)}
    {terrainSelected && <>
      {model.terrain.points.map((_, index) => { const { a, b } = edgeOf(model.terrain.points, index); const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        return <circle key={`m${index}`} cx={mid.x} cy={Y(mid.y)} r={6 * inv} className="p-add-handle" onPointerDown={event => { event.stopPropagation(); consumed.current = true; props.onInsertVertex({ kind: "terrain" }, index, mid); }}><title>{t("addCorner")}</title></circle>; })}
      {model.terrain.points.map((p, index) => <circle key={`v${index}`} cx={p.x} cy={Y(p.y)} r={7 * inv} className={`p-vertex ${selection.kind === "terrain" && selection.vertex === index ? "on" : ""}`}
        onPointerDown={event => beginDrag({ kind: "terrain-vertex", index }, { kind: "terrain", vertex: index }, event)} />)}
    </>}
  </g>;

  const featureShape = (feature: SiteFeature) => {
    const w = feature.width, d = feature.depth, chosen = selected("feature", feature.id);
    const body = (() => {
      switch (feature.kind) {
        case "road": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} className="p-road" /><path d={`M0 ${-d / 2}V${d / 2}`} className="p-road-line" /><path d={`M${-w / 2 + 0.12} ${-d / 2}V${d / 2}M${w / 2 - 0.12} ${-d / 2}V${d / 2}`} className="p-road-edge" /></>;
        case "path": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} className="p-path" /><path d={`M${-w / 2} ${-d / 2}V${d / 2}M${w / 2} ${-d / 2}V${d / 2}`} className="p-path-edge" /></>;
        case "entrance": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} className="p-steps" />{[1, 2, 3].map(i => <path key={i} d={`M${-w / 2} ${-d / 2 + d * i / 4}H${w / 2}`} className="p-steps-line" />)}<path d={`M0 ${d / 2 - 0.1}V${-d / 2 + 0.12}M${-0.16} ${-d / 2 + 0.3}L0 ${-d / 2 + 0.1}L0.16 ${-d / 2 + 0.3}`} className="p-steps-arrow" /></>;
        case "solar": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} className="p-solar" />{[1, 2, 3].map(i => <path key={`v${i}`} d={`M${-w / 2 + w * i / 4} ${-d / 2}V${d / 2}`} className="p-solar-line" />)}<path d={`M${-w / 2} 0H${w / 2}`} className="p-solar-line" /></>;
        case "canopy": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} className="p-canopy" /><path d={`M${-w / 2} ${-d / 2}L${w / 2} ${d / 2}M${-w / 2} ${d / 2}L${w / 2} ${-d / 2}`} className="p-canopy-line" /></>;
        case "pillar": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} className="p-pillar" /><path d={`M${-w / 2} ${-d / 2}L${w / 2} ${d / 2}M${-w / 2} ${d / 2}L${w / 2} ${-d / 2}`} className="p-pillar-line" /></>;
        case "lamp": return <><circle r={Math.max(w, 0.3) * 1.6} className="p-lamp-glow" /><circle r={Math.max(w, 0.16)} className="p-lamp" />{[0, 60, 120, 180, 240, 300].map(a => <path key={a} d={`M${Math.cos(a * Math.PI / 180) * 0.32} ${Math.sin(a * Math.PI / 180) * 0.32}L${Math.cos(a * Math.PI / 180) * 0.55} ${Math.sin(a * Math.PI / 180) * 0.55}`} className="p-lamp-ray" />)}</>;
        case "tree": {
          const style = feature.style ?? "oak";
          return <><circle r={w / 2} className={`p-tree ${style}`} />
            {style === "pine" && [0.7, 0.42].map(f => <circle key={f} r={w / 2 * f} className="p-tree-ring" />)}
            {style === "palm" && Array.from({ length: 7 }, (_, i) => <path key={i} d={`M0 0L${Math.cos(i * 0.9) * w / 2} ${Math.sin(i * 0.9) * w / 2}`} className="p-tree-ring" />)}
            {style === "bush" && [[-0.2, -0.1], [0.22, 0.05], [0, 0.24]].map(([cx, cy], i) => <circle key={i} cx={cx * w} cy={cy * w} r={w * 0.22} className="p-tree-ring" />)}
            {style === "oak" && [[-0.22, -0.12], [0.2, 0.1], [0.02, -0.26]].map(([cx, cy], i) => <circle key={i} cx={cx * w} cy={cy * w} r={w * 0.26} className="p-tree-ring" />)}
            <circle r={Math.max(0.1, w * 0.05)} className="p-trunk" /></>;
        }
        case "sidewalk": {
          const slabs = Math.min(80, Math.max(1, Math.round(w / 1.2)));
          return <><rect x={-w / 2} y={-d / 2} width={w} height={d} className={`p-sidewalk ${feature.style ?? "concrete"}`} />{Array.from({ length: slabs - 1 }, (_, i) => <path key={i} d={`M${-w / 2 + (w * (i + 1)) / slabs} ${-d / 2}V${d / 2}`} className="p-sidewalk-joint" />)}</>;
        }
        case "kennel": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} className="p-kennel" /><path d={`M0 ${-d / 2}V${d / 2}`} className="p-kennel-line" /><rect x={-w * 0.2} y={d / 2 - 0.12} width={w * 0.4} height={0.14} className="p-kennel-door" /></>;
        case "fence": {
          const posts = Math.max(1, Math.ceil(w / 2));
          return <><rect x={-w / 2} y={-Math.max(d, 0.1) / 2} width={w} height={Math.max(d, 0.1)} className={`p-fence ${feature.style ?? "mesh"}`} />{Array.from({ length: posts + 1 }, (_, i) => <circle key={i} cx={-w / 2 + (w * i) / posts} cy={0} r={0.09} className="p-fence-post" />)}</>;
        }
        case "fountain": return <><circle r={w / 2} className="p-fountain" /><circle r={w / 2 * 0.78} className="p-fountain-water" /><circle r={w * 0.2} className="p-fountain-tier" /><circle r={w * 0.06} className="p-fountain-jet" /></>;
        case "pool": {
          const style = feature.style ?? "rectangle";
          return style === "round" ? <><circle r={w / 2} className="p-pool-rim" /><circle r={w / 2 - 0.15} className="p-pool-water" /></>
            : style === "oval" ? <><ellipse rx={w / 2} ry={d / 2} className="p-pool-rim" /><ellipse rx={w / 2 - 0.15} ry={d / 2 - 0.15} className="p-pool-water" /></>
            : style === "l-shape" ? <><path d={`M${-w / 2} ${-d / 2}H${w / 2}V${0}H${0}V${d / 2}H${-w / 2}Z`} className="p-pool-rim" /><path d={`M${-w / 2 + 0.15} ${-d / 2 + 0.15}H${w / 2 - 0.15}V${-0.15}H${0.15}V${d / 2 - 0.15}H${-w / 2 + 0.15}Z`} className="p-pool-water" /></>
            : <><rect x={-w / 2} y={-d / 2} width={w} height={d} className="p-pool-rim" /><rect x={-w / 2 + 0.15} y={-d / 2 + 0.15} width={Math.max(0.1, w - 0.3)} height={Math.max(0.1, d - 0.3)} className="p-pool-water" /></>;
        }
        case "planter": {
          const style = feature.style ?? "box";
          return style === "round" ? <><circle r={w / 2} className="p-planter" /><circle r={w / 2 * 0.7} className="p-planter-soil" /></> : <><rect x={-w / 2} y={-d / 2} width={w} height={d} className="p-planter" /><rect x={-w / 2 + 0.06} y={-d / 2 + 0.06} width={Math.max(0.05, w - 0.12)} height={Math.max(0.05, d - 0.12)} className="p-planter-soil" /></>;
        }
        case "terrace": return <><rect x={-w / 2} y={-d / 2} width={w} height={d} className="p-terrace" />{(feature.style ?? "railed") === "railed" && <path d={`M${-w / 2} ${d / 2}V${-d / 2}H${w / 2}V${d / 2}`} className="p-terrace-rail" />}</>;
        case "coop": return <><rect x={-w / 2} y={-d / 2} width={w * 0.62} height={d} className="p-coop" /><rect x={-w / 2 + w * 0.62} y={-d * 0.28} width={w * 0.38} height={d * 0.56} className="p-coop-run" /><path d={`M${-w * 0.1} ${d / 2}L${-w * 0.1} ${d / 2 + 0.55}`} className="p-coop-ramp" /></>;
        case "gate": {
          const pillar = feature.style === "stone" ? 0.7 : 0.55, leaf = Math.max(1, w - 2 * pillar) / 2;
          return <><rect x={-w / 2} y={-pillar / 2} width={pillar} height={pillar} className="p-gate-pillar" /><rect x={w / 2 - pillar} y={-pillar / 2} width={pillar} height={pillar} className="p-gate-pillar" />
            <path d={`M${-w / 2 + pillar} 0H${-w / 2 + pillar + leaf * 2}`} className="p-gate-leaf" /><path d={`M${-w / 2 + pillar} 0A${leaf} ${leaf} 0 0 1 ${-w / 2 + pillar + leaf} ${leaf}M${w / 2 - pillar} 0A${leaf} ${leaf} 0 0 0 ${w / 2 - pillar - leaf} ${leaf}`} className="p-door-swing" /></>;
        }
        case "mast": return <><circle r={Math.max(w, 0.2)} className="p-mast" /><circle r={Math.max(w, 0.2) * 2.4} className="p-mast-ring" /><path d={`M${-0.7} 0H${0.7}M0 ${-0.7}V${0.7}`} className="p-mast-line" /></>;
        default: return extraShape(feature);
      }
    })();
    const roundish = feature.kind === "lamp" || feature.kind === "mast" || feature.kind === "tree" || feature.kind === "fountain";
    return <g key={feature.id} className={`p-feature ${feature.kind} ${feature.color ? "coloured" : ""} ${chosen ? "selected" : ""}`} transform={`translate(${feature.x} ${Y(feature.y)}) rotate(${-feature.rotation})`}
      style={feature.color ? { ["--c" as string]: feature.color } : undefined}
      onPointerDown={event => beginDrag({ kind: "feature", id: feature.id }, { kind: "feature", id: feature.id }, event)}>
      <g className="p-body">{body}</g>
      {(feature.kind === "lamp" || feature.kind === "mast" || feature.kind === "pillar" || feature.kind === "fence" || feature.kind === "sidewalk" || SMALL_EXTRA_KINDS.has(feature.kind)) && <circle r={Math.max(Math.max(w, d) / 2, 9 * inv)} className="p-device-hit" />}
      {chosen && (roundish ? <circle r={Math.max(w, 0.3) * 2.6} className="p-selection" /> : <rect x={-w / 2 - 0.1} y={-d / 2 - 0.1} width={w + 0.2} height={d + 0.2} className="p-selection" />)}
    </g>;
  };

  const buildingShape = (building: Building) => {
    const chosen = selection.kind === "building" && selection.id === building.id;
    const outer = offsetPolygon(building.points, building.thickness / 2), inner = offsetPolygon(building.points, -building.thickness / 2);
    const centre = centroid(building.points), edges = building.points.length;
    const roofPolylines = roofsOn ? roofLines(building.points, building.roof) : [];
    const overhang = building.roof.overhang > 0.05 ? offsetPolygon(building.points, building.roof.overhang) : null;
    const rotateHandle = { x: centre.x, y: centre.y + Math.max(1.5, Math.sqrt(Math.abs(signedArea(building.points))) * 0.55) };
    return <g key={building.id} className={`p-building ${chosen ? "selected" : ""}`}>
      <path d={path(building.points)} className="p-floor" data-bg={undefined}
        onPointerDown={event => beginDrag({ kind: "building", id: building.id }, { kind: "building", id: building.id }, event)} />
      <path d={`${path(outer)}${path(inner)}`} className="p-wall-ring" fillRule="evenodd" pointerEvents="none" style={building.color ? { fill: building.color } : undefined} />
      {overhang && roofsOn && <path d={path(overhang)} className="p-roof-outline" pointerEvents="none" style={building.roofColor ? { stroke: building.roofColor } : undefined} />}
      {roofPolylines.map((line, index) => <path key={index} d={path(line, false)} className={`p-roof-line ${building.roof.style === "gable" || building.roof.style === "shed" ? "ridge" : ""}`} pointerEvents="none" style={building.roofColor ? { stroke: building.roofColor } : undefined} />)}
      {model.openings.filter(item => item.buildingId === building.id).map(opening => {
        if (opening.edge >= edges) return null;
        const { a, ux, uy, nx, ny } = edgeOf(building.points, opening.edge);
        const start = { x: a.x + ux * opening.offset, y: a.y + uy * opening.offset }, end = { x: start.x + ux * opening.width, y: start.y + uy * opening.width };
        const cut = building.thickness + 0.06, ox = nx * cut / 2, oy = ny * cut / 2;
        const isDoor = opening.kind === "door", chosenOpening = selected("opening", opening.id), onFloor = activeFloor < 0 || opening.floor === activeFloor;
        // The leaf swings into the building: opposite the outward normal.
        const hingeEnd = { x: start.x - nx * opening.width, y: start.y - ny * opening.width };
        return <g key={opening.id} className={`p-opening ${opening.kind} ${opening.color ? "coloured" : ""} ${chosenOpening ? "selected" : ""} ${onFloor ? "" : "other-floor"}`} style={opening.color ? { ["--c" as string]: opening.color } : undefined}
          onPointerDown={event => beginDrag({ kind: "opening", id: opening.id }, { kind: "opening", id: opening.id }, event)}>
          <path d={path([{ x: start.x + ox, y: start.y + oy }, { x: end.x + ox, y: end.y + oy }, { x: end.x - ox, y: end.y - oy }, { x: start.x - ox, y: start.y - oy }])} className="p-opening-gap" />
          {opening.kind === "garage"
            ? <><line x1={start.x} y1={Y(start.y)} x2={end.x} y2={Y(end.y)} className="p-garage-line" />{Array.from({ length: 4 }, (_, i) => { const f = (i + 1) / 5, px = start.x + ux * opening.width * f, py = start.y + uy * opening.width * f; return <line key={i} x1={px - nx * 0.18} y1={Y(py - ny * 0.18)} x2={px + nx * 0.18} y2={Y(py + ny * 0.18)} className="p-garage-tick" />; })}</>
            : opening.kind === "opening"
            ? <line x1={start.x} y1={Y(start.y)} x2={end.x} y2={Y(end.y)} className="p-opening-line" />
            : isDoor
            ? <><line x1={start.x} y1={Y(start.y)} x2={hingeEnd.x} y2={Y(hingeEnd.y)} className="p-door-leaf" /><path d={`M${hingeEnd.x} ${Y(hingeEnd.y)}A${opening.width} ${opening.width} 0 0 ${signedArea(building.points) > 0 ? 1 : 0} ${end.x} ${Y(end.y)}`} className="p-door-swing" /></>
            : <><line x1={start.x + ox * 0.5} y1={Y(start.y + oy * 0.5)} x2={end.x + ox * 0.5} y2={Y(end.y + oy * 0.5)} className="p-window-line" /><line x1={start.x - ox * 0.5} y1={Y(start.y - oy * 0.5)} x2={end.x - ox * 0.5} y2={Y(end.y - oy * 0.5)} className="p-window-line" /><line x1={start.x} y1={Y(start.y)} x2={end.x} y2={Y(end.y)} className="p-window-glass" /></>}
          {opening.arch && <path d={`M${start.x + nx * 0.25} ${Y(start.y + ny * 0.25)}A${opening.width / 2} ${opening.width / 2} 0 0 ${signedArea(building.points) > 0 ? 0 : 1} ${end.x + nx * 0.25} ${Y(end.y + ny * 0.25)}`} className="p-arch-mark" />}
          {opening.balcony && <path d={path([{ x: start.x - ux * 0.3 + nx * (building.thickness / 2), y: start.y - uy * 0.3 + ny * (building.thickness / 2) }, { x: start.x - ux * 0.3 + nx * (building.thickness / 2 + 1), y: start.y - uy * 0.3 + ny * (building.thickness / 2 + 1) }, { x: end.x + ux * 0.3 + nx * (building.thickness / 2 + 1), y: end.y + uy * 0.3 + ny * (building.thickness / 2 + 1) }, { x: end.x + ux * 0.3 + nx * (building.thickness / 2), y: end.y + uy * 0.3 + ny * (building.thickness / 2) }])} className="p-balcony" />}
          <title>{`${t(opening.kind)} · ${t("floorShort")} ${opening.floor + 1} · ${formatMetres(opening.width)} × ${formatMetres(opening.height)} · ${t("openingSill")} ${formatMetres(opening.sill)}`}</title>
        </g>;
      })}
      {model.wallLamps.filter(item => item.buildingId === building.id && item.edge < edges).map(lamp => {
        const { a, ux, uy, nx, ny } = edgeOf(building.points, lamp.edge), at = { x: a.x + ux * lamp.offset + nx * (building.thickness / 2), y: a.y + uy * lamp.offset + ny * (building.thickness / 2) };
        const tip = { x: at.x + nx * Math.max(0.25, lamp.reach), y: at.y + ny * Math.max(0.25, lamp.reach) };
        return <g key={lamp.id} className={`p-wall-lamp ${lamp.color ? "coloured" : ""} ${selected("wallLamp", lamp.id) ? "selected" : ""}`} style={lamp.color ? { ["--c" as string]: lamp.color } : undefined} onPointerDown={event => beginDrag({ kind: "wall-lamp", id: lamp.id }, { kind: "wallLamp", id: lamp.id }, event)}>
          <line x1={at.x} y1={Y(at.y)} x2={tip.x} y2={Y(tip.y)} className="p-wall-lamp-arm" /><circle cx={tip.x} cy={Y(tip.y)} r={0.2} className="p-lamp" /><circle cx={tip.x} cy={Y(tip.y)} r={0.5} className="p-lamp-glow" />
          <circle cx={at.x} cy={Y(at.y)} r={9 * inv} className="p-device-hit" /><title>{`${t("toolWallLamp")} · Z ${formatMetres(lamp.z)}`}</title>
        </g>;
      })}
      {model.roofItems.filter(item => item.buildingId === building.id).map(item => {
        const chosenItem = selected("roofItem", item.id), w = item.width, d = item.depth;
        return <g key={item.id} className={`p-roof-item ${item.kind} ${item.color ? "coloured" : ""} ${chosenItem ? "selected" : ""}`} style={item.color ? { ["--c" as string]: item.color } : undefined} transform={`translate(${item.x} ${Y(item.y)}) rotate(${-item.rotation})`} onPointerDown={event => beginDrag({ kind: "roof-item", id: item.id }, { kind: "roofItem", id: item.id }, event)}>
          {item.kind === "chimney" && <><rect x={-w / 2} y={-d / 2} width={w} height={d} className="p-chimney" /><path d={`M${-w / 2} ${-d / 2}L${w / 2} ${d / 2}M${-w / 2} ${d / 2}L${w / 2} ${-d / 2}`} className="p-chimney-line" /></>}
          {item.kind === "solar" && <><rect x={-w / 2} y={-d / 2} width={w} height={d} className="p-solar" />{[1, 2, 3].map(i => <path key={i} d={`M${-w / 2 + w * i / 4} ${-d / 2}V${d / 2}`} className="p-solar-line" />)}<path d={`M${-w / 2} 0H${w / 2}`} className="p-solar-line" /></>}
          {item.kind === "antenna" && <><circle r={Math.max(w, 0.12)} className="p-mast" /><circle r={0.45} className="p-mast-ring" /><path d="M-0.6 0H0.6M0 -0.6V0.6" className="p-mast-line" /></>}
          {item.kind === "vent" && <><rect x={-w / 2} y={-d / 2} width={w} height={d} className="p-vent" /><circle r={Math.min(w, d) * 0.32} className="p-vent-hole" /></>}
          {item.kind === "gutter" && <><rect x={-w / 2} y={-d / 2} width={w} height={d} rx={d / 2} className="p-gutter" /><path d={`M${-w / 2 + d / 2} 0H${w / 2 - d / 2}`} className="p-gutter-line" /></>}
          {item.kind === "downpipe" && <><circle r={Math.max(w, 0.09)} className="p-downpipe" /><circle r={Math.max(w, 0.09) * 0.4} className="p-downpipe-hole" /></>}
          <circle r={Math.max(Math.max(w, d) / 2, 9 * inv)} className="p-device-hit" />
          {chosenItem && <rect x={-w / 2 - 0.12} y={-d / 2 - 0.12} width={w + 0.24} height={d + 0.24} className="p-selection" />}
          <title>{`${t(`roofItem_${item.kind}`)} · ${formatMetres(item.height)}`}</title>
        </g>;
      })}
      {(dimsOn && (chosen || view.scale >= 24)) && building.points.map((p, index) => <g key={index}>{sideLabel(p, building.points[(index + 1) % edges], `p-dim ${chosen ? "on" : ""}`, 9 + building.thickness * view.scale * 0.5)}</g>)}
      {label(`${building.name} · ${building.floors.length} ${t(building.floors.length === 1 ? "floorSingular" : "floorPlural")}`, centre, "p-building-name", 0, 4, 12)}
      {chosen && <>
        <path d={path(building.points)} className="p-selection" pointerEvents="none" />
        {building.points.map((_, index) => { const { a, b } = edgeOf(building.points, index), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          return <circle key={`m${index}`} cx={mid.x} cy={Y(mid.y)} r={4 * inv} className="p-add-handle" onPointerDown={event => { event.stopPropagation(); consumed.current = true; props.onInsertVertex({ kind: "building", id: building.id }, index, mid); }}><title>{t("addCorner")}</title></circle>; })}
        {building.points.map((p, index) => <circle key={`v${index}`} cx={p.x} cy={Y(p.y)} r={5.5 * inv} className={`p-vertex ${selection.kind === "building" && selection.vertex === index ? "on" : ""}`}
          onPointerDown={event => beginDrag({ kind: "building-vertex", id: building.id, index }, { kind: "building", id: building.id, vertex: index }, event)} />)}
        <line x1={centre.x} y1={Y(centre.y)} x2={rotateHandle.x} y2={Y(rotateHandle.y)} className="p-rotate-line" pointerEvents="none" />
        <circle cx={rotateHandle.x} cy={Y(rotateHandle.y)} r={6 * inv} className="p-rotate-handle" onPointerDown={event => beginDrag({ kind: "building-rotate", id: building.id }, { kind: "building", id: building.id }, event)}><title>{t("rotateBuilding")}</title></circle>
      </>}
    </g>;
  };

  const sensorShape = (sensor: Sensor) => {
    const at = toMetres(sensor, dimensions), heading = headingOf(sensor, dimensions), chosen = selected("sensor", sensor.id);
    const view = radarView(sensor), sector = sectorPoints(at, heading, view.halfAngleDeg, view.rangeM), tip = { x: at.x + Math.cos(heading * Math.PI / 180) * view.rangeM, y: at.y + Math.sin(heading * Math.PI / 180) * view.rangeM };
    return <g key={sensor.id} className={`p-sensor ${chosen ? "selected" : ""}`}>
      <path d={path(sector)} className="p-sector" pointerEvents="none" />
      {[2, 4].map(r => <path key={r} d={path(arcPoints(at, r, heading - view.halfAngleDeg, heading + view.halfAngleDeg, 18), false)} className="p-sector-ring" pointerEvents="none" />)}
      <g transform={`translate(${at.x} ${Y(at.y)})`} onPointerDown={event => beginDrag({ kind: "sensor", id: sensor.id }, { kind: "sensor", id: sensor.id }, event)}>
        <circle r={13 * inv} className="p-device-hit" />
        <g transform={`rotate(${-heading})`}><rect x={-7 * inv} y={-5 * inv} width={12 * inv} height={10 * inv} rx={2 * inv} className="p-sensor-body" /><path d={`M${5 * inv} ${-4 * inv}L${9 * inv} 0L${5 * inv} ${4 * inv}`} className="p-sensor-wave" /></g>
        <title>{`${sensor.name} · ${sensor.kind} · ${view.rangeM} m · ±${view.halfAngleDeg}°`}</title>
      </g>
      {chosen && <><circle cx={tip.x} cy={Y(tip.y)} r={6 * inv} className="p-rotate-handle" onPointerDown={event => beginDrag({ kind: "heading-sensor", id: sensor.id }, { kind: "sensor", id: sensor.id }, event)} />{label(sensor.name, { x: at.x, y: at.y }, "p-label", 0, 24, 10)}</>}
    </g>;
  };

  const deviceShape = (placement: SiteModel["placements"][number]) => {
    const device = props.devices.find(item => item.id === placement.device_id);
    if (!device) return null;
    const chosen = selected("device", device.id), problem = deviceProblem(device), colour = KIND_COLOUR[device.kind], main = MAIN_FIELD[device.kind], lit = main ? device.state[main] === true : false;
    const radius = 12 * inv, glyph = (16 * inv) / 24;
    return <g key={device.id} className={`p-device ${problem ?? ""} ${device.online ? "" : "off"} ${lit ? "lit" : ""} ${chosen ? "selected" : ""}`} transform={`translate(${placement.x} ${Y(placement.y)})`} style={{ color: colour }}
      onPointerDown={event => beginDrag({ kind: "device", id: device.id }, { kind: "device", id: device.id }, event)}>
      <circle r={radius * 1.7} className="p-device-halo" />
      <circle r={radius} className="p-device-badge" />
      <g transform={`translate(${-12 * glyph} ${-12 * glyph}) scale(${glyph})`} className="p-device-glyph" pointerEvents="none">{kindGlyph(device.kind)}</g>
      {(chosen || view.scale >= 26) && <text y={radius + 12 * inv} textAnchor="middle" className="p-label" fontSize={10 * inv} pointerEvents="none">{device.name}</text>}
      <title>{`${device.name} · ${placement.z.toFixed(2)} m`}</title>
    </g>;
  };

  const cameraShape = (camera: Camera) => {
    const at = toMetres(camera, dimensions), heading = headingOf(camera, dimensions), chosen = selected("camera", camera.id);
    const view = cameraView(camera), motorised = isMotorised(camera), cone = sectorPoints(at, heading, view.halfAngleDeg, view.rangeM), lensCone = motorised ? sectorPoints(at, heading, cameraLensDeg(camera) / 2, view.rangeM) : [], teleCone = chosen && cameraZoom(camera) > 1 ? sectorPoints(at, heading, cameraTeleDeg(camera) / 2, cameraTeleRangeM(camera)) : [], tip = { x: at.x + Math.cos(heading * Math.PI / 180) * view.rangeM * 0.7, y: at.y + Math.sin(heading * Math.PI / 180) * view.rangeM * 0.7 };
    return <g key={camera.id} className={`p-camera ${camera.enabled ? "" : "off"} ${chosen ? "selected" : ""}`}>
      <path d={path(cone)} className={`p-fov ${motorised ? "ptz" : ""}`} pointerEvents="none" />
      {motorised && <path d={path(lensCone)} className="p-fov-lens" pointerEvents="none" />}
      {teleCone.length > 0 && <path d={path(teleCone)} className="p-fov-tele" pointerEvents="none" />}
      <g transform={`translate(${at.x} ${Y(at.y)})`} onPointerDown={event => beginDrag({ kind: "camera", id: camera.id }, { kind: "camera", id: camera.id }, event)}>
        <circle r={13 * inv} className="p-device-hit" />
        <g transform={`rotate(${-heading})`}><rect x={-8 * inv} y={-6 * inv} width={12 * inv} height={12 * inv} rx={2.5 * inv} className="p-camera-body" /><path d={`M${4 * inv} ${-4 * inv}L${10 * inv} ${-7 * inv}V${7 * inv}L${4 * inv} ${4 * inv}Z`} className="p-camera-lens" /></g>
        <title>{`${camera.name}${camera.z !== undefined ? ` · Z ${formatMetres(camera.z)}` : ""}`}</title>
      </g>
      {chosen && <><circle cx={tip.x} cy={Y(tip.y)} r={6 * inv} className="p-rotate-handle" onPointerDown={event => beginDrag({ kind: "heading-camera", id: camera.id }, { kind: "camera", id: camera.id }, event)} />{label(camera.name, { x: at.x, y: at.y }, "p-label", 0, 24, 10)}</>}
    </g>;
  };

  // ---- previews ------------------------------------------------------------------------------------------------------------------
  const last = draft[draft.length - 1];
  const rubber = cursor && isDrawing(tool) ? snap(cursor, tool.endsWith("poly") ? last : (rectStart ?? pressStart.current) ?? undefined) : null;
  const typedTip = typed && last && rubber ? (() => { const angle = Math.atan2(rubber.y - last.y, rubber.x - last.x), length = Number(typed.replace(",", ".")) || 0; return { x: last.x + Math.cos(angle) * length, y: last.y + Math.sin(angle) * length }; })() : null;
  const dragStart = pressStart.current && isDrawing(tool) && tool.endsWith("rect") ? pressStart.current : null;
  const anchor = rectStart ?? dragStart;
  const draftShape = (draft.length > 0 || anchor) && rubber ? (() => {
    if (anchor) {
      const x0 = Math.min(anchor.x, rubber.x), y0 = Math.min(anchor.y, rubber.y), w = Math.abs(rubber.x - anchor.x), h = Math.abs(rubber.y - anchor.y);
      return <g pointerEvents="none"><rect x={x0} y={Y(y0 + h)} width={w} height={h} className="p-draft-fill" />{label(`${formatMetres(w)} × ${formatMetres(h)} · ${round2(w * h)} m²`, { x: x0 + w / 2, y: y0 + h / 2 }, "p-dim on", 0, 0, 12)}</g>;
    }
    const points = [...draft, typedTip ?? rubber];
    return <g pointerEvents="none">
      <path d={path(points, false)} className="p-draft-line" />
      {draft.length >= 2 && <path d={path([...draft, rubber])} className="p-draft-fill" />}
      {draft.map((p, index) => <circle key={index} cx={p.x} cy={Y(p.y)} r={(index === 0 ? 7 : 4.5) * inv} className={`p-handle ${index === 0 ? "first" : ""}`} />)}
      {draft.slice(1).map((p, index) => <g key={`s${index}`}>{sideLabel(draft[index], p, "p-dim on", 10)}</g>)}
      {last && sideLabel(last, typedTip ?? rubber, "p-dim on", 10)}
      {last && label(`${Math.round(Math.atan2(rubber.y - last.y, rubber.x - last.x) * 180 / Math.PI)}°`, { x: (last.x + rubber.x) / 2, y: (last.y + rubber.y) / 2 }, "p-angle", 0, 12)}
    </g>;
  })() : null;

  const fenceGuide = lineStart && cursor && (tool === "fence" || tool === "sidewalk") ? (() => {
    const end = snap(cursor, lineStart);
    return <g pointerEvents="none"><line x1={lineStart.x} y1={Y(lineStart.y)} x2={end.x} y2={Y(end.y)} className="p-draft-line" /><circle cx={lineStart.x} cy={Y(lineStart.y)} r={5 * inv} className="p-handle first" />{sideLabel(lineStart, end, "p-dim on", 10)}</g>;
  })() : null;
  const hoverEdge = cursor && EDGE_TOOLS.has(tool) ? hitAt(cursor).edge : undefined;
  const hoverMark = (() => {
    if (!cursor || !isPlacing(tool) || isDrawing(tool)) return null;
    const point = snap(cursor);
    if (hoverEdge) {
      const building = model.buildings.find(item => item.id === hoverEdge.buildingId)!, { a, ux, uy } = edgeOf(building.points, hoverEdge.edge);
      const at = { x: a.x + ux * hoverEdge.along, y: a.y + uy * hoverEdge.along };
      return <circle cx={at.x} cy={Y(at.y)} r={7 * inv} className="p-ghost edge" pointerEvents="none" />;
    }
    if (EDGE_TOOLS.has(tool)) return null;
    if (ROOF_TOOLS.has(tool)) return <circle cx={point.x} cy={Y(point.y)} r={6 * inv} className="p-ghost roof" pointerEvents="none" />;
    return <circle cx={point.x} cy={Y(point.y)} r={6 * inv} className="p-ghost" pointerEvents="none" />;
  })();
  const snapMark = cursor && (isDrawing(tool) || isPlacing(tool)) && snapOn ? (() => { const corner = nearestCorner(model, cursor, 10 * inv, skipOf()); return corner ? <circle cx={corner.x} cy={Y(corner.y)} r={8 * inv} className="p-snap" pointerEvents="none" /> : null; })() : null;
  const shownCursor = cursor ? snap(cursor, tool.endsWith("poly") ? last : undefined) : null;
  const floors = Array.from({ length: props.floorCount }, (_, index) => index);
  const zoomPercent = Math.round(view.scale / 16 * 100);
  const prompt = tool === "fence" || tool === "sidewalk" ? t(lineStart ? "promptFenceNext" : tool === "sidewalk" ? "promptSidewalkStart" : "promptFenceStart") : draft.length === 0 && !rectStart && isDrawing(tool) ? t(tool.endsWith("poly") ? "promptPolyStart" : "promptRectStart") : draft.length > 0 ? t("promptPolyNext") : rectStart ? t("promptRectEnd") : "";

  return <div ref={host} className={`plan2d tool-${tool} ${space ? "panning" : ""}`}>
    <svg ref={svg} className="plan2d-svg" width="100%" height="100%" onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPointer} onPointerCancel={endPointer}
      onPointerLeave={() => setCursor(null)} onClick={onBackgroundClick} onDoubleClick={event => { if (tool.endsWith("poly")) { if (draft.length >= 3) finishPolygon(); return; } addCornerAt(toSite(event.clientX, event.clientY)); }} onContextMenu={event => event.preventDefault()} role="application" aria-label={t("planClick")}>
      <rect data-bg="1" width="100%" height="100%" className="plan-bg" />
      <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
        {gridOn && <><path d={gridPath.minor} className={`p-grid minor ${view.scale >= 22 ? "" : "hidden"}`} /><path d={gridPath.major} className="p-grid major" /></>}
        {[...model.features].filter(feature => feature.kind === "road" || feature.kind === "path" || feature.kind === "sidewalk").map(featureShape)}
        {terrainShape}
        {[...model.features].filter(feature => feature.kind !== "road" && feature.kind !== "path" && feature.kind !== "sidewalk").map(featureShape)}
        {model.buildings.map(buildingShape)}
        {model.sensors.map(sensorShape)}
        {model.placements.map(deviceShape)}
        {model.cameras.map(cameraShape)}
        {draftShape}{fenceGuide}{hoverMark}{snapMark}
      </g>
      <g className="plan-ruler" pointerEvents="none">
        <rect x="0" y="0" width="100%" height={RULER} className="ruler-bg" /><rect x="0" y="0" width={RULER} height="100%" className="ruler-bg" />
        {rulerX.map(x => <g key={`rx${x}`}><line x1={screenX(x)} y1={RULER - 7} x2={screenX(x)} y2={RULER} /><text x={screenX(x) + 3} y={RULER - 9}>{x}</text></g>)}
        {rulerY.map(y => <g key={`ry${y}`}><line x1={RULER - 7} y1={screenY(y)} x2={RULER} y2={screenY(y)} /><text x={3} y={screenY(y) - 3} transform={`rotate(-90 3 ${screenY(y) - 3})`}>{y}</text></g>)}
        {shownCursor && <><line className="ruler-cursor" x1={screenX(shownCursor.x)} y1={0} x2={screenX(shownCursor.x)} y2={RULER} /><line className="ruler-cursor" x1={0} y1={screenY(shownCursor.y)} x2={RULER} y2={screenY(shownCursor.y)} /></>}
      </g>
    </svg>
    <div className="plan-floors" role="group" aria-label={t("floorSelector")}>
      <button className={activeFloor < 0 ? "on" : ""} onClick={() => props.onFloor(-1)} title={t("allFloors")}>{t("allFloorsShort")}</button>
      {floors.map(floor => <button key={floor} className={activeFloor === floor ? "on" : ""} onClick={() => props.onFloor(floor)} title={`${t("floor")} ${floor + 1}`}>{floor === 0 ? t("groundShort") : floor}</button>)}
      <button className={`roof-chip ${roofsOn ? "" : "on"}`} aria-pressed={!roofsOn} onClick={() => setRoofsOn(value => !value)} title={roofsOn ? t("roofsOff") : t("roofsOn")} aria-label={roofsOn ? t("roofsOff") : t("roofsOn")}>{ICON.roof}</button>
    </div>
    {prompt && <div className="plan-prompt" role="status">{prompt}{typed && <b> {typed} m</b>}</div>}
    <div className="plan-north" aria-label={t("north")} title={t("north")}><svg viewBox="0 0 40 40" width="38" height="38"><circle cx="20" cy="20" r="17" className="n-ring" /><path d="M20 6l5 14H15z" className="n-needle" /><path d="M20 34l-5-14h10z" className="n-tail" /><text x="20" y="4.6" textAnchor="middle" className="n-n">N</text></svg></div>
    <div className="plan-scale" aria-hidden="true"><i style={{ width: scaleBar * view.scale }} /><span>{scaleBar >= 1 ? `${scaleBar} m` : `${scaleBar * 100} cm`}</span></div>
    <div className="plan-readout" role="status">
      <span><em>X</em>{shownCursor ? shownCursor.x.toFixed(2) : "--"} m</span><span><em>Y</em>{shownCursor ? shownCursor.y.toFixed(2) : "--"} m</span>
      <span><em>{t("zoomLabel")}</em>{zoomPercent}%</span><span><em>{t("gridLabel")}</em>{snapOn ? `${gridStep} m` : t("off")}</span>
      {ortho && <span><em>{t("orthoLabel")}</em>ON</span>}
    </div>
    <div className="plan-view-controls" role="group" aria-label={t("viewportNavigation")}>
      <button onClick={() => zoomAt(1.25, size.width / 2, size.height / 2)} title={t("zoomIn")} aria-label={t("zoomIn")}>{ICON.zoomIn}</button>
      <button onClick={() => zoomAt(1 / 1.25, size.width / 2, size.height / 2)} title={t("zoomOut")} aria-label={t("zoomOut")}>{ICON.zoomOut}</button>
      <button onClick={fit} title={t("fitView")} aria-label={t("fitView")}>{ICON.fit}</button>
      <button className={snapOn ? "on" : ""} aria-pressed={snapOn} onClick={() => setSnapOn(value => !value)} title={t("snapToggle")} aria-label={t("snapToggle")}>{ICON.snap}</button>
      <button className={gridOn ? "on" : ""} aria-pressed={gridOn} onClick={() => setGridOn(value => !value)} title={t("gridToggle")} aria-label={t("gridToggle")}>{ICON.grid}</button>
      <button className={roofsOn ? "on" : ""} aria-pressed={roofsOn} onClick={() => setRoofsOn(value => !value)} title={t("roofLinesToggle")} aria-label={t("roofLinesToggle")}>{ICON.roof}</button>
      <button className={dimsOn ? "on" : ""} aria-pressed={dimsOn} onClick={() => setDimsOn(value => !value)} title={t("dimensionsToggle")} aria-label={t("dimensionsToggle")}>{ICON.ruler}</button>
    </div>
  </div>;
}
