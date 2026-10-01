/**
 * The versions of a design the server keeps (and the unsaved copy this browser kept), to look at and take back.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useState } from "react";
import { listDesignVersions, readDesignVersion, type DesignKind, type DesignVersion } from "./api";
import type { Translate } from "./components/camera";

const COUNT_KEYS = ["buildings", "openings", "features", "sensors"] as const;

export function DesignVersionsDialog({ kind, origin, t, close, draft, restoreDraft, restore }: {
  kind: DesignKind; origin: string; t: Translate; close: () => void;
  draft?: { savedAt: string } | null; restoreDraft?: () => void; restore: (design: Record<string, unknown>) => void;
}) {
  const [versions, setVersions] = useState<DesignVersion[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState(false);
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
    try { const design = await readDesignVersion(origin, kind, version.id); if (design) { restore(design); setDone(true); } else setFailed(true); }
    catch { setFailed(true); }
    setBusy("");
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={close} onKeyDown={event => { if (event.key === "Escape") close(); }}>
    <section className="about-dialog versions-dialog" role="dialog" aria-modal="true" aria-labelledby="versions-title" onMouseDown={event => event.stopPropagation()}>
      <button className="modal-close" onClick={close} aria-label={t("close")}>×</button>
      <h2 id="versions-title">{t("versionsTitle")}</h2>
      <p className="muted">{t("versionsHelp")}</p>
      {done && <p className="versions-done" role="status">{t("versionsRestored")}</p>}
      {failed && <p className="versions-failed" role="alert">{t("versionsFailed")}</p>}
      <ul className="versions-list">
        {draft && restoreDraft && <li><div><strong>{t("versionsDraft")}</strong><small>{when(draft.savedAt)}</small></div><button className="primary" onClick={() => { restoreDraft(); setDone(true); }}>{t("versionsRestore")}</button></li>}
        {versions === null && !failed && <li><span className="muted">{t("versionsLoading")}</span></li>}
        {versions?.length === 0 && !draft && <li><span className="muted">{t("versionsEmpty")}</span></li>}
        {versions?.map(version => <li key={version.id}>
          <div><strong>{when(version.saved_at)}</strong><small>#{version.revision}{version.updated_by ? ` · ${t("versionsBy")} ${version.updated_by}` : ""}</small><small>{summary(version.counts)}</small></div>
          <button onClick={() => void take(version)} disabled={busy !== ""}>{t("versionsRestore")}</button>
        </li>)}
      </ul>
    </section>
  </div>;
}
