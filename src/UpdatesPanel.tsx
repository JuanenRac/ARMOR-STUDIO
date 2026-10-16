/**
 * Configuration > Updates: what is installed on this machine against the newest release of each A.R.M.O.R. program on GitHub (the server, Studio, the network watcher, the
 * observation service, the voice gateway and the helper scripts), update one, some or all of them, put the previous version back, and keep the operating system up to date
 * (look for its updates, update it, reboot). Whatever is running shows its steps with a bar each, a total bar and the log line by line, as the maintenance helper does it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { parseReleaseNotes } from "./releaseNotes";
import { useCallback, useEffect, useRef, useState } from "react";
import { askConfirm } from "./askConfirm";
import {
  ApiError, clearUpdateHistory, type UpgradeMode, maintenanceStatus, readMaintJob, readUpdates, rollbackUpdate, startUpdates, systemAction,
  type MaintComponent, type MaintJob, type MaintOverview,
} from "./api";
import { CopyButton } from "./components/CopyButton";
import "./maintenance.css";

type Translate = (key: string) => string;
type Props = { t: Translate; origin: string; isAdmin: boolean };

const POLL_MS = 700;
const JOB_KEY = "armor-studio-update-job";
/** The job the person was following: kept so that going to another menu and coming back finds the same steps and the same log (the work itself runs in the maintenance helper). */
const storedJob = (): string => { try { return window.localStorage.getItem(JOB_KEY) ?? ""; } catch { return ""; } };
const keepJob = (id: string): void => { try { if (id) window.localStorage.setItem(JOB_KEY, id); else window.localStorage.removeItem(JOB_KEY); } catch { /* storage may be blocked */ } };

export const explainMaintenance = (t: Translate, error: unknown): string => {
  const code = error instanceof ApiError ? error.code : typeof error === "string" ? error : "generic";
  const text = t(`mt_err_${code}`);
  return text === `mt_err_${code}` ? t("mt_err_generic") : text;
};

