/**
 * Camera tile, PTZ pad and the maximized camera dialog.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { createCameraStreamUrl, type Reachability } from "../api";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { StreamRenewContext } from "../streamContext";

/**
 * A live picture (a stream that never ends). When it goes away its connection is closed on purpose: a browser keeps a removed picture's stream open until it
 * collects the garbage, and after some menu changes those streams used up every connection to the server, so no button answered any more.
 */
export function LiveImage({ src, alt, onLost }: { src: string; alt: string; /** Called when the stream ends or fails: the owner asks for a fresh address (the old one may have expired) and passes it back as `src`. */ onLost?: () => void }) {
  // The picture on show stays until the next stream has its first frame, so going to another camera never shows black in between.
  const [shown, setShown] = useState(src);
  const next = useRef<HTMLImageElement>(null), current = useRef<HTMLImageElement>(null);
  // A stream that stops (the camera or the relay restarted, the machine was busy) is asked for again - 1.5 s, then 3, 6, up to 15 s apart - instead of leaving a frozen picture.
  const failures = useRef(0), retry = useRef<number | undefined>(undefined);
  const lost = () => {
    if (!onLost || retry.current !== undefined) return;
    const wait = Math.min(15_000, 1500 * 2 ** failures.current);
    failures.current += 1;
    retry.current = window.setTimeout(() => { retry.current = undefined; onLost(); }, wait);
  };
  useEffect(() => () => window.clearTimeout(retry.current), []);
  useEffect(() => { const element = next.current; return () => { if (element) element.removeAttribute("src"); }; }, [src]);
  useEffect(() => () => { current.current?.removeAttribute("src"); }, [shown]);
  return <>
    <img ref={current} key={shown} src={shown} alt={alt} onLoad={() => { failures.current = 0; }} onError={lost} />
    {src !== shown && <img ref={next} key={src} src={src} alt="" aria-hidden="true" className="live-next" onLoad={() => { failures.current = 0; setShown(src); }} onError={() => { setShown(src); lost(); }} />}
  </>;
}
import { cameraIsConfigured, type Camera } from "../domain";

export type Translate = (key: string) => string;

