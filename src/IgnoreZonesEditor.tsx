/**
 * Configuration > Cameras: the parts of a camera's picture that the observation service must not look at (a tree, a road, a screen). The live picture is shown with the zones drawn over
 * it as rectangles; dragging on the picture draws a new one, each zone can be removed, and an administrator saves them. Nothing is cut from the video: only the movement detection
 * leaves those pixels out. Everybody who may look sees the zones; the page cannot change them.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useRef, useState } from "react";
import { createCameraStreamUrl, readIgnoreZones, saveIgnoreZones, type IgnoreZone } from "./api";
import { LiveImage } from "./components/camera";

type Props = { t: (key: string) => string; origin: string; cameraId: string; isAdmin: boolean };

const MIN_SIDE = 0.02;
const MAX_ZONES = 16;
const clamp = (value: number): number => Math.min(1, Math.max(0, value));
const round = (value: number): number => Math.round(value * 10_000) / 10_000;

/** The rectangle between two corners, in fractions, or null when it is too small to be a zone. */
export function zoneBetween(a: { x: number; y: number }, b: { x: number; y: number }): IgnoreZone | null {
  const x = clamp(Math.min(a.x, b.x)), y = clamp(Math.min(a.y, b.y));
  const w = clamp(Math.max(a.x, b.x)) - x, h = clamp(Math.max(a.y, b.y)) - y;
  return w < MIN_SIDE || h < MIN_SIDE ? null : { x: round(x), y: round(y), w: round(w), h: round(h) };
}

export function IgnoreZonesEditor({ t, origin, cameraId, isAdmin }: Props) {
  const [zones, setZones] = useState<IgnoreZone[] | null>(null);
  const [picture, setPicture] = useState("");
  const [drawing, setDrawing] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setZones(null); setMessage(null);
    readIgnoreZones(origin, cameraId).then(answer => { if (live) setZones(answer.zones); }).catch(() => { if (live) setZones([]); });
    createCameraStreamUrl(origin, cameraId).then(url => { if (live) setPicture(url); }).catch(() => undefined);
    return () => { live = false; };
  }, [origin, cameraId]);

  const point = (event: React.PointerEvent): { x: number; y: number } => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) };
  };
  const save = async (next: IgnoreZone[]) => {
    try { setZones((await saveIgnoreZones(origin, cameraId, next)).zones); setMessage({ text: t("iz_saved"), bad: false }); }
    catch { setMessage({ text: t("iz_error"), bad: true }); }
  };
  if (zones === null) return null;
  const preview = drawing ? zoneBetween(drawing.from, drawing.to) : null;
  const show = (zone: IgnoreZone, key: string, className: string) =>
    <div key={key} className={className} style={{ left: `${zone.x * 100}%`, top: `${zone.y * 100}%`, width: `${zone.w * 100}%`, height: `${zone.h * 100}%` }} />;

  return <article className="stack-card iz-card">
    <h3>{t("iz_title")}</h3>
    <p className="muted">{t("iz_help")}</p>
    <div className={`iz-picture ${isAdmin ? "drawable" : ""}`} ref={box}
      onPointerDown={event => { if (!isAdmin || zones.length >= MAX_ZONES) return; event.currentTarget.setPointerCapture(event.pointerId); const from = point(event); setDrawing({ from, to: from }); }}
      onPointerMove={event => { if (drawing) setDrawing({ from: drawing.from, to: point(event) }); }}
      onPointerUp={() => { if (drawing) { const zone = zoneBetween(drawing.from, drawing.to); setDrawing(null); if (zone) { setMessage(null); setZones([...zones, zone]); } } }}
      onPointerCancel={() => setDrawing(null)}>
      {picture ? <LiveImage src={picture} alt="" onLost={() => { createCameraStreamUrl(origin, cameraId).then(setPicture).catch(() => undefined); }} /> : <div className="iz-blank" />}
      {zones.map((zone, index) => show(zone, `z${index}`, "iz-zone"))}
      {preview && show(preview, "draft", "iz-zone draft")}
    </div>
    {isAdmin && <p className="muted small">{t("iz_draw")}</p>}
    {zones.length === 0 ? <p className="muted">{t("iz_none")}</p>
      : <ul className="iz-list">{zones.map((zone, index) => <li key={index}><b>{t("iz_zone")} {index + 1}</b> · {Math.round(zone.x * 100)}%, {Math.round(zone.y * 100)}% · {Math.round(zone.w * 100)} × {Math.round(zone.h * 100)} %
        {isAdmin && <button type="button" onClick={() => { setMessage(null); setZones(zones.filter((_, at) => at !== index)); }}>{t("iz_remove")}</button>}</li>)}</ul>}
    {isAdmin && <div className="pf-actions">
      <button className="primary" type="button" onClick={() => void save(zones)}>{t("iz_save")}</button>
      {zones.length > 0 && <button type="button" onClick={() => { setMessage(null); setZones([]); }}>{t("iz_clear")}</button>}
    </div>}
    {message && <p className={message.bad ? "net-order bad" : "net-order good"} role={message.bad ? "alert" : "status"}>{message.text}</p>}
  </article>;
}
