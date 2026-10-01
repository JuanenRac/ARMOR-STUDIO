/**
 * The overview, camera monitor and radar views.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CameraTile, type Translate } from "../components/camera";
import { fitGrid } from "../cameraGrid";
import { resolveSlots } from "../cameraLayout";
import { GRID_SIZES, type Camera, type GridSize, type View } from "../domain";
import type { Reachability } from "../api";
import type { NodeState } from "../types";
import { MenuTitle } from "../menuLogos";

export function OverviewView({ nodes, cameras, setView, t }: { nodes: NodeState[]; cameras: readonly Camera[]; setView: (view: View) => void; t: Translate }) {
  return <>
    <section className="metric-strip">
      <article><span>{t("fieldNodes")}</span><strong>{nodes.length}</strong></article>
      <article><span>{t("online")}</span><strong>{nodes.filter(node => node.online).length}</strong></article>
      <article><span>{t("activeTracks")}</span><strong>{nodes.reduce((sum, node) => sum + node.target_count, 0)}</strong></article>
      <article><span>{t("camerasEnabled")}</span><strong>{cameras.filter(camera => camera.enabled).length}</strong></article>
    </section>
    <section className="content-grid">
      <article className="overview-map">
        <p className="eyebrow">{t("perimeterOverview")}</p><h2>{t("overview")}</h2>
        <div className="mini-plan">
          {nodes.map((node, index) => <span key={node.node_id} className={`mini-node ${node.alert_level}`} style={{ left: `${20 + index * 54}%`, top: `${30 + index * 32}%` }}>{node.node_id.slice(0, 2).toUpperCase()}</span>)}
          {cameras.filter(camera => camera.enabled).map(camera => <span key={camera.id} className="mini-camera" style={{ left: `${camera.x}%`, top: `${camera.y}%` }}>⌾</span>)}
        </div>
      </article>
      <article className="stack-card">
        <p className="eyebrow">{t("operationalQueue")}</p><h2>{t("overview")}</h2>
        <button className="primary" onClick={() => setView("cameras")}>{t("openMonitor")}</button>
        <button onClick={() => setView("siteDesigner")}>{t("editInstallation")}</button>
        <button onClick={() => setView("configuration")}>{t("configureConnections")}</button>
      </article>
    </section>
  </>;
}

export type CameraViewProps = {
  cameras: readonly Camera[]; selected: Camera | undefined; selectedId: string; gridSize: GridSize; setGridSize: (size: GridSize) => void;
  recordingIds: readonly string[]; streamUrls: Record<string, string>; reachability: Record<string, Reachability>; notice: string; t: Translate;
  select: (id: string) => void; toggle: (camera: Camera) => void; snapshot: (camera: Camera) => void; record: (camera: Camera) => void;
  expand: (id: string) => void; ptz: (camera: Camera, command: string) => Promise<void>;
  /** The camera chosen for each place of the grid ("" = the next one not shown), and the way to change one. */
  slots: readonly string[]; setSlot: (index: number, id: string) => void;
  /** The settings of the cameras, shown in place of the grid when "Configure cameras" is on. */
  settings: ReactNode;
};

const GRID_GAP = 12;

/** The size of an element, kept up to date as the window or the layout around it changes. The element is followed through a callback ref, so one that is taken out and put back (the camera frame while the settings are open) is measured again. */
function useElementSize<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!element) return;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return { ref: setElement, ...size };
}