export function CameraTile({ camera, selected, select, toggle, snapshot, record, expand, recording, streamUrl, reachability, invokePtz, t, choices, pick }: {
  camera: Camera; selected: boolean; select: () => void; toggle: () => void; snapshot: () => void; record: () => void; expand: () => void;
  /** The cameras this place of the grid can show, and the way to change it. */
  choices?: readonly Camera[]; pick?: (id: string) => void;
  recording: boolean; streamUrl?: string; reachability?: Reachability; invokePtz: (command: string) => Promise<void>; t: Translate;
}) {
  const [ptzOpen, setPtzOpen] = useState(false);
  const renewStream = useContext(StreamRenewContext);
  const configured = cameraIsConfigured(camera);
  const powered = camera.enabled && configured;
  // The server's watchdog knows whether the camera answers on the network; an enabled camera that does not is not "online".
  const unreachable = powered && reachability === "offline";
  return <article className={`camera-tile ${selected ? "selected" : ""}`} onClick={select} onDoubleClick={expand}>
    <div className="camera-image">
      {powered && camera.liveVideoAvailable && streamUrl ? <LiveImage src={streamUrl} alt={`${t("cameraMonitor")}: ${camera.name}`} onLost={() => renewStream(camera.id)} /> : powered && camera.snapshotUrl ? <img src={camera.snapshotUrl} alt={`${t("snapshot")}: ${camera.name}`} /> : <div className="camera-placeholder"><span>◉</span><p>{configured ? t("noStream") : t("selectCameraFirst")}</p></div>}
      <span className={`live-chip ${powered && !unreachable ? "online" : "offline"}`}>{unreachable ? t("unreachable") : powered ? t("online") : t("powerOff")}</span>
      <div className="camera-overlay-actions" aria-label={`${t("cameraMonitor")}: ${camera.name}`}>
        <button className={powered ? "" : "power-off"} title={powered ? t("powerOff") : t("powerOn")} aria-label={powered ? t("powerOff") : t("powerOn")} disabled={!powered && !configured} onClick={event => { event.stopPropagation(); toggle(); }}>⏻</button>
        <button title={t("snapshot")} aria-label={t("snapshot")} disabled={!powered || !camera.liveVideoAvailable} onClick={event => { event.stopPropagation(); snapshot(); }}>◉</button>
        <button className={recording ? "recording-button" : ""} title={recording ? t("stopRecording") : t("record")} aria-label={recording ? t("stopRecording") : t("record")} disabled={!powered || !camera.liveVideoAvailable} onClick={event => { event.stopPropagation(); record(); }}>{recording ? "■" : "●"}</button>
        <button className={ptzOpen ? "ptz-toggle active" : "ptz-toggle"} title={ptzOpen ? t("ptzHide") : t("ptzShow")} aria-label={ptzOpen ? t("ptzHide") : t("ptzShow")} aria-pressed={ptzOpen} disabled={!powered || !camera.hasCredentials} onClick={event => { event.stopPropagation(); setPtzOpen(open => !open); }}>PTZ</button>
        <button className="camera-expand" title={t("maximizeCamera")} aria-label={t("maximizeCamera")} onClick={event => { event.stopPropagation(); expand(); }}>⛶</button>
      </div>
      {ptzOpen && powered && <div className="ptz-overlay"><CameraPtz enabled={powered && Boolean(camera.hasCredentials)} invoke={invokePtz} t={t} /></div>}
    </div>
    <div className="camera-meta"><div><strong>{camera.name}</strong><small>{camera.host}</small></div>{choices && pick && choices.length > 1 && <select className="camera-slot" aria-label={t("cam_slot")} title={t("cam_slot")} value={camera.id} onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()} onChange={event => pick(event.target.value)}>{choices.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</div>
  </article>;
}


/** How long a press lasts at least (a tap must still move the camera visibly) and how often a held button repeats. */
export const PTZ_MIN_MOVE_MS = 300;
export const PTZ_REPEAT_MS = 1000;

/**
 * A button that moves the camera while it is held: pressing sends the move (and repeats it every second,
 * because the server stops a move on its own after a couple of seconds), releasing sends a stop.
 */
function HoldButton({ command, label, title, enabled, invoke }: { command: string; label: string; title: string; enabled: boolean; invoke: (command: string) => Promise<void> }) {
  const repeat = useRef<number | undefined>(undefined);
  const pressedAt = useRef(0);
  const held = useRef(false);
  const release = () => {
    if (!held.current) return;
    held.current = false;
    window.clearInterval(repeat.current);
    const wait = Math.max(0, PTZ_MIN_MOVE_MS - (Date.now() - pressedAt.current));
    window.setTimeout(() => void invoke("stop"), wait);
  };
  const press = () => {
    if (!enabled || held.current) return;
    held.current = true;
    pressedAt.current = Date.now();
    void invoke(command);
    repeat.current = window.setInterval(() => void invoke(command), PTZ_REPEAT_MS);
  };
  useEffect(() => () => { window.clearInterval(repeat.current); if (held.current) void invoke("stop"); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <button
    type="button" disabled={!enabled} title={title} aria-label={title}
    onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); press(); }}
    onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}
    onKeyDown={event => { if ((event.key === " " || event.key === "Enter") && !event.repeat) { event.preventDefault(); press(); } }}
    onKeyUp={event => { if (event.key === " " || event.key === "Enter") release(); }}
    onBlur={release}
  >{label}</button>;
}

/** The PTZ controls: four directions and stop, zoom, and the camera's own error in place when a move fails. */
export function CameraPtz({ enabled, invoke, t }: { enabled: boolean; invoke: (command: string) => Promise<void>; t: Translate }) {
  const [problem, setProblem] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const safe = async (command: string) => {
    try { await invoke(command); if (command !== "stop") setProblem(""); }
    catch (error) {
      setProblem(error instanceof Error ? error.message : t("ptzUnavailable"));
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setProblem(""), 6000);
    }
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const hold = (command: string, label: string, title: string) => <HoldButton command={command} label={label} title={title} enabled={enabled} invoke={safe} />;
  return <div className="camera-ptz" aria-label={t("ptzControls")} onClick={event => event.stopPropagation()}>
    <div className="ptz-pad"><i />{hold("up", "▲", t("ptzUp"))}<i />{hold("left", "◀", t("ptzLeft"))}
      <button type="button" disabled={!enabled} title={t("ptzStop")} aria-label={t("ptzStop")} onClick={() => void safe("stop")}>■</button>
      {hold("right", "▶", t("ptzRight"))}<i />{hold("down", "▼", t("ptzDown"))}<i /></div>
    <div className="ptz-zoom">{hold("zoomIn", "+", t("ptzZoomIn"))}{hold("zoomOut", "−", t("ptzZoomOut"))}</div>
    {problem && <p className="ptz-problem" role="alert">{problem}</p>}
  </div>;
}

