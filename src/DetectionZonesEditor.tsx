/**
 * Configuration > Cameras: the detection zones of a camera and what each arming mode does with them. The live picture is shown with the zones drawn over it; a click adds a corner
 * of a new zone (3 to 12), closing it keeps the zone, and an administrator saves them. Below, one profile per mode (away, home, night, disarmed): which zones are watched, how
 * sensitive the detection is and whether it is told to the people the alarms go to. A mode without a profile watches every zone. Nothing is drawn on the video. Everybody who may
 * look sees the zones; the page cannot change them.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useRef, useState } from "react";
import { createCameraStreamUrl, readDetectionZones, saveDetectionZones, type DetectionProfile, type DetectionSensitivity, type DetectionZone, type DetectionZonesBody } from "./api";
import { LiveImage } from "./components/camera";

type Props = { t: (key: string) => string; origin: string; cameraId: string; isAdmin: boolean };
type Point = [number, number];

export const MODES = ["away", "home", "night", "disarmed"] as const;
export const SENSITIVITIES: readonly DetectionSensitivity[] = ["low", "normal", "high"];
export const MAX_ZONES = 16;
export const MIN_CORNERS = 3;
export const MAX_CORNERS = 12;
const clamp = (value: number): number => Math.min(1, Math.max(0, value));
const round = (value: number): number => Math.round(value * 10_000) / 10_000;

/** A name for the next zone that no other zone has: zone1, zone2, and so on. */
export function nextZoneId(zones: readonly DetectionZone[]): string {
  const used = new Set(zones.map(zone => zone.id));
  for (let n = 1; n <= MAX_ZONES + 1; n += 1) if (!used.has(`zone${n}`)) return `zone${n}`;
  return "zone";
}

/** The labels typed as text ("person, car"): lower case names, no repeats, at most eight; anything that is not a name is dropped. */
export function parseLabels(text: string): string[] {
  const names = text.split(",").map(item => item.trim().toLowerCase()).filter(item => /^[a-z][a-z0-9_-]{0,31}$/.test(item));
  return [...new Set(names)].slice(0, 8);
}

/** The area of a polygon, to refuse a zone that encloses nothing. */
export function area(points: readonly Point[]): number {
  let sum = 0;
  points.forEach((point, index) => { const next = points[(index + 1) % points.length]!; sum += point[0] * next[1] - next[0] * point[1]; });
  return Math.abs(sum) / 2;
}

/** The zone made of the corners clicked, or null when there are too few or they enclose nothing. */
export function zoneFrom(id: string, corners: readonly Point[]): DetectionZone | null {
  if (corners.length < MIN_CORNERS || corners.length > MAX_CORNERS || area(corners) < 0.0005) return null;
  return { id, name: id, points: corners.map(([x, y]) => [round(clamp(x)), round(clamp(y))]), kind: "alert", labels: [], min_frames: 1, min_seconds: 0 };
}

/** A profile with the zone taken out of what it watches (a zone that is removed leaves every profile). */
export function withoutZone(profiles: Partial<Record<(typeof MODES)[number], DetectionProfile>>, id: string): Partial<Record<(typeof MODES)[number], DetectionProfile>> {
  return Object.fromEntries(Object.entries(profiles).map(([mode, profile]) => [mode, { ...profile, watch: profile.watch.filter(zone => zone !== id) }]));
}

