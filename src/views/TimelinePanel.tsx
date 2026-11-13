/**
 * History > Review: the timeline of what the vision service saw in the alert zones and the detection zones, newest first, with filters (since, level, camera) and, for an administrator,
 * deleting one entry or all of them. It is empty and says so until an administrator turns on the option "Timeline of the vision service" in Configuration > Security. The evidence is shown as the
 * names of the photo and the recording in the evidence library; nothing is played or downloaded from here.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useState } from "react";
import { ApiError, deleteVisionTimeline, readVisionTimeline, sinceFromLocal, type VisionTimeline, type VisionTimelineItem } from "../api";
import { askConfirm } from "../askConfirm";
import type { Translate } from "../components/camera";

type Props = { t: Translate; origin: string; cameras: Array<{ id: string; name: string }>; canDelete: boolean };

const explain = (t: Translate, error: unknown): string => {
  const code = error instanceof ApiError ? error.code : "generic";
  const text = t(`adm_err_${code}`);
  return text === `adm_err_${code}` ? t("tl_error") : text;
};
const shown = (at: string): string => { const date = new Date(at); return Number.isNaN(date.getTime()) ? at : date.toLocaleString(); };

export function TimelinePanel({ t, origin, cameras, canDelete }: Props) {
  const [since, setSince] = useState("");
  const [level, setLevel] = useState<"" | "alert" | "detection">("");
  const [camera, setCamera] = useState("");
  const [data, setData] = useState<VisionTimeline | null>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean }>({ text: "", bad: false });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setData(await readVisionTimeline(origin, { since: sinceFromLocal(since), level: level || undefined, cameraId: camera || undefined }));
      setMessage({ text: "", bad: false });
    } catch (error) { setData(null); setMessage({ text: explain(t, error), bad: true }); }
    finally { setBusy(false); }
  }, [origin, since, level, camera]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);

  const remove = async (item?: VisionTimelineItem) => {
    if (!(await askConfirm(t(item ? "tl_delete_one_ask" : "tl_delete_all_ask"), t))) return;
    setBusy(true);
    try { const done = await deleteVisionTimeline(origin, item?.id); await load(); setMessage({ text: t("tl_deleted").replace("{n}", String(done.deleted)), bad: false }); }
    catch (error) { setMessage({ text: explain(t, error), bad: true }); setBusy(false); }
  };

  return <div className="history-card timeline-panel" data-testid="timeline-panel">
    <h3>{t("tl_title")}</h3>
    <p className="muted">{t("tl_help")}</p>
    <div className="adm-foot">
      <label>{t("tl_since")}<input type="datetime-local" value={since} onChange={event => setSince(event.target.value)} data-testid="timeline-since" /></label>
      <label>{t("tl_level")}
        <select value={level} onChange={event => setLevel(event.target.value as "" | "alert" | "detection")} data-testid="timeline-level">
          <option value="">{t("tl_level_all")}</option><option value="alert">{t("tl_level_alert")}</option><option value="detection">{t("tl_level_detection")}</option>
        </select></label>
      <label>{t("tl_camera")}
        <select value={camera} onChange={event => setCamera(event.target.value)} data-testid="timeline-camera">
          <option value="">{t("tl_camera_all")}</option>{cameras.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
      <button disabled={busy} onClick={() => void load()}>{t("tl_refresh")}</button>
      {canDelete && data && data.items.length > 0 && <button className="danger-button" disabled={busy} onClick={() => void remove()} data-testid="timeline-delete-all">{t("tl_delete_all")}</button>}
    </div>
    {message.text && <p className={`notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}
    {data && !data.enabled && <p className="notice" role="note" data-testid="timeline-off">{t("tl_off")}</p>}
    {data?.enabled && data.items.length === 0 && <p className="muted" data-testid="timeline-empty">{t("tl_empty").replace("{days}", String(data.days))}</p>}
    {data?.enabled && data.items.length > 0 && <ul className="adm-list" data-testid="timeline-list">{data.items.map(item => <li key={item.id} className="adm-account" data-testid="timeline-item">
      <div className="adm-service-main">
        <strong>{shown(item.at)} - {item.label}</strong>
        <small>{t(item.level === "alert" ? "tl_level_alert" : "tl_level_detection")} - {cameras.find(camera => camera.id === item.camera_id)?.name ?? item.camera_id} - {item.zone_name}</small>
        <small>
          {item.alarm_id ? `${t("tl_alarm")}: ${item.alarm_id}` : t("tl_no_alarm")}
          {item.snapshot_id ? ` - ${t("tl_photo")}: ${item.snapshot_id}` : ""}{item.clip_id ? ` - ${t("tl_video")}: ${item.clip_id}` : ""}
        </small>
      </div>
      {canDelete && <button className="danger-button" disabled={busy} onClick={() => void remove(item)} aria-label={`${t("tl_delete_one")} ${item.id}`}>{t("tl_delete_one")}</button>}
    </li>)}</ul>}
  </div>;
}