export function CameraFullscreen({ camera, cameras, origin, recording, t, close, fullScreen, step, snapshot, toggleRecording, invokePtz }: {
  camera: Camera; cameras: readonly Camera[]; origin: string; recording: boolean; t: Translate; close: () => void; fullScreen: () => void;
  step: (offset: number) => void; snapshot: () => void; toggleRecording: () => void; invokePtz: (command: string) => Promise<void>;
}) {
  const [ptzOpen, setPtzOpen] = useState(false);
  const index = cameras.findIndex(item => item.id === camera.id);
  const live = camera.enabled && camera.liveVideoAvailable;
  // The picture is asked for the same way as in the tiles - with a short-lived ticket from the server - and again whenever the stream stops.
  const [liveUrl, setLiveUrl] = useState("");
  const renew = useCallback(() => { void createCameraStreamUrl(origin, camera.id).then(setLiveUrl).catch(() => undefined); }, [origin, camera.id]);
  useEffect(() => { setLiveUrl(""); if (live) renew(); }, [live, renew]);
  // The cameras on either side start their video now (asking for a stream address does that), so stepping to one shows a picture at once.
  useEffect(() => {
    if (cameras.length < 2 || index < 0) return;
    for (const offset of [1, -1]) {
      const neighbour = cameras[(index + offset + cameras.length) % cameras.length];
      if (neighbour && neighbour.id !== camera.id && neighbour.enabled && neighbour.liveVideoAvailable) void createCameraStreamUrl(origin, neighbour.id).catch(() => undefined);
    }
  }, [origin, camera.id, index, cameras]);
  // The keyboard works here as the buttons do: left and right go to the other cameras, Escape goes back.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, step]);
  return <div className="camera-fullscreen" role="dialog" aria-modal="true" aria-label={camera.name}>
    <header>
      <div><button className="icon-button camera-back" onClick={close}>‹ {t("cam_back_grid")}</button><span className="live-chip online">{t("online")}</span><h2>{camera.name}</h2><small>{camera.host}</small></div>
      <div><button className={ptzOpen ? "icon-button ptz-toggle active" : "icon-button ptz-toggle"} title={ptzOpen ? t("ptzHide") : t("ptzShow")} aria-pressed={ptzOpen} disabled={!camera.enabled || !camera.hasCredentials} onClick={() => setPtzOpen(open => !open)}>PTZ</button><button className="icon-button" title={t("fullscreen")} onClick={fullScreen}>⛶</button><button className="icon-button" title={t("close")} onClick={close}>×</button></div>
    </header>
    <div className="camera-fullscreen-video">
      {cameras.length > 1 && <button className="camera-switch previous" title={t("previousCamera")} onClick={() => step(-1)}>‹</button>}
      {live && liveUrl ? <LiveImage src={liveUrl} alt={`${t("cameraMonitor")}: ${camera.name}`} onLost={renew} /> : live ? <div className="camera-placeholder"><span>{t("connecting")}</span></div> : <div className="camera-placeholder"><span>◉</span><p>{t("noStream")}</p></div>}
      {cameras.length > 1 && <button className="camera-switch next" title={t("nextCamera")} onClick={() => step(1)}>›</button>}
      <span className="camera-position">{index + 1} / {cameras.length}</span>
      {ptzOpen && <div className="ptz-overlay big"><CameraPtz enabled={camera.enabled && Boolean(camera.hasCredentials)} invoke={invokePtz} t={t} /></div>}
    </div>
    <footer>
      <div className="fullscreen-actions">
        <button disabled={!live} onClick={snapshot}>{t("snapshot")}</button>
        <button className={recording ? "recording-button" : ""} disabled={!live} onClick={toggleRecording}>{recording ? t("stopRecording") : t("record")}</button>
      </div>
    </footer>
  </div>;
}
