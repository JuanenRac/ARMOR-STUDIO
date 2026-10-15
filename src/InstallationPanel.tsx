/**
 * Configuration > Installation: the whole installation as one file, to keep or to move to another machine (see ARMOR-SERVER's installation.ts). An administrator downloads the file
 * (it holds no password, token or key), or chooses one, ticks the parts to import and reads what was done: what was applied, what was left alone and what did not check out.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useRef, useState } from "react";
import { ApiError, installationExport, installationImport, type InstallationReport } from "./api";

type Translate = (key: string, ...args: Array<string | number>) => string;
type Props = { t: Translate; origin: string; isAdmin: boolean };

export const INSTALLATION_PARTS = ["cameras", "site", "electrical", "network", "alarm_design", "rules", "automations", "devices", "solar_devices", "energy_alarms", "users"] as const;
export type InstallationPart = (typeof INSTALLATION_PARTS)[number];

/** What a file holds, by part: how many items a list has, or 1 for a document. Parts it does not hold are not listed. */
export function partsOf(bundle: unknown): Array<{ part: InstallationPart; count: number }> {
  if (typeof bundle !== "object" || bundle === null) return [];
  const parts = (bundle as { format?: unknown; parts?: unknown }).format === "armor-installation" ? (bundle as { parts?: unknown }).parts : null;
  if (typeof parts !== "object" || parts === null || Array.isArray(parts)) return [];
  const out: Array<{ part: InstallationPart; count: number }> = [];
  for (const part of INSTALLATION_PARTS) {
    const value = (parts as Record<string, unknown>)[part];
    if (value === undefined || value === null) continue;
    out.push({ part, count: Array.isArray(value) ? value.length : 1 });
  }
  return out;
}

const explain = (t: Translate, error: unknown): string => {
  const code = error instanceof ApiError ? error.code : "generic";
  const text = t(`in_err_${code}`);
  return text === `in_err_${code}` ? t("in_err_generic") : text;
};

export function ReportView({ t, report }: { t: Translate; report: InstallationReport }) {
  const group = (title: string, items: Partial<Record<string, string>>) => {
    const entries = Object.entries(items);
    return entries.length === 0 ? null : <div><h4>{title}</h4><ul>{entries.map(([part, text]) => <li key={part}><strong>{t(`in_part_${part}`)}</strong>: {text}</li>)}</ul></div>;
  };
  return <div className="in-report">
    {group(t("in_applied"), report.applied)}
    {group(t("in_failed"), report.failed)}
    {group(t("in_skipped"), report.skipped)}
    {report.cameras_need_credentials.length > 0 && <p className="muted">{t("in_cameras_need")} <span className="mono">{report.cameras_need_credentials.join(", ")}</span></p>}
  </div>;
}

export function InstallationPanel({ t, origin, isAdmin }: Props) {
  const [bundle, setBundle] = useState<unknown>(null);
  const [ticked, setTicked] = useState<Set<InstallationPart>>(new Set());
  const [report, setReport] = useState<InstallationReport | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  if (!isAdmin) return <article className="stack-card"><h3>{t("in_title")}</h3><p className="muted">{t("cs_admin_only")}</p></article>;

  const download = async () => {
    setBusy(true); setMessage(""); setReport(null);
    try {
      const file = await installationExport(origin);
      const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `armor-installation-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage(t("in_exported"));
    } catch (error) { setMessage(explain(t, error)); } finally { setBusy(false); }
  };
  const choose = async (file: File | undefined) => {
    setReport(null); setMessage("");
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const parts = partsOf(parsed);
      if (parts.length === 0) { setBundle(null); setTicked(new Set()); setMessage(t("in_not_bundle")); return; }
      setBundle(parsed);
      setTicked(new Set(parts.filter(item => item.part !== "users").map(item => item.part)));   // everything but the users, which are never imported
    } catch { setBundle(null); setTicked(new Set()); setMessage(t("in_not_bundle")); }
  };
  const run = async () => {
    if (ticked.size === 0) { setMessage(t("in_nothing_ticked")); return; }
    setBusy(true); setMessage(""); setReport(null);
    try { setReport(await installationImport(origin, bundle, [...ticked])); } catch (error) { setMessage(explain(t, error)); } finally { setBusy(false); }
  };
  const available = partsOf(bundle);

  return <div className="fw-page">
    <article className="stack-card fw-head"><h3>{t("in_title")}</h3><p className="muted">{t("in_help")}</p></article>
    <div className="fw-grid">
      <article className="stack-card">
        <h3>{t("in_export")}</h3>
        <button disabled={busy} onClick={() => void download()}>{t("in_export")}</button>
      </article>
      <article className="stack-card">
        <h3>{t("in_import")}</h3>
        <p className="muted">{t("in_import_help")}</p>
        <input ref={input} type="file" accept="application/json,.json" aria-label={t("in_choose")} onChange={event => void choose(event.target.files?.[0])} />
        {available.length > 0 && <>
          <ul className="in-parts">{available.map(({ part, count }) => <li key={part}>
            <label><input type="checkbox" disabled={part === "users"} checked={ticked.has(part)} onChange={event => setTicked(current => { const next = new Set(current); if (event.target.checked) next.add(part); else next.delete(part); return next; })} /> {t(`in_part_${part}`)} <small className="muted">{t("in_count", count)}</small></label>
          </li>)}</ul>
          <button disabled={busy} onClick={() => void run()}>{t("in_run")}</button>
        </>}
        {message && <p className="muted" role="status">{message}</p>}
        {report && <><h4>{t("in_result")}</h4><ReportView t={t} report={report} /></>}
      </article>
    </div>
  </div>;
}
