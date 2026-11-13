/**
 * Configuration > Cameras: the counting lines of a camera, the segments over its picture that the observation service counts a crossing of (a gate, a door, a path). The live picture is
 * shown with the lines drawn over it; dragging on the picture draws a new one, each line can be removed, and an administrator saves them. Nothing is drawn on the video. Everybody who
 * may look sees the lines; the page cannot change them.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useRef, useState } from "react";
import { createCameraStreamUrl, readCountLines, readLineCounts, saveCountLines, type CountLine } from "./api";
import { errorText } from "./apiErrorText";
import { LiveImage } from "./components/camera";

type Props = { t: (key: string) => string; origin: string; cameraId: string; isAdmin: boolean };
type Point = { x: number; y: number };

const MIN_LENGTH = 0.03;
const MAX_LINES = 16;
const clamp = (value: number): number => Math.min(1, Math.max(0, value));
const round = (value: number): number => Math.round(value * 10_000) / 10_000;

/** The line between two points of the picture, in fractions, or null when it is too short to be a line. */
export function lineBetween(id: string, from: Point, to: Point): CountLine | null {
  const a: [number, number] = [round(clamp(from.x)), round(clamp(from.y))];
  const b: [number, number] = [round(clamp(to.x)), round(clamp(to.y))];
  return Math.hypot(b[0] - a[0], b[1] - a[1]) < MIN_LENGTH ? null : { id, a, b };
}

/** A name for the next line that no other line has: line1, line2, and so on. */
export function nextLineId(lines: readonly CountLine[]): string {
  const used = new Set(lines.map(line => line.id));
  for (let n = 1; n <= MAX_LINES + 1; n += 1) if (!used.has(`line${n}`)) return `line${n}`;
  return "line";
}

export function CountLinesEditor({ t, origin, cameraId, isAdmin }: Props) {
  const [lines, setLines] = useState<CountLine[] | null>(null);
  const [picture, setPicture] = useState("");
  const [drawing, setDrawing] = useState<{ from: Point; to: Point } | null>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // the crossings counted so far: asked once when the camera is opened and when the person asks again (each ask is written in the audit trail of the server, so it is not polled)
  const [counts, setCounts] = useState<Record<string, { to_left: number; to_right: number }> | null>(null);
  const [countsFailure, setCountsFailure] = useState<unknown>(null);
  const loadCounts = () => {
    setCounts(null); setCountsFailure(null);
    readLineCounts(origin).then(answer => setCounts(answer.cameras[cameraId] ?? {})).catch(error => setCountsFailure(error));
  };

  useEffect(() => {
    let live = true;
    setLines(null); setMessage(null); setCounts(null); setCountsFailure(null);
    readCountLines(origin, cameraId).then(answer => { if (live) setLines(answer.lines); }).catch(() => { if (live) setLines([]); });
    createCameraStreamUrl(origin, cameraId).then(url => { if (live) setPicture(url); }).catch(() => undefined);
    readLineCounts(origin).then(answer => { if (live) setCounts(answer.cameras[cameraId] ?? {}); }).catch(error => { if (live) setCountsFailure(error); });
    return () => { live = false; };
  }, [origin, cameraId]);

  const point = (event: React.PointerEvent): Point => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) };
  };
  const save = async (next: CountLine[]) => {
    try { setLines((await saveCountLines(origin, cameraId, next)).lines); setMessage({ text: t("lc_saved"), bad: false }); }
    catch { setMessage({ text: t("lc_error"), bad: true }); }
  };
  if (lines === null) return null;
  const preview = drawing ? lineBetween("draft", drawing.from, drawing.to) : null;
  const draw = (line: CountLine, key: string, className: string) =>
    <line key={key} className={className} x1={line.a[0] * 100} y1={line.a[1] * 100} x2={line.b[0] * 100} y2={line.b[1] * 100} vectorEffect="non-scaling-stroke" />;

  return <article className="stack-card iz-card">
    <h3>{t("lc_title")}</h3>
    <p className="muted">{t("lc_help")}</p>
    <p className="muted" data-testid="lc-sync-help">{t("lc_sync_help")}</p>
    <div className={`iz-picture ${isAdmin ? "drawable" : ""}`} ref={box}
      onPointerDown={event => { if (!isAdmin || lines.length >= MAX_LINES) return; event.currentTarget.setPointerCapture(event.pointerId); const from = point(event); setDrawing({ from, to: from }); }}
      onPointerMove={event => { if (drawing) setDrawing({ from: drawing.from, to: point(event) }); }}
      onPointerUp={() => { if (drawing) { const line = lineBetween(nextLineId(lines), drawing.from, drawing.to); setDrawing(null); if (line) { setMessage(null); setLines([...lines, line]); } } }}
      onPointerCancel={() => setDrawing(null)}>
      {picture ? <LiveImage src={picture} alt="" onLost={() => { createCameraStreamUrl(origin, cameraId).then(setPicture).catch(() => undefined); }} /> : <div className="iz-blank" />}
      <svg className="lc-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {lines.map((line, index) => draw(line, `l${index}`, "lc-line"))}
        {preview && draw(preview, "draft", "lc-line draft")}
      </svg>
    </div>
    {isAdmin && <p className="muted small">{t("lc_draw")}</p>}
    {lines.length === 0 ? <p className="muted">{t("lc_none")}</p>
      : <ul className="iz-list">{lines.map((line, index) => <li key={line.id}><b>{t("lc_line")} {line.id}</b> · {Math.round(line.a[0] * 100)}%, {Math.round(line.a[1] * 100)}% → {Math.round(line.b[0] * 100)}%, {Math.round(line.b[1] * 100)}%
        {isAdmin && <button type="button" onClick={() => { setMessage(null); setLines(lines.filter((_, at) => at !== index)); }}>{t("lc_remove")}</button>}</li>)}</ul>}
    {lines.length > 0 && <div className="lc-counts" data-testid="lc-counts">
      <h4>{t("lc_counts_title")}</h4>
      {countsFailure !== null ? <p className="muted small">{errorText(t, countsFailure, "lc_counts_err_")}</p> : counts === null ? null : <>
        {lines.some(line => counts[line.id]) ? <ul className="iz-list">{lines.filter(line => counts[line.id]).map(line => <li key={line.id}><b>{t("lc_line")} {line.id}</b> · {t("lc_counts_left")}: {counts[line.id]!.to_left} · {t("lc_counts_right")}: {counts[line.id]!.to_right}</li>)}</ul> : <p className="muted small">{t("lc_counts_none")}</p>}
        <p className="muted small">{t("lc_counts_reading")}</p>
      </>}
      <button type="button" onClick={loadCounts}>{t("lc_counts_refresh")}</button>
    </div>}
    {isAdmin && <div className="pf-actions">
      <button className="primary" type="button" onClick={() => void save(lines)}>{t("lc_save")}</button>
      {lines.length > 0 && <button type="button" onClick={() => { setMessage(null); setLines([]); }}>{t("lc_clear")}</button>}
    </div>}
    {message && <p className={message.bad ? "net-order bad" : "net-order good"} role={message.bad ? "alert" : "status"}>{message.text}</p>}
  </article>;
}
