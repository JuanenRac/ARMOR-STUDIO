/**
 * The Network Designer: draw the house's network (the provider's line, the modem, the router, switches and access points, and every device that hangs from them), join their ports
 * with links, group them in networks or rooms, tie a drawn element to the device the nodes found, and read what the checks say. It can also draw what the nodes found: every device
 * that is on the network and not in the drawing is added, tied to the device it is. This component owns the editing session (tools, selection, undo and redo, zoom and pan, the
 * keyboard); the model, the operations, the checks and the storage of the drawing are in ./network.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { FRAME_COLOURS, type FrameColour } from "./electrical/model";
import { analyse, type Issue } from "./network/analysis";
import {
  CATEGORY_COLOUR, CATEGORY_ORDER, GRID, KINDS, MEDIUM_COLOUR, designBounds, kindDef, kindsIn, portOf, portPosition, portsOf, rotationOf, sizeOf, snap, summaryOf, wirePath,
  type Design, type Element, type Frame, type PortDef, type PortRef, type PropDef, type Wire,
} from "./network/model";
import {
  addElement, addFrame, canConnect, connect, duplicateElement, elementsInFrame, moveElement, nudgeElements, removeElement, removeFrame, removeWire, renameElement,
  fillFromDevice, replaceKind, rotateElement, setBinding, setProp, updateFrame, updateWire, type ConnectError,
} from "./network/ops";
import { drawFound, emptyDesign, housePreset } from "./network/presets";
import { buildNetworkDoc, parseNetworkDoc } from "./network/sync";
import { ElementBody, KindSwatch } from "./network/symbols";
import type { SyncStatus } from "./network/useNetworkSync";
import { deviceName, sortByAddress, type NetworkOverview } from "./networkModel";
import "./electrical/electrical.css";
import "./electrical/group.css";

type Props = {
  t: (key: string) => string;
  design: Design; setDesign: (next: Design) => void; status: SyncStatus;
  /** What the nodes report: the drawing is compared with it and can draw what it finds. */
  overview: NetworkOverview | null;
  /** The cameras of the Cameras menu: a drawn camera can be tied to one, and takes its address and ports. */
  cameras?: ReadonlyArray<{ id: string; name: string; host: string; onvifPort?: number; rtspPort?: number; rtspPath?: string }>;
};
type Selection = { kind: "element" | "wire" | "frame"; id: string } | null;
type Tool = "select" | "wire";
type View = { x: number; y: number; k: number };
type Point = { x: number; y: number };

const HISTORY_LIMIT = 100, COALESCE_MS = 800, MIN_ZOOM = 0.15, MAX_ZOOM = 3;
const format = (template: string, args: ReadonlyArray<string | number>): string => template.replace(/\{(\d+)\}/g, (_match, index: string) => String(args[Number(index)] ?? ""));

