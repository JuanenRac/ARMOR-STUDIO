/**
 * The versions of a design the server keeps (and the unsaved copy this browser kept), to look at and take back.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useState } from "react";
import { deleteDesignVersion, deleteDesignVersions, listDesignVersions, readDesignVersion, type DesignKind, type DesignVersion } from "./api";
import type { Translate } from "./components/camera";

const COUNT_KEYS = ["buildings", "openings", "features", "sensors"] as const;

export function DesignVersionsDialog({ kind, origin, t, close, draft, restoreDraft, restore }: {
  kind: DesignKind; origin: string; t: Translate; close: () => void;
  draft?: { savedAt: string } | null; restoreDraft?: () => void; restore: (design: Record<string, unknown>) => void;
}) {
  const [versions, setVersions] = useState<DesignVersion[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState("");
  const [sure, setSure] = useState("");   // the version (or "all") whose deletion waits for a second click
  useEffect(() => {
    let cancelled = false;
    void listDesignVersions(origin, kind).then(answer => { if (!cancelled) setVersions(answer.versions); }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [origin, kind]);
  const when = (iso: string) => { const date = new Date(iso); return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(); };
  const summary = (counts: Record<string, number>) => Object.entries(counts).filter(([key]) => COUNT_KEYS.includes(key as (typeof COUNT_KEYS)[number]) || kind !== "site")
    .map(([key, value]) => `${value} ${t(`count_${key}`) === `count_${key}` ? key : t(`count_${key}`)}`).join(" · ");
  const take = async (version: DesignVersion) => {
    setBusy(version.id);
    try { const design = await readDesignVersion(origin, kind, version.id); if (design) { restore(design); setDone(t("versionsRestored")); } else setFailed(true); }
    catch { setFailed(true); }
    setBusy("");
  };
  const forget = async (id: string) => {
    if (sure !== id) { setSure(id); return; }
    setSure(""); setBusy(id);
    try {
      if (id === "all") { await deleteDesignVersions(origin, kind); setVersions([]); } else { await deleteDesignVersion(origin, kind, id); setVersions(current => current?.filter(version => version.id !== id) ?? current); }
      setDone(t("versionsDeleted")); setFailed(false);
    } catch { setFailed(true); }
    setBusy("");
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={close} onKeyDown={event => { if (event.key === "Escape") close(); }}>
    <section className="about-dialog versions-dialog" role="dialog" aria-modal="true" aria-labelledby="versions-title" onMouseDown={event => event.stopPropagation()}>
      <button className="modal-close" onClick={close} aria-label={t("close")}>×</button>
      <h2 id="versions-title">{t("versionsTitle")}</h2>
      <p className="muted">{t("versionsHelp")}</p>
      {done && <p className="versions-done" role="status">{done}</p>}
      {failed && <p className="versions-failed" role="alert">{t("versionsFailed")}</p>}
      <ul className="versions-list">
        {draft && restoreDraft && <li><div><strong>{t("versionsDraft")}</strong><small>{when(draft.savedAt)}</small></div><button className="primary" onClick={() => { restoreDraft(); setDone(t("versionsRestored")); }}>{t("versionsRestore")}</button></li>}
        {versions === null && !failed && <li><span className="muted">{t("versionsLoading")}</span></li>}
        {versions?.length === 0 && !draft && <li><span className="muted">{t("versionsEmpty")}</span></li>}
        {versions?.map(version => <li key={version.id}>
          <div><strong>{when(version.saved_at)}</strong><small>#{version.revision}{version.updated_by ? ` · ${t("versionsBy")} ${version.updated_by}` : ""}</small><small>{summary(version.counts)}</small></div>
          <span className="versions-actions">
            <button onClick={() => void take(version)} disabled={busy !== ""}>{t("versionsRestore")}</button>
            <button className="danger" onClick={() => void forget(version.id)} onBlur={() => setSure("")} disabled={busy !== ""}>{sure === version.id ? t("versionsDeleteSure") : t("versionsDelete")}</button>
          </span>
        </li>)}
      </ul>
      {(versions?.length ?? 0) > 1 && <div className="versions-footer"><button className="danger" onClick={() => void forget("all")} onBlur={() => setSure("")} disabled={busy !== ""}>{sure === "all" ? t("versionsDeleteSure") : `${t("versionsDeleteAll")} (${versions?.length})`}</button></div>}
    </section>
  </div>;
}