/** How long a machine has been on, in the words of a person: "3 d 4 h", "5 h 12 min", "8 min". */
export function uptimeText(seconds: number): string {
  const days = Math.floor(seconds / 86400), hours = Math.floor((seconds % 86400) / 3600), minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

/** The label of a step of a job, in the console's words: "server.download" is "Server: download". */
export function stepLabel(t: Translate, id: string): string {
  const [component, step] = id.split(".");
  if (step === undefined) { const own = t(`mt_step_${id}`); return own === `mt_step_${id}` ? id : own; }   // the steps of the system jobs have no program in front
  const stepText = t(`mt_step_${step ?? ""}`);
  const named = component && t(`mt_c_${component}`) !== `mt_c_${component}` ? t(`mt_c_${component}`) : component;
  return step ? `${named}: ${stepText === `mt_step_${step}` ? step : stepText}` : id;
}

function Bar({ percent, state }: { percent: number; state?: string }) {
  return <div className={`mt-bar ${state ?? ""}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}><i style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></div>;
}

export function UpdatesPanel({ t, origin, isAdmin }: Props) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [hint, setHint] = useState("");
  const [overview, setOverview] = useState<MaintOverview | null>(null);
  const [checking, setChecking] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [job, setJob] = useState<MaintJob | null>(null);
  const [message, setMessage] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [notesOpen, setNotesOpen] = useState<ReadonlySet<string>>(new Set());   // the programs whose release notes are shown
  const logEnd = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const logLines = useRef<string[]>([]);
  const running = job !== null && job.state === "running";

  const load = useCallback(async (force: boolean) => {
    setChecking(true);
    try { setOverview(await readUpdates(origin, force)); setMessage(""); }
    catch (error) { setMessage(explainMaintenance(t, error)); }
    finally { setChecking(false); }
  }, [origin]);   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    void maintenanceStatus(origin).then(status => {
      if (cancelled) return;
      setAvailable(status.available);
      setHint(status.hint ?? "");
      if (status.available) void load(false);
    }).catch(() => { if (!cancelled) setAvailable(false); });
    return () => { cancelled = true; };
  }, [origin, isAdmin, load]);

  // While a job runs, ask how it stands; the server or Studio may restart in the middle of it, and then the answers fail for a moment: it keeps asking.
  useEffect(() => {
    if (!job || job.state !== "running") return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      readMaintJob(origin, job.id, logLines.current.length).then(next => {
        if (cancelled) return;
        setWaiting(false);
        logLines.current = [...logLines.current, ...next.log];
        setJob({ ...next, log: logLines.current });
        if (next.state !== "running") void load(false);
      }).catch(() => { if (!cancelled) setWaiting(true); });
    }, POLL_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [job?.id, job?.state, origin, load]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Back in this menu: the job that is running (or the last one the person was following) comes back with its steps and its whole log.
  useEffect(() => {
    if (!overview || restored.current || job !== null) return;
    restored.current = true;
    const id = overview.running[0] ?? storedJob();
    if (!id) return;
    readMaintJob(origin, id, 0).then(found => { logLines.current = found.log; setJob({ ...found, log: logLines.current }); }).catch(() => keepJob(""));
  }, [overview, job, origin]);

  useEffect(() => { logEnd.current?.scrollIntoView?.({ block: "nearest" }); }, [job?.log.length]);

  if (!isAdmin) return <article className="stack-card"><h3>{t("mt_title")}</h3><p className="muted">{t("cs_admin_only")}</p></article>;
  if (available === false) return <article className="stack-card"><h3>{t("mt_title")}</h3><p className="notice">{t("mt_unavailable")}</p><p className="muted">{hint || t("mt_hint")}</p></article>;

  const begin = (next: MaintJob) => { logLines.current = next.log ?? []; setJob({ ...next, log: logLines.current }); setWaiting(false); keepJob(next.id); };
  const dismiss = () => { keepJob(""); logLines.current = []; setJob(null); };
  const label = (id: string) => (t(`mt_c_${id}`) === `mt_c_${id}` ? id : t(`mt_c_${id}`));
  const updatable = (overview?.components ?? []).filter(item => item.status === "update_available" && item.installable);

  const update = async (ids: string[], force = false) => {
    if (ids.length === 0 || running) return;
    if (!(await askConfirm(`${t("mt_confirm_update")} ${ids.map(label).join(", ")}`, t))) return;
    try { begin(await startUpdates(origin, ids, force)); setPicked(new Set()); setMessage(""); }
    catch (error) { setMessage(explainMaintenance(t, error)); }
  };
  const rollback = async (item: MaintComponent) => {
    if (running || !(await askConfirm(`${t("mt_confirm_rollback")} ${label(item.id)}`, t))) return;
    try { begin(await rollbackUpdate(origin, item.id)); setMessage(""); }
    catch (error) { setMessage(explainMaintenance(t, error)); }
  };
  const system = async (action: "check" | "upgrade" | "reboot", mode: UpgradeMode = "upgrade") => {
    if (running) return;
    if (action === "upgrade" && !(await askConfirm(t(mode === "full" ? "mt_confirm_full" : mode === "repair" ? "mt_confirm_repair" : "mt_confirm_system"), t))) return;
    if (action === "reboot" && !(await askConfirm(t("mt_confirm_reboot"), t))) return;
    try {
      const next = await systemAction(origin, action, mode);
      if (action === "reboot") { setMessage(t("mt_rebooting")); return; }
      begin(next); setMessage("");
    } catch (error) { setMessage(explainMaintenance(t, error)); }
  };
  const emptyHistory = async () => {
    if (!(await askConfirm(t("mt_confirm_clear_history"), t))) return;
    try { await clearUpdateHistory(origin); await load(false); }
    catch (error) { setMessage(explainMaintenance(t, error)); }
  };
  const toggle = (id: string) => setPicked(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const studioUpdated = Boolean(job && job.state === "done" && job.label.split(", ").includes("studio"));
  const statusText = (item: MaintComponent) => (item.error ? t(`mt_e_${item.error}`) === `mt_e_${item.error}` ? t("mt_s_unknown") : t(`mt_e_${item.error}`) : t(`mt_s_${item.status}`));
  const os = overview?.os;

  return <div className="mt-panel">
    <article className="stack-card">
      <div className="mt-head">
        <div><h3>{t("mt_title")}</h3><p className="muted">{t("mt_help")}</p></div>
        <button onClick={() => void load(true)} disabled={checking || running}>{checking ? t("mt_checking") : t("mt_check")}</button>
      </div>
      {message && <p className="notice" role="alert">{message}</p>}
      <table className="mt-table">
        <thead><tr><th /><th>{t("mt_col_program")}</th><th>{t("mt_col_installed")}</th><th>{t("mt_col_latest")}</th><th>{t("mt_col_state")}</th><th /></tr></thead>
        <tbody>{(overview?.components ?? []).flatMap(item => [<tr key={item.id} className={item.status}>
          <td><input type="checkbox" aria-label={label(item.id)} checked={picked.has(item.id)} disabled={running || !(item.installable && item.status !== "unknown")} onChange={() => toggle(item.id)} /></td>
          <td><strong>{label(item.id)}</strong><small>{item.repo} · {item.service}</small></td>
          <td className="mt-version">{item.installed || "—"}</td>
          <td className="mt-version">{item.latest || "—"}</td>
          <td><span className={`mt-badge ${item.status}`}>{statusText(item)}</span>{item.latest && !item.installable && item.status !== "unknown" && <small className="muted">{t("mt_no_package")}</small>}</td>
          <td className="mt-actions">
            <button disabled={running || !item.installable || item.status === "unknown"} onClick={() => void update([item.id], item.status !== "update_available")}>{item.status === "update_available" || item.status === "not_installed" ? t("mt_update") : t("mt_reinstall")}</button>
            <button disabled={running || !item.installed} onClick={() => void rollback(item)}>{t("mt_rollback")}</button>
            {item.latest && <button className={notesOpen.has(item.id) ? "active" : ""} aria-expanded={notesOpen.has(item.id)} onClick={() => setNotesOpen(current => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}>{notesOpen.has(item.id) ? t("mt_changes_hide") : t("mt_changes")}</button>}
          </td>
        </tr>, ...(notesOpen.has(item.id) && item.latest ? [<tr key={`${item.id}-notes`} className="mt-notes-row"><td /><td colSpan={5}>
          <div className="mt-notes" role="region" aria-label={`${t("mt_changes_in")} ${item.latest}`}>
            <strong>{t("mt_changes_in")} {item.latest}</strong>
            {parseReleaseNotes(item.notes).length === 0 ? <p className="muted">{t("mt_changes_none")}</p> : <ul>{parseReleaseNotes(item.notes).map((line, position) => line.kind === "item" ? <li key={position}>{line.text}</li> : <li key={position} className="mt-notes-text">{line.text}</li>)}</ul>}
          </div></td></tr>] : [])])}</tbody>
      </table>
      <div className="mt-buttons">
        <button onClick={() => setPicked(new Set(updatable.map(item => item.id)))} disabled={running || updatable.length === 0}>{t("mt_select_updatable")}</button>
        <button onClick={() => void update([...picked])} disabled={running || picked.size === 0}>{t("mt_update_selected")}</button>
        <button className="primary" onClick={() => void update(updatable.map(item => item.id))} disabled={running || updatable.length === 0}>{t("mt_update_all")}</button>
      </div>
    </article>

    <article className="stack-card">
      <h3>{t("mt_os_title")}</h3>
      {os && <>
        <p className="muted">{os.name}</p>
        <dl className="mt-facts"><dt>{t("mt_os_kernel")}</dt><dd>{os.kernel || "—"}</dd><dt>{t("mt_os_uptime")}</dt><dd>{uptimeText(os.uptime_s)}</dd></dl>
        <p>{os.packages.length > 0 ? <><strong>{os.packages.length}</strong> {t("mt_os_packages")}</> : t("mt_os_none")}</p>
        {os.packages.length > 0 && <details className="mt-packages"><summary>{t("mt_os_packages")}</summary><ul>{os.packages.map(item => <li key={item.name}><code>{item.name}</code> {item.from} → {item.to}</li>)}</ul></details>}
        {(os.broken?.length ?? 0) > 0 && <p className="notice danger" role="alert">{t("mt_os_broken")} <code>{os.broken!.join(", ")}</code></p>}
        {(os.kept_back?.length ?? 0) > 0 && <p className="notice">{t("mt_os_kept_back")} <code>{os.kept_back!.join(", ")}</code></p>}
        {os.reboot_required && <p className="notice">{t("mt_os_reboot_needed")}</p>}
      </>}
      <div className="mt-buttons">
        <button onClick={() => void system("check")} disabled={running}>{t("mt_os_check")}</button>
        <button className="primary" onClick={() => void system("upgrade")} disabled={running || ((os?.packages.length ?? 0) === 0 && (os?.kept_back?.length ?? 0) === 0)}>{t("mt_os_upgrade")}</button>
        <button onClick={() => void system("upgrade", "full")} disabled={running} title={t("mt_os_full_hint")}>{t("mt_os_full")}</button>
        <button className={(os?.broken?.length ?? 0) > 0 ? "primary" : ""} onClick={() => void system("upgrade", "repair")} disabled={running} title={t("mt_os_repair_hint")}>{t("mt_os_repair")}</button>
        <button className={os?.reboot_required ? "danger" : ""} onClick={() => void system("reboot")} disabled={running}>{t("mt_os_reboot")}</button>
      </div>
    </article>

    {job && <article className="stack-card mt-job">
      <div className="mt-head"><h3>{t("mt_job_title")}</h3><span><span className={`mt-badge job-${job.state}`}>{t(`mt_job_${job.state}`)}</span>{job.state !== "running" && <button className="mt-dismiss" onClick={dismiss} aria-label={t("close")} title={t("close")}>×</button>}</span></div>
      <Bar percent={job.percent} state={job.state} />
      <ul className="mt-steps">{job.steps.map(step => <li key={step.id} className={step.state}>
        <span>{stepLabel(t, step.id)}</span><Bar percent={step.state === "done" || step.state === "skipped" ? 100 : step.percent} state={step.state} />
      </li>)}</ul>
      {waiting && <p className="muted">{t("mt_job_running")}</p>}
      {job.state === "failed" && <p className="notice" role="alert">{explainMaintenance(t, job.error.split(": ").pop() ?? "generic")}</p>}
      {studioUpdated && <button className="primary" onClick={() => window.location.reload()}>{t("mt_reload")}</button>}
      <div className="log-head"><h4>{t("mt_log")}</h4><CopyButton t={t} text={() => job.log.join("\n")} /></div>
      <pre className="mt-log" aria-live="polite">{job.log.join("\n")}<div ref={logEnd} /></pre>
    </article>}

    {overview && overview.history.length > 0 && <article className="stack-card">
      <div className="log-head"><h3>{t("mt_history")} <small className="muted">({overview.history.length})</small></h3>
        <button className="danger" onClick={() => void emptyHistory()} disabled={running}>{t("mt_history_clear")}</button></div>
      <ul className="mt-history">{overview.history.map(entry => <li key={entry.id} className={entry.state}>
        <span>{new Date(entry.started * 1000).toLocaleString()}</span><strong>{entry.kind}</strong><span>{entry.label}</span><span className={`mt-badge job-${entry.state}`}>{t(`mt_job_${entry.state}`)}</span>
      </li>)}</ul>
    </article>}
  </div>;
}
