/**
 * Configuration > Automatic capture: what the server takes by itself when a camera sees something while the perimeter is armed - whether it is on, the photos (how many and how far
 * apart), the video (how long) and how long a camera is left alone afterwards - and the latest things it captured. Everybody who may look sees the values; an administrator sets them.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useState } from "react";
import { readCaptureSettings, saveCaptureSettings, type CaptureRecord, type CaptureSettings } from "./api";
import { formatDateTime } from "./networkModel";

type Props = { t: (key: string) => string; origin: string; isAdmin: boolean };

const LIMITS = { photo_count: [1, 60], photo_interval_s: [1, 300], video_seconds: [3, 300], cooldown_s: [5, 3600] } as const;

export function CapturePanel({ t, origin, isAdmin }: Props) {
  const [settings, setSettings] = useState<CaptureSettings | null>(null);
  const [recent, setRecent] = useState<CaptureRecord[]>([]);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  useEffect(() => {
    let live = true;
    readCaptureSettings(origin).then(answer => { if (live) { setSettings(answer.settings); setRecent(answer.recent); } }).catch(() => undefined);
    return () => { live = false; };
  }, [origin]);
  if (!settings) return <article className="stack-card"><h3>{t("cap_title")}</h3><p className="muted">…</p></article>;

  const change = (patch: Partial<CaptureSettings>) => { setMessage(null); setSettings({ ...settings, ...patch }); };
  const number = (key: keyof typeof LIMITS, label: string, hint?: string, disabled = false) => {
    const [low, high] = LIMITS[key];
    return <label className="cap-number">{t(label)}
      <input type="number" min={low} max={high} step={1} value={settings[key]} disabled={!isAdmin || disabled}
        onChange={event => change({ [key]: Math.min(high, Math.max(low, Math.round(Number(event.target.value) || low))) } as Partial<CaptureSettings>)} />
      {hint && <small className="muted">{t(hint)}</small>}</label>;
  };
  const toggle = (key: "enabled" | "photo" | "video", label: string, disabled = false) =>
    <label className="pf-toggle"><input type="checkbox" checked={settings[key]} disabled={!isAdmin || disabled} onChange={event => change({ [key]: event.target.checked } as Partial<CaptureSettings>)} /><span><strong>{t(label)}</strong></span></label>;
  const save = async () => {
    try { setSettings((await saveCaptureSettings(origin, settings)).settings); setMessage({ text: t("cap_saved"), bad: false }); }
    catch { setMessage({ text: t("cap_error"), bad: true }); }
  };

  return <div className="config-grid">
    <article className="stack-card full-card">
      <h3>{t("cap_title")}</h3>
      <p className="muted">{t("cap_help")}</p>
    </article>
    <article className="stack-card">
      {toggle("enabled", "cap_enabled")}
      {toggle("photo", "cap_photo", !settings.enabled)}
      {number("photo_count", "cap_photo_count", undefined, !settings.enabled || !settings.photo)}
      {number("photo_interval_s", "cap_photo_interval", undefined, !settings.enabled || !settings.photo || settings.photo_count < 2)}
      {toggle("video", "cap_video", !settings.enabled)}
      {number("video_seconds", "cap_video_seconds", undefined, !settings.enabled || !settings.video)}
      {number("cooldown_s", "cap_cooldown", "cap_cooldown_h", !settings.enabled)}
      {isAdmin && <div className="pf-actions"><button className="primary" type="button" onClick={() => void save()}>{t("cap_save")}</button></div>}
      {message && <p className={message.bad ? "net-order bad" : "net-order good"} role={message.bad ? "alert" : "status"}>{message.text}</p>}
    </article>
    <article className="stack-card">
      <h3>{t("cap_recent")}</h3>
      {recent.length === 0 ? <p className="muted">{t("cap_recent_none")}</p>
        : <ul className="cap-recent">{recent.map(item => <li key={`${item.camera_id}${item.at}`}><b>{item.camera_id}</b> · {formatDateTime(Date.parse(item.at))} · {item.photos} {t("cap_photos")}{item.video ? ` ${t("cap_with_video")}` : ""}</li>)}</ul>}
    </article>
  </div>;
}