export function DetectionZonesEditor({ t, origin, cameraId, isAdmin }: Props) {
  const [body, setBody] = useState<DetectionZonesBody | null>(null);
  const [picture, setPicture] = useState("");
  const [corners, setCorners] = useState<Point[]>([]);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setBody(null); setMessage(null); setCorners([]);
    readDetectionZones(origin, cameraId).then(answer => { if (live) setBody({ zones: answer.zones, profiles: answer.profiles }); }).catch(() => { if (live) setBody({ zones: [], profiles: {} }); });
    createCameraStreamUrl(origin, cameraId).then(url => { if (live) setPicture(url); }).catch(() => undefined);
    return () => { live = false; };
  }, [origin, cameraId]);

  if (body === null) return null;
  const { zones, profiles } = body;
  const update = (next: Partial<DetectionZonesBody>) => { setMessage(null); setBody({ ...body, ...next }); };
  const changeZone = (index: number, change: Partial<DetectionZone>) => update({ zones: zones.map((zone, at) => at === index ? { ...zone, ...change } : zone) });
  const save = async () => {
    try { const answer = await saveDetectionZones(origin, cameraId, body); setBody({ zones: answer.zones, profiles: answer.profiles }); setMessage({ text: t("dz_saved"), bad: false }); }
    catch { setMessage({ text: t("dz_error"), bad: true }); }
  };
  const addCorner = (event: React.MouseEvent) => {
    if (!isAdmin || zones.length >= MAX_ZONES || corners.length >= MAX_CORNERS) return;
    const rect = box.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    setCorners([...corners, [round(clamp((event.clientX - rect.left) / rect.width)), round(clamp((event.clientY - rect.top) / rect.height))]]);
  };
  const closeZone = () => {
    const zone = zoneFrom(nextZoneId(zones), corners);
    if (zone) { setCorners([]); update({ zones: [...zones, zone] }); }
  };
  const draft = corners.map(([x, y]) => `${x * 100},${y * 100}`).join(" ");
  const setProfile = (mode: (typeof MODES)[number], profile: DetectionProfile | null) => {
    const next = { ...profiles };
    if (profile) next[mode] = profile; else delete next[mode];
    update({ profiles: next });
  };

  return <article className="stack-card iz-card" data-testid="detection-zones">
    <h3>{t("dz_title")}</h3>
    <p className="muted">{t("dz_help")}</p>
    <div className={`iz-picture ${isAdmin ? "drawable" : ""}`} ref={box} onClick={addCorner}>
      {picture ? <LiveImage src={picture} alt="" onLost={() => { createCameraStreamUrl(origin, cameraId).then(setPicture).catch(() => undefined); }} /> : <div className="iz-blank" />}
      <svg className="lc-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {zones.map(zone => <polygon key={zone.id} className={`dz-poly ${zone.kind}`} points={zone.points.map(([x, y]) => `${x * 100},${y * 100}`).join(" ")} vectorEffect="non-scaling-stroke" />)}
        {corners.length > 1 && <polyline className="dz-poly draft" points={draft} fill="none" vectorEffect="non-scaling-stroke" />}
      </svg>
    </div>
    {isAdmin && <>
      <p className="muted small">{t("dz_draw")}{corners.length > 0 ? ` (${corners.length} ${t("dz_corners")})` : ""}</p>
      {corners.length > 0 && <div className="pf-actions">
        <button type="button" className="primary" disabled={zoneFrom("x", corners) === null} onClick={closeZone} data-testid="dz-close">{t("dz_close")}</button>
        <button type="button" onClick={() => setCorners(corners.slice(0, -1))}>{t("dz_undo")}</button>
      </div>}
    </>}
    {zones.length === 0 ? <p className="muted">{t("dz_none")}</p>
      : <ul className="iz-list">{zones.map((zone, index) => <li key={zone.id} data-testid={`dz-zone-${zone.id}`}>
        <b>{t("dz_zone")} {zone.id}</b> · {zone.points.length} {t("dz_corners")}
        <label>{t("dz_name")} <input value={zone.name} maxLength={60} disabled={!isAdmin} onChange={event => changeZone(index, { name: event.target.value })} /></label>
        <label>{t("dz_kind")} <select value={zone.kind} disabled={!isAdmin} onChange={event => changeZone(index, { kind: event.target.value === "detection" ? "detection" : "alert" })}>
          <option value="alert">{t("dz_kind_alert")}</option><option value="detection">{t("dz_kind_detection")}</option></select></label>
        <label>{t("dz_labels")} <input defaultValue={zone.labels.join(", ")} disabled={!isAdmin} onBlur={event => changeZone(index, { labels: parseLabels(event.target.value) })} /></label>
        <label>{t("dz_frames")} <input type="number" min={1} max={300} value={zone.min_frames} disabled={!isAdmin} onChange={event => changeZone(index, { min_frames: Math.min(300, Math.max(1, Math.round(Number(event.target.value) || 1))) })} /></label>
        <label>{t("dz_seconds")} <input type="number" min={0} max={3600} step={0.5} value={zone.min_seconds} disabled={!isAdmin} onChange={event => changeZone(index, { min_seconds: Math.min(3600, Math.max(0, Number(event.target.value) || 0)) })} /></label>
        {isAdmin && <button type="button" onClick={() => update({ zones: zones.filter((_, at) => at !== index), profiles: withoutZone(profiles, zone.id) })}>{t("dz_remove")}</button>}
      </li>)}</ul>}
    {zones.length > 0 && <fieldset className="sec-option" data-testid="dz-profiles">
      <legend>{t("dz_profiles_title")}</legend>
      <p className="muted">{t("dz_profiles_help")}</p>
      {MODES.map(mode => {
        const profile = profiles[mode];
        return <div key={mode} data-testid={`dz-profile-${mode}`}>
          <label><input type="checkbox" checked={profile !== undefined} disabled={!isAdmin} onChange={event => setProfile(mode, event.target.checked ? { watch: zones.map(zone => zone.id), sensitivity: "normal", notify: true } : null)} /> <b>{t(`dz_mode_${mode}`)}</b> - {t("dz_profile_set")}</label>
          {profile && <div>
            {zones.map(zone => <label key={zone.id}><input type="checkbox" checked={profile.watch.includes(zone.id)} disabled={!isAdmin}
              onChange={event => setProfile(mode, { ...profile, watch: event.target.checked ? [...profile.watch, zone.id] : profile.watch.filter(id => id !== zone.id) })} /> {zone.name}</label>)}
            <label>{t("dz_sensitivity")} <select value={profile.sensitivity} disabled={!isAdmin} onChange={event => setProfile(mode, { ...profile, sensitivity: SENSITIVITIES.find(value => value === event.target.value) ?? "normal" })}>
              {SENSITIVITIES.map(value => <option key={value} value={value}>{t(`dz_sens_${value}`)}</option>)}</select></label>
            <label><input type="checkbox" checked={profile.notify} disabled={!isAdmin} onChange={event => setProfile(mode, { ...profile, notify: event.target.checked })} /> {t("dz_notify")}</label>
          </div>}
        </div>;
      })}
    </fieldset>}
    {isAdmin && <div className="pf-actions">
      <button className="primary" type="button" onClick={() => void save()} data-testid="dz-save">{t("dz_save")}</button>
      {zones.length > 0 && <button type="button" onClick={() => update({ zones: [], profiles: {} })}>{t("dz_clear")}</button>}
    </div>}
    {message && <p className={message.bad ? "net-order bad" : "net-order good"} role={message.bad ? "alert" : "status"}>{message.text}</p>}
  </article>;
}