/** The chosen view on the whole screen, in the order and with the look of the normal view (the same tiles, with their name, state and buttons), but touching each other with no gap. Esc (or leaving full screen) goes back. */
function CameraWall(props: CameraViewProps & { shown: readonly Camera[]; exit: () => void }) {
  const { shown, exit, cameras, t } = props;
  const root = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const element = root.current;
    // The browser's full screen takes the whole display; where it is refused the wall still covers the window.
    void element?.requestFullscreen?.().catch(() => undefined);
    const leave = () => { if (!document.fullscreenElement) exit(); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") exit(); };
    const resize = () => setScreen({ width: window.innerWidth, height: window.innerHeight });
    document.addEventListener("fullscreenchange", leave);
    window.addEventListener("keydown", key);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("fullscreenchange", leave);
      window.removeEventListener("keydown", key);
      window.removeEventListener("resize", resize);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [exit]);
  // The wall is the chosen view, whatever number of cameras fill it (6 views are 3 x 2, 8 are 4 x 2, 9 are 3 x 3, 12 are 4 x 3, 16 are 4 x 4; a place without a camera stays black), laid out as the
  // normal view is - every picture 16:9 and whole - only with no gap between the cameras, so the block of them is as large as the screen allows.
  const layout = fitGrid(props.gridSize, Math.max(screen.width, 640), screen.height, 0);
  const placed = resolveSlots(cameras.map(camera => camera.id), props.slots, props.gridSize);
  return <div ref={root} className="camera-wall camera-frame" role="dialog" aria-label={t("cam_wall")}>
    <div className="camera-wall-grid" style={{ gridTemplateColumns: `repeat(${layout.columns}, ${layout.tileWidth}px)`, gridAutoRows: `${layout.tileHeight}px` }}>
      {shown.map(camera => <CameraTile key={camera.id} choices={cameras} pick={id => props.setSlot(placed.indexOf(camera.id), id)} camera={camera} selected={camera.id === props.selectedId} select={() => props.select(camera.id)}
        toggle={() => props.toggle(camera)} snapshot={() => props.snapshot(camera)} record={() => props.record(camera)} expand={() => { exit(); props.expand(camera.id); }} recording={props.recordingIds.includes(camera.id)}
        streamUrl={props.streamUrls[camera.id]} reachability={props.reachability[camera.id]} invokePtz={command => props.ptz(camera, command)} t={t} />)}
    </div>
    <p className="camera-wall-hint">{t("cam_wall_exit")}</p>
  </div>;
}

export function CameraMonitorView(props: CameraViewProps) {
  const { cameras, selected, selectedId, gridSize, recordingIds, streamUrls, reachability, notice, t } = props;
  const frame = useElementSize<HTMLDivElement>();
  const [configuring, setConfiguring] = useState(false);
  const [wall, setWall] = useState(false);
  const leaveWall = useCallback(() => setWall(false), []);
  // Every tile is 16:9 and as large as the frame allows for the chosen number of views; the picture inside is never cropped.
  const layout = fitGrid(gridSize, frame.width, frame.height, GRID_GAP);
  const placed = resolveSlots(cameras.map(camera => camera.id), props.slots, gridSize);
  const shown = placed.flatMap(id => { const camera = cameras.find(item => item.id === id); return camera ? [camera] : []; });
  const shownIndex = (id: string) => placed.indexOf(id);
  return <section className="camera-workspace">
    {wall && <CameraWall {...props} shown={shown} exit={leaveWall} />}
    <div className="panel-heading">
      <MenuTitle kind="cameras"><p className="eyebrow">{t("videoOperations")}</p><h2>{t("cameraMonitor")}</h2><p className="muted">{t("cameraHelp")}</p></MenuTitle>
      <div className="grid-picker">{!configuring && GRID_SIZES.map(size => <button key={size} className={gridSize === size ? "active" : ""} onClick={() => props.setGridSize(size)}>{size} {size > 1 ? t("views") : t("view")}</button>)}{!configuring && gridSize >= 2 && shown.length >= 2 && <button title={t("cam_wall_help")} onClick={() => setWall(true)}>⛶ {t("cam_wall")}</button>}<button className={configuring ? "active" : ""} onClick={() => setConfiguring(value => !value)}>{configuring ? `‹ ${t("cam_back")}` : `⚙ ${t("cam_configure")}`}</button></div>
    </div>
    {configuring ? <div className="camera-config-frame">{props.settings}</div> : <>
    <div ref={frame.ref} className={`camera-frame ${layout.scrolls ? "scrolls" : ""}`}>
      <div className={`camera-grid grid-${gridSize}`} style={layout.tileWidth > 0 ? { gridTemplateColumns: `repeat(${layout.columns}, ${layout.tileWidth}px)`, gridAutoRows: `${layout.tileHeight}px`, gap: GRID_GAP } : undefined}>
        {shown.map(camera => <CameraTile key={camera.id} choices={cameras} pick={id => props.setSlot(shownIndex(camera.id), id)} camera={camera} selected={camera.id === selectedId} select={() => props.select(camera.id)} toggle={() => props.toggle(camera)} snapshot={() => props.snapshot(camera)} record={() => props.record(camera)} expand={() => props.expand(camera.id)} recording={recordingIds.includes(camera.id)} streamUrl={streamUrls[camera.id]} reachability={reachability[camera.id]} invokePtz={command => props.ptz(camera, command)} t={t} />)}
      </div>
    </div>
    <p className="notice">{notice} {t("cam_hint")}</p>
    </>}
  </section>;
}
