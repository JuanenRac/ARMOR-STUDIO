/**
 * Local camera evidence library. Media files never pass through browser storage:
 * they are served by the loopback ARMOR media gateway on demand.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { deleteAllMedia, deleteMedia, listMedia, mediaUrl, type MediaItem } from "./api";
import { MenuTitle } from "./menuLogos";

type Filter = "all" | "snapshot" | "recording";
const size = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export function MediaLibrary({ origin, cameras, t }: { origin: string; cameras: Array<{ id: string; name: string }>; t: (key: string) => string }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [activeCameraIds, setActiveCameraIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const result = await listMedia(origin);
      setItems(result.items); setActiveCameraIds(result.activeCameraIds);
      setSelectedId(current => result.items.some(item => item.id === current) ? current : result.items[0]?.id ?? "");
      setMessage("");
    } catch { setMessage(t("recordingFailed")); }
    finally { setLoading(false); }
  }, [origin, t]);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  const visible = useMemo(() => items.filter(item => filter === "all" || item.kind === filter), [items, filter]);
  const selected = visible.find(item => item.id === selectedId) ?? items.find(item => item.id === selectedId) ?? visible[0];
  const cameraName = (id: string) => cameras.find(camera => camera.id === id)?.name ?? id;
  const removeSelected = async () => {
    if (!selected || !window.confirm(t("confirmDeleteMedia"))) return;
    try { await deleteMedia(origin, selected); setMessage(t("mediaDeleted")); await refresh(); }
    catch { setMessage(t("mediaDeleteFailed")); }
  };
  const clearVisible = async () => {
    const kind = filter === "all" ? "all" : filter;
    if (!window.confirm(t("confirmDeleteAllMedia"))) return;
    try { await deleteAllMedia(origin, kind); setMessage(t("mediaDeletedAll")); await refresh(); }
    catch { setMessage(t("mediaDeleteFailed")); }
  };
  return <section className="media-workspace">
    <header className="media-heading">
      <MenuTitle kind="record"><p className="eyebrow">EVIDENCE ARCHIVE</p><h2>{t("mediaLibrary")}</h2><p className="muted">{t("mediaLibraryHelp")}</p></MenuTitle>
      <div className="media-toolbar"><div className="media-filters" role="tablist" aria-label={t("mediaLibrary")}>{(["all", "snapshot", "recording"] as Filter[]).map(value => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? t("allMedia") : value === "snapshot" ? t("snapshots") : t("recordings")}</button>)}</div><button className="danger-button" disabled={!visible.length} onClick={() => void clearVisible()}>{t("deleteAllMedia")}</button></div>
    </header>
    <div className="media-status">{activeCameraIds.length ? <><span className="record-dot" /> {t("recording")}: {activeCameraIds.map(cameraName).join(", ")}</> : <>{items.length} {t("allMedia").toLowerCase()}</>} {message && <strong>{message}</strong>}</div>
    <div className="media-library">
      <aside className="media-list" aria-label={t("mediaLibrary")}>
        {loading && <p className="muted">…</p>}
        {!loading && !visible.length && <p className="media-empty">{t("noMedia")}</p>}
        {visible.map(item => <button key={item.id} className={`media-item ${selected?.id === item.id ? "selected" : ""}`} onClick={() => setSelectedId(item.id)}>
          <span className={`media-kind ${item.kind}`}>{item.kind === "snapshot" ? "PHOTO" : "VIDEO"}</span><span className="media-item-copy"><strong>{cameraName(item.cameraId)}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></span><small>{size(item.bytes)}</small>
        </button>)}
      </aside>
      <article className="media-preview">
        {selected ? <><div className="preview-stage">{selected.kind === "snapshot" ? <img src={mediaUrl(origin, selected)} alt={`${t("snapshot")}: ${cameraName(selected.cameraId)}`} /> : <video key={selected.id} src={mediaUrl(origin, selected)} controls preload="metadata" />}</div><footer className="preview-footer"><div><span className={`media-kind ${selected.kind}`}>{selected.kind === "snapshot" ? "PHOTO" : "VIDEO"}</span><h3>{cameraName(selected.cameraId)}</h3><p>{t("createdAt")}: {new Date(selected.createdAt).toLocaleString()} · {t("fileSize")}: {size(selected.bytes)}</p></div><button className="danger-button" onClick={() => void removeSelected()}>{t("deleteMedia")}</button></footer></> : <div className="media-empty preview-empty"><span>◉</span><p>{t("selectMedia")}</p></div>}
      </article>
    </div>
  </section>;
}