export function NetworkDesigner({ t, design, setDesign, status, overview, cameras = [] }: Props) {
  const [tool, setTool] = useState<Tool>("select");
  const [place, setPlace] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [wireFrom, setWireFrom] = useState<PortRef | null>(null);
  const [hoverPort, setHoverPort] = useState<PortRef | null>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [view, setView] = useState<View>({ x: 40, y: 40, k: 1 });
  const [panel, setPanel] = useState<"properties" | "checks">("properties");
  const [notice, setNotice] = useState("");
  const [, setVersion] = useState(0);
  const canvas = useRef<HTMLDivElement>(null), svgRef = useRef<SVGSVGElement>(null), fileInput = useRef<HTMLInputElement>(null);
  const designRef = useRef(design), viewRef = useRef(view);
  designRef.current = design; viewRef.current = view;
  const past = useRef<Design[]>([]), future = useRef<Design[]>([]), lastKey = useRef<{ key: string; at: number } | null>(null);
  const drag = useRef<null | { type: "element" | "frame" | "resize" | "pan"; id: string; start: Point; origin: Point; before: Design; moved: boolean; carried?: string[] }>(null);
  const fitted = useRef(false);
  const label = (kind: string) => t(`ndk_${kind}`);

  // ---- what the nodes report ----
  const node = overview?.nodes[0];
  const devices = useMemo(() => node?.devices ?? [], [node]);
  const live = useMemo(() => node ? { devices, cidr: node.interface.cidr, gateway: node.interface.gateway } : undefined, [node, devices]);
  const deviceById = useMemo(() => new Map(devices.map(device => [device.id, device])), [devices]);

  // ---- the design, with history ----
  const touch = () => setVersion(value => value + 1);
  const commit = (next: Design, key?: string) => {
    if (next === designRef.current) return;
    const now = Date.now();
    if (!(key && lastKey.current?.key === key && now - lastKey.current.at < COALESCE_MS)) {
      past.current.push(designRef.current);
      if (past.current.length > HISTORY_LIMIT) past.current.shift();
    }
    lastKey.current = key ? { key, at: now } : null;
    future.current = [];
    designRef.current = next;
    setDesign(next);
    touch();
  };
  const undo = () => { const previous = past.current.pop(); if (!previous) return; future.current.push(designRef.current); designRef.current = previous; lastKey.current = null; setDesign(previous); reselect(previous); touch(); };
  const redo = () => { const next = future.current.pop(); if (!next) return; past.current.push(designRef.current); designRef.current = next; lastKey.current = null; setDesign(next); reselect(next); touch(); };
  const reselect = (current: Design) => setSelection(item => !item ? item : (item.kind === "element" ? current.elements.some(e => e.id === item.id) : item.kind === "wire" ? current.wires.some(w => w.id === item.id) : current.frames.some(f => f.id === item.id)) ? item : null);

  // ---- what the checks say ----
  const analysis = useMemo(() => analyse(design, live), [design, live]);
  const toneOf = useMemo(() => {
    const tones = new Map<string, "warn" | "bad">();
    for (const issue of analysis.issues) if (issue.element && issue.level !== "info") { if (issue.level === "error") tones.set(issue.element, "bad"); else if (!tones.has(issue.element)) tones.set(issue.element, "warn"); }
    return tones;
  }, [analysis]);
  const errors = analysis.issues.filter(issue => issue.level === "error").length, warnings = analysis.issues.filter(issue => issue.level === "warn").length;

  // ---- the view ----
  const size = useRef({ width: 900, height: 600 });
  const fit = useCallback(() => {
    const box = designBounds(designRef.current), { width, height } = size.current;
    if (!box) { setView({ x: 60, y: 60, k: 1 }); return; }
    const margin = 60, k = Math.min(1.4, Math.max(MIN_ZOOM, Math.min((width - margin * 2) / Math.max(1, box.maxX - box.minX), (height - margin * 2) / Math.max(1, box.maxY - box.minY))));
    setView({ k, x: (width - (box.maxX - box.minX) * k) / 2 - box.minX * k, y: (height - (box.maxY - box.minY) * k) / 2 - box.minY * k });
  }, []);
  useLayoutEffect(() => {
    const host = canvas.current;
    if (!host) return;
    const measure = () => { const box = host.getBoundingClientRect(); size.current = { width: box.width, height: box.height }; if (!fitted.current && box.width > 0) { fitted.current = true; fit(); } };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [fit]);
  const toWorld = (event: { clientX: number; clientY: number }): Point => {
    const box = svgRef.current?.getBoundingClientRect(), current = viewRef.current;
    return { x: (event.clientX - (box?.left ?? 0) - current.x) / current.k, y: (event.clientY - (box?.top ?? 0) - current.y) / current.k };
  };
  useEffect(() => {
    const host = canvas.current;
    if (!host) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = svgRef.current?.getBoundingClientRect(), current = viewRef.current;
      if (!box) return;
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.k * Math.exp(-event.deltaY * 0.0015)));
      const px = event.clientX - box.left, py = event.clientY - box.top;
      setView({ k, x: px - (px - current.x) * (k / current.k), y: py - (py - current.y) * (k / current.k) });
    };
    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, []);

  // ---- placing, linking ----
  const say = (text: string) => setNotice(text);
  const placeAt = (kind: string, point: Point, keep: boolean) => {
    const def = kindDef(kind);
    if (!def) return;
    const added = addElement(designRef.current, kind, point.x - def.w / 2, point.y - def.h / 2);
    if (!added) { say(t("nderr_too_many")); return; }
    commit(added.design);
    setSelection({ kind: "element", id: added.id });
    if (!keep) setPlace(null);
  };
  const finishWire = (target: PortRef) => {
    if (!wireFrom) return;
    if (wireFrom.element === target.element && wireFrom.port === target.port) return;
    const result = connect(designRef.current, wireFrom, target);
    if (!result.ok) { say(t(`nderr_${result.error}`)); return; }
    commit(result.design);
    setSelection({ kind: "wire", id: result.id });
    setWireFrom(null); setNotice("");
  };
  const onPortDown = (event: ReactPointerEvent, ref: PortRef) => {
    event.stopPropagation();
    if (event.button !== 0) return;
    if (wireFrom) { finishWire(ref); return; }
    setWireFrom(ref); setPlace(null);
    say(t("elWiringHint"));
  };
  const onPortUp = (event: ReactPointerEvent, ref: PortRef) => {
    if (!wireFrom || (wireFrom.element === ref.element && wireFrom.port === ref.port)) return;
    event.stopPropagation();
    finishWire(ref);
  };
  const cancel = () => { setWireFrom(null); setPlace(null); setNotice(""); if (tool === "wire") setTool("select"); };

  // ---- pointer on the canvas ----
  const onBackgroundDown = (event: ReactPointerEvent<SVGElement>) => {
    if (event.button === 1 || event.button === 2 || event.button === 0) {
      const point = toWorld(event);
      if (event.button === 0 && place) { placeAt(place, point, event.shiftKey); return; }
      if (event.button === 0 && wireFrom) { setWireFrom(null); setNotice(""); return; }
      if (event.button === 0 && tool === "select") setSelection(null);
      drag.current = { type: "pan", id: "", start: { x: event.clientX, y: event.clientY }, origin: { x: viewRef.current.x, y: viewRef.current.y }, before: designRef.current, moved: false };
      (event.currentTarget as SVGElement).setPointerCapture?.(event.pointerId);
    }
  };
  const onElementDown = (event: ReactPointerEvent, element: Element) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    if (place) return;
    setSelection({ kind: "element", id: element.id });
    if (wireFrom) return;
    const point = toWorld(event);
    drag.current = { type: "element", id: element.id, start: point, origin: { x: element.x, y: element.y }, before: designRef.current, moved: false };
    svgRef.current?.setPointerCapture?.(event.pointerId);
  };
  const onFrameDown = (event: ReactPointerEvent, frame: Frame, resize: boolean) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    setSelection({ kind: "frame", id: frame.id });
    const point = toWorld(event);
    drag.current = { type: resize ? "resize" : "frame", id: frame.id, start: point, origin: resize ? { x: frame.w, y: frame.h } : { x: frame.x, y: frame.y }, before: designRef.current, moved: false, carried: resize ? undefined : elementsInFrame(designRef.current, frame) };
    svgRef.current?.setPointerCapture?.(event.pointerId);
  };
  const onMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = toWorld(event);
    setPointer(point);
    const gesture = drag.current;
    if (!gesture) return;
    if (gesture.type === "pan") {
      gesture.moved = true;
      setView(current => ({ ...current, x: gesture.origin.x + event.clientX - gesture.start.x, y: gesture.origin.y + event.clientY - gesture.start.y }));
      return;
    }
    const dx = point.x - gesture.start.x, dy = point.y - gesture.start.y;
    if (!gesture.moved && Math.hypot(dx, dy) * viewRef.current.k < 3) return;
    gesture.moved = true;
    let next = gesture.before;
    if (gesture.type === "element") next = moveElement(gesture.before, gesture.id, gesture.origin.x + dx, gesture.origin.y + dy);
    else if (gesture.type === "frame") {
      const frame = gesture.before.frames.find(item => item.id === gesture.id);
      if (frame) {
        const nx = snap(gesture.origin.x + dx), ny = snap(gesture.origin.y + dy);
        next = updateFrame(nudgeElements(gesture.before, gesture.carried ?? [], nx - frame.x, ny - frame.y), gesture.id, { x: nx, y: ny });
      }
    } else next = updateFrame(gesture.before, gesture.id, { w: gesture.origin.x + dx, h: gesture.origin.y + dy });
    designRef.current = next;
    setDesign(next);
  };
  const onUp = () => {
    const gesture = drag.current;
    drag.current = null;
    if (gesture && gesture.type !== "pan" && gesture.moved && designRef.current !== gesture.before) {
      past.current.push(gesture.before);
      if (past.current.length > HISTORY_LIMIT) past.current.shift();
      future.current = []; lastKey.current = null; touch();
    }
  };

  // ---- the keyboard ----
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if ((event.ctrlKey || event.metaKey) && key === "y") { event.preventDefault(); redo(); return; }
      if (key === "escape") { cancel(); return; }
      if (key === "v") { setTool("select"); setWireFrom(null); return; }
      if (key === "w") { setTool("wire"); setPlace(null); return; }
      const chosen = selectionRef.current;
      if (!chosen) return;
      if (key === "r" && chosen.kind === "element") { commit(rotateElement(designRef.current, chosen.id)); return; }
      if (key === "delete" || key === "backspace") { event.preventDefault(); removeSelected(); return; }
      if (chosen.kind === "element" && ["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
        event.preventDefault();
        const step = event.shiftKey ? GRID * 4 : GRID, dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0, dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
        commit(nudgeElements(designRef.current, [chosen.id], dx, dy), `nudge:${chosen.id}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const removeSelected = () => {
    const chosen = selectionRef.current;
    if (!chosen) return;
    if (chosen.kind === "element") commit(removeElement(designRef.current, chosen.id));
    else if (chosen.kind === "wire") commit(removeWire(designRef.current, chosen.id));
    else commit(removeFrame(designRef.current, chosen.id));
    setSelection(null);
  };

  // ---- files ----
  const download = (name: string, type: string, content: string) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url; link.download = name; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const exportJson = () => { download("network-design.json", "application/json", JSON.stringify(buildNetworkDoc(designRef.current), null, 2)); say(t("elExported")); };
  const exportSvg = () => {
    const box = designBounds(designRef.current), svgNode = svgRef.current;
    if (!box || !svgNode) return;
    const clone = svgNode.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll("[data-editor]").forEach(part => part.remove());
    clone.querySelector("g[data-world]")?.removeAttribute("transform");
    const margin = 40, width = box.maxX - box.minX + margin * 2, height = box.maxY - box.minY + margin * 2;
    clone.setAttribute("viewBox", `${box.minX - margin} ${box.minY - margin} ${width} ${height}`);
    clone.setAttribute("width", String(width)); clone.setAttribute("height", String(height));
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("x", String(box.minX - margin)); background.setAttribute("y", String(box.minY - margin));
    background.setAttribute("width", String(width)); background.setAttribute("height", String(height)); background.setAttribute("fill", "#060d13");
    clone.insertBefore(background, clone.firstChild);
    download("network-design.svg", "image/svg+xml", new XMLSerializer().serializeToString(clone));
    say(t("elExported"));
  };
  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseNetworkDoc(JSON.parse(await file.text()));
      if (!parsed) { say(t("elImportBad")); return; }
      commit(parsed); setSelection(null); fitted.current = false; window.setTimeout(fit, 0); say(t("elImported"));
    } catch { say(t("elImportBad")); }
    if (fileInput.current) fileInput.current.value = "";
  };
  const startNew = (example: boolean) => {
    if (designRef.current.elements.length && !window.confirm(t("elClearConfirm"))) return;
    commit(example ? housePreset(t) : emptyDesign()); setSelection(null); setWireFrom(null);
    window.setTimeout(fit, 0);
  };
  const drawWhatWasFound = () => {
    if (!node) return;
    const result = drawFound(designRef.current, devices, { gateway: node.interface.gateway, cidr: node.interface.cidr });
    if (result.added === 0) { say(t("nd_nothing_new")); return; }
    commit(result.design);
    say(format(t("nd_drawn_found"), [result.added]));
    window.setTimeout(fit, 0);
  };

  // Tying an element to a device the nodes found fills what it does not say yet (address, maker, name) from what the device says.
  const bindDevice = (element: Element, id: string | undefined) => {
    let next = setBinding(designRef.current, element.id, id);
    const device = id ? deviceById.get(id) : undefined;
    if (device) next = fillFromDevice(next, element.id, device);
    commit(next);
  };
  const linkCamera = (element: Element, id: string) => {
    const camera = cameras.find(item => item.id === id);
    let next = setProp(designRef.current, element.id, "camera_id", id);
    if (camera) {
      next = setProp(next, element.id, "ip", /^\d{1,3}(\.\d{1,3}){3}$/.test(camera.host) ? camera.host : "");
      if (camera.onvifPort) next = setProp(next, element.id, "onvif_port", camera.onvifPort);
      if (camera.rtspPort) next = setProp(next, element.id, "rtsp_port", camera.rtspPort);
      if (camera.rtspPath) next = setProp(next, element.id, "rtsp", camera.rtspPath);
      if (!element.name) next = renameElement(next, element.id, camera.name);
    }
    commit(next);
  };

  // ---- the state of the device an element is tied to ----
  const liveOf = (element: Element): "on" | "off" | "missing" | undefined => {
    const id = element.bind?.device;
    if (!id) return undefined;
    const device = deviceById.get(id);
    return !device ? "missing" : device.online ? "on" : "off";
  };
  const selectedElement = selection?.kind === "element" ? design.elements.find(element => element.id === selection.id) : undefined;
  const selectedWire = selection?.kind === "wire" ? design.wires.find(wire => wire.id === selection.id) : undefined;
  const selectedFrame = selection?.kind === "frame" ? design.frames.find(frame => frame.id === selection.id) : undefined;
  const pointerTarget = wireFrom ? designRef.current.elements.find(element => element.id === wireFrom.element) : undefined;
  const wireStart = pointerTarget ? portPosition(pointerTarget, wireFrom!.port) : undefined;
  const wireEndPort = wireFrom && hoverPort ? canConnect(design, wireFrom, hoverPort) : undefined;
  const chosenMedium = wireFrom ? portOf(pointerTarget!, wireFrom.port)?.medium : undefined;

  // ---- drawing ----
  const wireMedium = (wire: Wire) => { const element = design.elements.find(item => item.id === wire.from.element); return (element && portOf(element, wire.from.port)?.medium) ?? "eth"; };
  const renderWire = (wire: Wire): ReactNode => {
    const points = wirePath(design, wire);
    if (points.length < 2) return null;
    const medium = wireMedium(wire), colour = MEDIUM_COLOUR[medium], chosen = selection?.kind === "wire" && selection.id === wire.id;
    const path = points.map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" ");
    let best = 0;
    for (let index = 1; index < points.length - 1; index += 1) if (Math.hypot(points[index + 1].x - points[index].x, points[index + 1].y - points[index].y) > Math.hypot(points[best + 1].x - points[best].x, points[best + 1].y - points[best].y)) best = index;
    const middle = { x: (points[best].x + points[best + 1].x) / 2, y: (points[best].y + points[best + 1].y) / 2 };
    const text = [wire.label, wire.vlan !== undefined ? `VLAN ${wire.vlan}` : "", wire.speed_mbps !== undefined ? (wire.speed_mbps >= 1000 ? `${wire.speed_mbps / 1000} Gbit/s` : `${wire.speed_mbps} Mbit/s`) : ""].filter(Boolean).join(" · ");
    return <g key={wire.id}>
      <path d={path} fill="none" stroke={colour} strokeWidth={chosen ? 4 : medium === "eth" ? 2.6 : 1.8} strokeDasharray={medium === "wifi" ? "3 5" : medium === "wan" ? "10 4" : undefined} strokeLinejoin="round" strokeLinecap="round" opacity={chosen ? 1 : 0.9} />
      {chosen && <path d={path} fill="none" stroke={colour} strokeWidth={9} opacity={0.18} strokeLinejoin="round" />}
      <path d={path} fill="none" stroke="transparent" strokeWidth={14} style={{ cursor: "pointer" }} onPointerDown={event => { if (event.button !== 0) return; event.stopPropagation(); setSelection({ kind: "wire", id: wire.id }); setPanel("properties"); }} />
      {text && <text x={middle.x} y={middle.y - 5} textAnchor="middle" fontSize={9} fill={colour} fontFamily='"DM Mono", ui-monospace, Consolas, monospace' stroke="#060d13" strokeWidth={3} paintOrder="stroke">{text}</text>}
    </g>;
  };
  const connected = new Set<string>();
  for (const wire of design.wires) { connected.add(`${wire.from.element}/${wire.from.port}`); connected.add(`${wire.to.element}/${wire.to.port}`); }

  const renderElement = (element: Element): ReactNode => {
    const def = kindDef(element.kind);
    if (!def) return null;
    const { w: boxW, h: boxH } = sizeOf(element);
    const chosen = selection?.kind === "element" && selection.id === element.id;
    const fullName = element.name || label(element.kind), name = fullName.length > 17 ? `${fullName.slice(0, 16)}…` : fullName, summary = summaryOf(element);
    return <g key={element.id} transform={`translate(${element.x} ${element.y})`} style={{ cursor: "grab" }} onPointerDown={event => onElementDown(event, element)}>
      <ElementBody kind={element.kind} selected={chosen} tone={toneOf.get(element.id)} live={liveOf(element)} rot={rotationOf(element)} />
      <text x={boxW / 2} y={boxH + 13} textAnchor="middle" fontSize={11} fontWeight={700} fill="#e2eef2" fontFamily='"Space Grotesk", "Segoe UI", system-ui, sans-serif' stroke="#060d13" strokeWidth={3} paintOrder="stroke">{name}<title>{fullName}</title></text>
      {chosen && <g data-editor="rotate" style={{ cursor: "pointer" }} onPointerDown={event => { event.stopPropagation(); commit(rotateElement(designRef.current, element.id)); }}><circle cx={boxW / 2} cy={-14} r={10} fill="#0b2530" stroke="#00e5ff" strokeWidth={1.5} /><text x={boxW / 2} y={-9.5} textAnchor="middle" fontSize={13} fill="#00e5ff">↻<title>{t("nd_rotate")}</title></text></g>}
      {summary && <text x={boxW / 2} y={boxH + 25} textAnchor="middle" fontSize={9.5} fill="#8fb3bc" fontFamily='"DM Mono", ui-monospace, Consolas, monospace' stroke="#060d13" strokeWidth={3} paintOrder="stroke">{summary}</text>}
    </g>;
  };
  const renderPorts = (element: Element): ReactNode => {
    if (!kindDef(element.kind)) return null;
    return portsOf(element).map((port: PortDef) => {
      const at = portPosition(element, port.id)!, ref: PortRef = { element: element.id, port: port.id }, key = `${element.id}/${port.id}`;
      const isHover = hoverPort?.element === element.id && hoverPort.port === port.id, isStart = wireFrom?.element === element.id && wireFrom.port === port.id;
      const candidate = wireFrom && !isStart ? canConnect(design, wireFrom, ref) === undefined : false;
      const mediumOk = !chosenMedium || port.medium === chosenMedium;
      const r = isHover || isStart ? 7 : candidate ? 6 : 4.5;
      return <g key={key} data-editor="port" onPointerDown={event => onPortDown(event, ref)} onPointerUp={event => onPortUp(event, ref)} onPointerEnter={() => setHoverPort(ref)} onPointerLeave={() => setHoverPort(current => current && current.element === ref.element && current.port === ref.port ? null : current)} style={{ cursor: "crosshair" }} opacity={wireFrom && !mediumOk ? 0.25 : 1}>
        <circle cx={at.x} cy={at.y} r={12} fill="transparent" />
        <circle cx={at.x} cy={at.y} r={r} fill={connected.has(key) || isStart ? MEDIUM_COLOUR[port.medium] : "#060d13"} stroke={candidate ? "#ffffff" : MEDIUM_COLOUR[port.medium]} strokeWidth={candidate ? 2 : 1.6} />
        {isHover && <title>{port.id}</title>}
      </g>;
    });
  };
  const renderFrame = (frame: Frame): ReactNode => {
    const colour = FRAME_COLOURS[frame.colour], chosen = selection?.kind === "frame" && selection.id === frame.id;
    return <g key={frame.id}>
      <rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} rx={12} fill={colour} fillOpacity={0.05} stroke={colour} strokeOpacity={chosen ? 1 : 0.55} strokeWidth={chosen ? 2.4 : 1.4} strokeDasharray="8 5" />
      <rect x={frame.x} y={frame.y} width={Math.max(60, frame.w)} height={26} rx={12} fill={colour} fillOpacity={0.14} style={{ cursor: "grab" }} onPointerDown={event => onFrameDown(event, frame, false)} />
      <text x={frame.x + 12} y={frame.y + 17} fontSize={12} fontWeight={700} fill={colour} fontFamily='"Space Grotesk", system-ui, sans-serif' pointerEvents="none">{frame.name || t("elFrame")}</text>
      <g data-editor="handle"><rect x={frame.x + frame.w - 14} y={frame.y + frame.h - 14} width={14} height={14} rx={3} fill={colour} fillOpacity={chosen ? 0.9 : 0.4} style={{ cursor: "nwse-resize" }} onPointerDown={event => onFrameDown(event, frame, true)} /></g>
    </g>;
  };

  // ---- the panels ----
  const choiceText = (value: string) => { const key = `ndv_${value}`, text = t(key); return text === key ? value : text; };
  const propField = (element: Element, prop: PropDef): ReactNode => {
    const value = element.props[prop.key];
    const title = t(`ndp_${prop.key}`);
    if (prop.type === "number") return <label key={prop.key}>{title}<input type="number" min={prop.min} max={prop.max} step={prop.step ?? 1} value={typeof value === "number" ? value : 0} onChange={event => { const next = Number(event.target.value); if (event.target.value !== "" && Number.isFinite(next)) commit(setProp(designRef.current, element.id, prop.key, next), `prop:${element.id}:${prop.key}`); }} /></label>;
    if (prop.type === "choice") return <label key={prop.key}>{title}<select value={String(value)} onChange={event => commit(setProp(designRef.current, element.id, prop.key, event.target.value))}>{prop.choices.map(choice => <option key={choice} value={choice}>{choiceText(choice)}</option>)}</select></label>;
    return <label key={prop.key}>{title}<input type={prop.secret ? "password" : "text"} autoComplete="off" maxLength={prop.max} value={String(value ?? "")} onChange={event => commit(setProp(designRef.current, element.id, prop.key, event.target.value.trim()), `prop:${element.id}:${prop.key}`)} /></label>;
  };
  const elementPanel = (element: Element): ReactNode => {
    const def = kindDef(element.kind)!;
    const bound = element.bind?.device ? deviceById.get(element.bind.device) : undefined;
    const taken = new Set(design.elements.filter(other => other.id !== element.id).map(other => other.bind?.device).filter(Boolean));
    return <div className="ed-form">
      <h4><span style={{ color: CATEGORY_COLOUR[def.category] }}>●</span> {label(element.kind)}</h4>
      <label>{t("elName")}<input type="text" maxLength={60} value={element.name} placeholder={label(element.kind)} onChange={event => commit(renameElement(designRef.current, element.id, event.target.value), `name:${element.id}`)} /></label>
      <label>{t("nd_replace")}<select value="" onChange={event => { if (event.target.value) commit(replaceKind(designRef.current, element.id, event.target.value)); }}><option value="">{t("nd_replace_pick")}</option>{KINDS.filter(other => other.kind !== element.kind).map(other => <option key={other.kind} value={other.kind}>{label(other.kind)}</option>)}</select></label>
      <button onClick={() => commit(rotateElement(designRef.current, element.id))}>↻ {t("nd_rotate")}</button>
      {def.props.map(prop => propField(element, prop))}
      {element.kind === "camera" && cameras.length > 0 && <label>{t("nd_cam_link")}<select value={String(element.props.camera_id ?? "")} onChange={event => linkCamera(element, event.target.value)}><option value="">{t("elBindNone")}</option>{cameras.map(camera => <option key={camera.id} value={camera.id}>{camera.name} ({camera.host})</option>)}</select></label>}
      <label>{t("nd_bind_device")}<select value={element.bind?.device ?? ""} onChange={event => bindDevice(element, event.target.value || undefined)}>
        <option value="">{t("elBindNone")}</option>
        {element.bind?.device && !deviceById.has(element.bind.device) && <option value={element.bind.device}>{element.bind.device}</option>}
        {sortByAddress(devices).filter(device => !taken.has(device.id)).map(device => <option key={device.id} value={device.id}>{deviceName(device)} ({device.ip})</option>)}
      </select></label>
      {element.bind?.device && <p className="ed-note">{bound ? `${bound.online ? t("net_online") : t("net_offline")} · ${bound.ip}${bound.mac ? ` · ${bound.mac}` : ""}${bound.vendor ? ` · ${bound.vendor}` : ""}` : t("nd_bound_missing")}</p>}
      <div className="ed-actions"><button onClick={() => { const copy = duplicateElement(designRef.current, element.id); if (copy) { commit(copy.design); setSelection({ kind: "element", id: copy.id }); } }}>{t("elDuplicate")}</button><button className="danger" onClick={removeSelected}>{t("elDelete")}</button></div>
    </div>;
  };
  const wirePanel = (wire: Wire): ReactNode => {
    const from = design.elements.find(element => element.id === wire.from.element), to = design.elements.find(element => element.id === wire.to.element);
    return <div className="ed-form">
      <h4><span style={{ color: MEDIUM_COLOUR[wireMedium(wire)] }}>●</span> {t(`nd_medium_${wireMedium(wire)}`)}</h4>
      <p className="ed-note">{from ? from.name || label(from.kind) : "?"} → {to ? to.name || label(to.kind) : "?"}</p>
      <label>{t("nd_speed")}<input type="number" min={1} max={400000} step={10} value={wire.speed_mbps ?? ""} placeholder="—" onChange={event => commit(updateWire(designRef.current, wire.id, { speed_mbps: event.target.value === "" ? null : Number(event.target.value) }), `spd:${wire.id}`)} /></label>
      <label>{t("nd_vlan")}<input type="number" min={1} max={4094} step={1} value={wire.vlan ?? ""} placeholder="—" onChange={event => commit(updateWire(designRef.current, wire.id, { vlan: event.target.value === "" ? null : Number(event.target.value) }), `vlan:${wire.id}`)} /></label>
      <label>{t("elWireLength")}<input type="number" min={0} max={5000} step={0.5} value={wire.length_m ?? ""} placeholder="—" onChange={event => commit(updateWire(designRef.current, wire.id, { length_m: event.target.value === "" ? null : Number(event.target.value) }), `len:${wire.id}`)} /></label>
      <label>{t("elWireLabel")}<input type="text" maxLength={40} value={wire.label ?? ""} onChange={event => commit(updateWire(designRef.current, wire.id, { label: event.target.value }), `lab:${wire.id}`)} /></label>
      <div className="ed-actions"><button className="danger" onClick={removeSelected}>{t("elDelete")}</button></div>
    </div>;
  };
  const framePanel = (frame: Frame): ReactNode => <div className="ed-form">
    <h4>{t("elFrame")}</h4>
    <label>{t("elName")}<input type="text" maxLength={60} value={frame.name} onChange={event => commit(updateFrame(designRef.current, frame.id, { name: event.target.value }), `frame:${frame.id}`)} /></label>
    <div className="ed-swatches" role="radiogroup" aria-label={t("elFrameColour")}>{(Object.keys(FRAME_COLOURS) as FrameColour[]).map(colour => <button key={colour} role="radio" aria-checked={frame.colour === colour} className={frame.colour === colour ? "on" : ""} style={{ background: FRAME_COLOURS[colour] }} onClick={() => commit(updateFrame(designRef.current, frame.id, { colour }))} title={colour} />)}</div>
    <div className="ed-actions"><button className="danger" onClick={removeSelected}>{t("elDelete")}</button></div>
  </div>;
  const totalsPanel = (): ReactNode => {
    const totals = analysis.totals;
    return <div className="ed-totals">
      <h4>{t("elTotals")}</h4>
      <dl>
        <dt>{t("elDrawn")}</dt><dd>{totals.elements}</dd><dt>{t("nd_links")}</dt><dd>{totals.links}</dd>
        <dt>{t("nd_wired")}</dt><dd>{totals.wired}</dd><dt>{t("nd_wireless")}</dt><dd>{totals.wireless}</dd>
        <dt>{t("nd_poe")}</dt><dd>{totals.poe_w} W</dd>
        <dt>{t("nd_tied")}</dt><dd>{totals.bound}{node ? ` / ${devices.length}` : ""}</dd>
      </dl>
      <p className="ed-note">{t("nd_disclaimer")}</p>
    </div>;
  };
  const issueText = (issue: Issue): string => format(t(`ndi_${issue.code}`), issue.args);
  const focusIssue = (issue: Issue) => {
    if (issue.element) setSelection({ kind: "element", id: issue.element });
    else if (issue.wire) setSelection({ kind: "wire", id: issue.wire });
    setPanel("properties");
  };

  const paletteItem = (kind: string): ReactNode => <button key={kind} className={`ed-item ${place === kind ? "on" : ""}`} draggable onDragStart={event => { event.dataTransfer.setData("text/armor-kind", kind); event.dataTransfer.effectAllowed = "copy"; }}
    onClick={() => { setPlace(current => current === kind ? null : kind); setTool("select"); setWireFrom(null); say(t("elPlaceHint")); }} title={label(kind)}><KindSwatch kind={kind} size={30} /><span>{label(kind)}</span></button>;

  return <section className="electrical-designer network-designer">
    <header className="ed-head">
      <div><p className="eyebrow">{t("networkDesigner")}</p><h2>{t("nd_title")}</h2><p className="muted">{t("nd_help")}</p></div>
      <span className={`ed-status ${status}`}>{status === "saved" ? t("elSaved") : status === "saving" ? t("elSaving") : status === "offline" ? t("elOffline") : ""}</span>
    </header>
    <div className="ed-layout">
      <aside className="ed-palette" aria-label={t("elPalette")}>
        <h3>{t("elPalette")}</h3>
        {CATEGORY_ORDER.map(category => <details key={category} open>
          <summary style={{ borderColor: CATEGORY_COLOUR[category] }}><span style={{ background: CATEGORY_COLOUR[category] }} />{t(`ndc_${category}`)}</summary>
          <div className="ed-items">{kindsIn(category).map(def => paletteItem(def.kind))}</div>
        </details>)}
      </aside>
      <div className="ed-main">
        <div className="ed-toolbar" role="toolbar">
          <div className="ed-group" role="group" aria-label={t("nd_group_edit")}>
            <button className={tool === "select" && !place ? "on" : ""} onClick={() => { setTool("select"); setPlace(null); setWireFrom(null); }} title={`${t("elToolSelect")} (V)`} aria-label={t("elToolSelect")}>↖</button>
            <button className={tool === "wire" ? "on" : ""} onClick={() => { setTool("wire"); setPlace(null); say(t("elWiringHint")); }} title={`${t("nd_tool_link")} (W)`} aria-label={t("nd_tool_link")}>⌁</button>
            <button onClick={() => { const added = addFrame(designRef.current, snap((-view.x + 80) / view.k), snap((-view.y + 80) / view.k)); if (added) { commit(added.design); setSelection({ kind: "frame", id: added.id }); } }} title={t("elToolFrame")} aria-label={t("elToolFrame")}>▭</button>
            <button onClick={undo} disabled={!past.current.length} title={`${t("elUndo")} (Ctrl+Z)`} aria-label={t("elUndo")}>↶</button>
            <button onClick={redo} disabled={!future.current.length} title={`${t("elRedo")} (Ctrl+Y)`} aria-label={t("elRedo")}>↷</button>
            <button onClick={fit} title={t("elFit")} aria-label={t("elFit")}>⤢</button>
          </div>
          <div className="ed-group" role="group" aria-label={t("nd_group_design")}>
            <button onClick={() => startNew(false)} title={t("elNew")} aria-label={t("elNew")}>▢</button>
            <button onClick={() => startNew(true)} title={t("nd_example")} aria-label={t("nd_example")}>⌂</button>
            <button className="ed-found" onClick={drawWhatWasFound} disabled={!node} title={t("nd_draw_found")} aria-label={t("nd_draw_found")}>⌕</button>
          </div>
          <div className="ed-group" role="group" aria-label={t("nd_group_files")}>
            <button onClick={exportJson} title={t("elExportJson")} aria-label={t("elExportJson")}>{"{ }"}</button>
            <button onClick={exportSvg} disabled={!design.elements.length && !design.frames.length} title={t("elExportSvg")} aria-label={t("elExportSvg")}>◫</button>
            <button onClick={() => fileInput.current?.click()} title={t("elImport")} aria-label={t("elImport")}>⇪</button>
            <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={event => void importJson(event.target.files?.[0])} />
          </div>
          <span className="grow" />
          <button className={`ed-badge ${errors ? "bad" : warnings ? "warn" : "ok"}`} onClick={() => setPanel("checks")}>{errors} {t("elIssueErrors")} · {warnings} {t("elIssueWarnings")}</button>
        </div>
        <div ref={canvas} className="ed-canvas" onDragOver={event => { if (event.dataTransfer.types.includes("text/armor-kind")) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } }}
          onDrop={event => { const kind = event.dataTransfer.getData("text/armor-kind"); if (kind) { event.preventDefault(); placeAt(kind, toWorld(event), false); } }} onContextMenu={event => event.preventDefault()}>
          <svg ref={svgRef} width="100%" height="100%" className={`ed-svg ${place ? "placing" : ""} ${tool === "wire" || wireFrom ? "wiring" : ""}`} onPointerDown={onBackgroundDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <defs>
              <pattern id="nd-grid-small" width={GRID * view.k} height={GRID * view.k} patternUnits="userSpaceOnUse" x={view.x} y={view.y}><path d={`M ${GRID * view.k} 0 L 0 0 0 ${GRID * view.k}`} fill="none" stroke="#0f2f3a" strokeWidth={1} /></pattern>
              <pattern id="nd-grid-big" width={GRID * 5 * view.k} height={GRID * 5 * view.k} patternUnits="userSpaceOnUse" x={view.x} y={view.y}><path d={`M ${GRID * 5 * view.k} 0 L 0 0 0 ${GRID * 5 * view.k}`} fill="none" stroke="#17505f" strokeWidth={1.2} /></pattern>
            </defs>
            <rect data-editor="grid" width="100%" height="100%" fill="#060d13" />
            <rect data-editor="grid" width="100%" height="100%" fill="url(#nd-grid-small)" />
            <rect data-editor="grid" width="100%" height="100%" fill="url(#nd-grid-big)" />
            <g data-world="" transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {design.frames.map(renderFrame)}
              {design.wires.map(renderWire)}
              {design.elements.map(renderElement)}
              <g data-editor="ports">{design.elements.map(renderPorts)}</g>
              {wireFrom && wireStart && pointer && <line data-editor="draft" x1={wireStart.x} y1={wireStart.y} x2={pointer.x} y2={pointer.y} stroke={chosenMedium ? MEDIUM_COLOUR[chosenMedium] : "#fff"} strokeWidth={2} strokeDasharray="6 4" pointerEvents="none" />}
              {place && pointer && (() => { const def = kindDef(place)!; return <rect data-editor="ghost" x={snap(pointer.x - def.w / 2)} y={snap(pointer.y - def.h / 2)} width={def.w} height={def.h} rx={8} fill={CATEGORY_COLOUR[def.category]} fillOpacity={0.18} stroke={CATEGORY_COLOUR[def.category]} strokeDasharray="5 4" pointerEvents="none" />; })()}
            </g>
          </svg>
          {(notice || wireEndPort) && <p className="ed-notice" role="status">{wireEndPort ? t(`nderr_${wireEndPort as ConnectError}`) : notice}</p>}
          {!design.elements.length && !design.frames.length && <div className="ed-empty"><p>{t("elPlaceHint")}</p><button onClick={() => startNew(true)}>{t("nd_example")}</button></div>}
          <p className="ed-keys">{t("elKeys")}</p>
        </div>
      </div>
      <aside className="ed-side">
        <div className="ed-tabs" role="tablist">
          <button role="tab" aria-selected={panel === "properties"} className={panel === "properties" ? "on" : ""} onClick={() => setPanel("properties")}>{t("elInspector")}</button>
          <button role="tab" aria-selected={panel === "checks"} className={panel === "checks" ? "on" : ""} onClick={() => setPanel("checks")}>{t("elChecks")} <b className={errors ? "bad" : warnings ? "warn" : ""}>{analysis.issues.length}</b></button>
        </div>
        {panel === "properties" ? (selectedElement ? elementPanel(selectedElement) : selectedWire ? wirePanel(selectedWire) : selectedFrame ? framePanel(selectedFrame) : totalsPanel())
          : <div className="ed-issues">{analysis.issues.length === 0 ? <p className="ed-note">{t("elNoIssues")}</p> : analysis.issues.map((issue, index) => <button key={`${issue.code}-${index}`} className={`ed-issue ${issue.level}`} onClick={() => focusIssue(issue)}><i />{issueText(issue)}</button>)}<p className="ed-note">{t("nd_disclaimer")}</p></div>}
      </aside>
    </div>
  </section>;
}
