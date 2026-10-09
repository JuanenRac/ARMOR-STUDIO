/**
 * Configuration > Node firmware: update the firmware of the field nodes without opening the page of each one - from a file of this computer or from the newest release
 * on GitHub, to one node or to every node of a type, one after another. The server does the work (see ARMOR-SERVER src/firmware.ts); this screen picks the nodes, takes the
 * login of the nodes' own panel (used for the update only, never kept) and shows, for the whole job and for every node, a bar and what is happening at that moment.
 * Laid out in two columns: the nodes on the left; the firmware, the access and the start on the right; the progress under both.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ApiError, firmwareJob, firmwareProbe, firmwareRelease, firmwareStart, firmwareUpload,
  type FirmwareJob, type FirmwareKind, type FirmwareProbe, type FirmwareRelease, type FirmwareTarget,
} from "./api";
import { ConfirmDialog } from "./components/chrome";
import type { NetworkOverview } from "./networkModel";

type Translate = (key: string) => string;
type Props = { t: Translate; origin: string; isAdmin: boolean; network: NetworkOverview | null };

export const FIRMWARE_KINDS: readonly FirmwareKind[] = ["radar", "solar", "electrical", "hmi"];
export type FoundNode = { ip: string; nodeId?: string; hostname?: string; online: boolean; kind?: FirmwareKind };

const HOST_PREFIX = "armor-";

/** The kind a device's web panel says it is, from the title banner the network node reads when it probes port 80 or 443. */
function kindOf(device: { ports?: readonly { banner?: string }[] }): FirmwareKind | undefined {
  const banners = (device.ports ?? []).map(port => port.banner ?? "").join(" ").toLowerCase();
  for (const kind of FIRMWARE_KINDS) if (banners.includes(kind)) return kind;
  return undefined;
}

/** Every device of the network that looks like an A.R.M.O.R. node (its host name starts with "armor-", or its maker is Espressif), the ones already in the system included. */
export function firmwareNodes(network: NetworkOverview | null): FoundNode[] {
  const seen = new Set<string>(), found: FoundNode[] = [];
  for (const node of network?.nodes ?? []) {
    for (const device of node.devices) {
      const hostname = device.hostname?.toLowerCase().replace(/\.local\.?$/, "");
      const named = Boolean(hostname?.startsWith(HOST_PREFIX)), espressif = /espressif/i.test(device.vendor ?? "");
      if ((!named && !espressif) || seen.has(device.ip)) continue;
      seen.add(device.ip);
      const kind = kindOf(device);
      found.push({ ip: device.ip, online: device.online, hostname: device.hostname, ...(named && hostname ? { nodeId: hostname.slice(HOST_PREFIX.length) } : {}), ...(kind ? { kind } : {}) });
    }
  }
  return found.sort((a, b) => Number(b.online) - Number(a.online) || a.ip.localeCompare(b.ip, undefined, { numeric: true }));
}

/** A phrase with {0}, {1}... filled in. */
export const fill = (text: string, ...values: Array<string | number>): string => text.replace(/\{(\d+)\}/g, (_match, index: string) => String(values[Number(index)] ?? ""));

const explain = (t: Translate, error: unknown): string => {
  const code = error instanceof ApiError ? error.code : error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "generic";
  const text = t(`fw_err_${code}`);
  return text === `fw_err_${code}` ? t("fw_err_generic") + (code === "generic" ? "" : ` (${code})`) : text;
};

/** What a node is doing right now, in words (the step, with the numbers that make it concrete). */
export function describeStep(t: Translate, target: FirmwareTarget, expected?: string): string {
  switch (target.state) {
    case "uploading": {
      const total = target.total ?? 0, sent = Math.min(target.sent ?? 0, total);
      return fill(t("fw_step_uploading"), Math.round(sent / 1024), Math.round(total / 1024), total ? Math.round(sent * 100 / total) : 0);
    }
    case "restarting": return fill(t("fw_step_restarting"), expected ?? "?", target.waited_s ?? 0);
    case "done": return fill(t("fw_step_done"), target.version_after ?? "?");
    case "failed": return `${t("fw_step_failed")} ${target.error ? explain(t, new ApiError(0, target.error)) : t("fw_err_generic")}`;
    default: return t(`fw_step_${target.state}`);
  }
}

function Bar({ percent, state }: { percent: number; state?: "done" | "failed" | "working" }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return <div className={`fw-bar ${state ?? "working"}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><i style={{ width: `${value}%` }} /></div>;
}

export function FirmwarePanel({ t, origin, isAdmin, network }: Props) {
  const [kind, setKind] = useState<FirmwareKind>("radar");
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [probes, setProbes] = useState<Record<string, FirmwareProbe>>({});
  const [login, setLogin] = useState({ user: "admin", password: "" });
  const [source, setSource] = useState<"github" | "file">("github");
  const [file, setFile] = useState<File | null>(null);
  const [release, setRelease] = useState<FirmwareRelease | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"" | "probe" | "release" | "file">("");
  const [confirming, setConfirming] = useState(false);
  const [job, setJob] = useState<FirmwareJob | null>(null);
  const jobId = useRef("");

  const found = useMemo(() => firmwareNodes(network), [network]);
  const candidates = useMemo(() => found.filter(node => !node.kind || node.kind === kind), [found, kind]);
  const running = job !== null && (job.state === "preparing" || job.state === "running");

  useEffect(() => { setPicked(new Set()); setRelease(null); setMessage(""); }, [kind]);

  // While a job runs, ask the server how it stands, twice a second.
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      firmwareJob(origin, jobId.current).then(next => setJob(next)).catch(error => setMessage(explain(t, error)));
    }, 500);
    return () => window.clearInterval(timer);
  }, [running, origin]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAdmin) return <article className="stack-card"><h3>{t("fw_title")}</h3><p className="muted">{t("cs_admin_only")}</p></article>;

  const toggle = (ip: string) => setPicked(current => { const next = new Set(current); if (next.has(ip)) next.delete(ip); else next.add(ip); return next; });
  const ask = async () => {
    setBusy("probe"); setMessage("");
    try { const answer = await firmwareProbe(origin, candidates.map(node => node.ip)); setProbes(Object.fromEntries(answer.nodes.map(node => [node.address, node]))); }
    catch (error) { setMessage(explain(t, error)); } finally { setBusy(""); }
  };
  const lookUp = async () => {
    setBusy("release"); setMessage(""); setRelease(null);
    try { setRelease(await firmwareRelease(origin, kind)); } catch (error) { setMessage(explain(t, error)); } finally { setBusy(""); }
  };
  const ready = picked.size > 0 && login.user.trim() !== "" && login.password !== "" && (source === "github" || file !== null) && !running && busy === "";
  const begin = async () => {
    setConfirming(false); setMessage("");
    try {
      let upload;
      if (source === "file" && file) { setBusy("file"); upload = await firmwareUpload(origin, file); }
      const targets = candidates.filter(node => picked.has(node.ip)).map(node => ({ address: node.ip, ...(node.nodeId ? { node_id: node.nodeId } : {}) }));
      const started = await firmwareStart(origin, { kind, source: source === "file" ? "upload" : "github", ...(upload ? { upload_id: upload.id } : {}), targets, panel_user: login.user.trim(), panel_password: login.password });
      jobId.current = started.id;
      setJob(await firmwareJob(origin, started.id));
    } catch (error) { setMessage(explain(t, error)); } finally { setBusy(""); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); if (ready) setConfirming(true); };

  const done = job?.targets.filter(target => target.state === "done").length ?? 0;
  const overall = job && job.targets.length > 0 ? job.targets.reduce((sum, target) => sum + (target.state === "done" ? 100 : target.progress ?? 0), 0) / job.targets.length : 0;
  const preparing = job?.state === "preparing";

  return <div className="fw-page">
    <article className="stack-card fw-head"><h3>{t("fw_title")}</h3><p className="muted">{t("fw_help")}</p></article>

    <form className="fw-grid" onSubmit={submit}>
      <div className="fw-col">
        <article className="stack-card camera-form fw-card" aria-label={t("fw_sec_nodes")}>
          <h3>{t("fw_sec_nodes")}</h3>
          <div className="camera-field"><label><span>{t("fw_kind")}</span>
            <select value={kind} onChange={event => setKind(event.target.value as FirmwareKind)} disabled={running}>
              {FIRMWARE_KINDS.map(item => <option key={item} value={item}>{t(`fw_kind_${item}`)}</option>)}
            </select></label></div>
          {candidates.length === 0 ? <p className="muted small">{t("fw_none")}</p> : <>
            <div className="camera-form-actions">
              <button type="button" onClick={() => void ask()} disabled={busy !== "" || running}>{busy === "probe" ? "…" : t("fw_ask")}</button>
              <button type="button" onClick={() => setPicked(new Set(candidates.filter(node => node.online).map(node => node.ip)))} disabled={running}>{t("fw_select_kind")}</button>
              <button type="button" onClick={() => setPicked(new Set())} disabled={running || picked.size === 0}>{t("fw_select_none")}</button>
            </div>
            <ul className="node-finder-list fw-nodes">
              {candidates.map(node => {
                const probe = probes[node.ip];
                return <li key={node.ip} className={node.online ? "" : "off"}>
                  <input type="checkbox" checked={picked.has(node.ip)} onChange={() => toggle(node.ip)} disabled={running} aria-label={node.nodeId ?? node.hostname ?? node.ip} />
                  <div><strong>{probe?.node_id ?? node.nodeId ?? node.hostname ?? node.ip}</strong>
                    <small>{[node.ip, probe?.reachable ? `${t("fw_version_now")} ${probe.version ?? "?"}` : probe ? t("fw_unreachable") : "", probe?.board].filter(Boolean).join(" · ")}</small></div>
                </li>;
              })}
            </ul></>}
        </article>
      </div>

      <div className="fw-col">
        <article className="stack-card camera-form fw-card" aria-label={t("fw_sec_source")}>
          <h3>{t("fw_sec_source")}</h3>
          <div className="camera-field fw-choice">
            <label><input type="radio" name="fw-source" checked={source === "github"} onChange={() => setSource("github")} disabled={running} /> {t("fw_source_github")}</label>
            <label><input type="radio" name="fw-source" checked={source === "file"} onChange={() => setSource("file")} disabled={running} /> {t("fw_source_file")}</label>
          </div>
          {source === "github" && <div className="camera-form-actions">
            <button type="button" onClick={() => void lookUp()} disabled={busy !== "" || running}>{busy === "release" ? "…" : t("fw_check_release")}</button>
            {release && <span className="notice">{t("fw_release")}: <b>{release.version}</b> ({Math.round(release.bytes / 1024)} KB), {t("fw_release_ok")}</span>}
          </div>}
          {source === "file" && <div className="camera-field"><label><span>{t("fw_file")}</span>
            <input type="file" accept=".bin,application/octet-stream" disabled={running} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label></div>}
        </article>

        <article className="stack-card camera-form fw-card" aria-label={t("fw_sec_login")}>
          <h3>{t("fw_sec_login")}</h3>
          <p className="muted small">{t("fw_login_help")}</p>
          <div className="camera-field"><label><span>{t("fw_user")}</span><input value={login.user} autoComplete="off" onChange={event => setLogin({ ...login, user: event.target.value })} /></label></div>
          <div className="camera-field"><label><span>{t("fw_password")}</span><input type="password" value={login.password} autoComplete="new-password" onChange={event => setLogin({ ...login, password: event.target.value })} /></label></div>
        </article>

        <article className="stack-card camera-form fw-card" aria-label={t("fw_sec_go")}>
          <h3>{t("fw_sec_go")}</h3>
          <h4 className="fw-flow-title">{t("fw_flow_title")}</h4>
          <ol className="fw-flow">{[1, 2, 3, 4, 5].map(step => <li key={step}>{t(`fw_flow_${step}`)}</li>)}</ol>
          <div className="camera-form-actions">
            <button className="primary" type="submit" disabled={!ready}>{busy === "file" ? t("fw_uploading_file") : `${t("fw_start")}${picked.size > 0 ? ` (${picked.size})` : ""}`}</button>
          </div>
          {message && <p className="notice bad" role="status">{message}</p>}
        </article>
      </div>
    </form>

    {job && <article className="stack-card fw-card fw-progress" aria-label={t("fw_job")}>
      <h3>{t("fw_job")}</h3>
      <p className={job.state === "failed" ? "notice bad" : "notice"} role="status">
        {preparing ? t(job.source === "github" ? "fw_job_preparing_github" : "fw_job_preparing_file")
          : job.state === "running" ? t("fw_job_running") : job.state === "done" ? t("fw_job_done")
            : job.error && job.error !== "some_nodes_failed" ? explain(t, new ApiError(0, job.error)) : t("fw_job_failed")}
        {job.version && <> · <b>{job.version}</b></>}
      </p>
      <div className="fw-overall"><span>{t("fw_overall")}: {done} {t("fw_of")} {job.targets.length} {t("fw_overall_count")}</span><b>{Math.round(overall)}%</b></div>
      <Bar percent={job.state === "done" ? 100 : overall} state={job.state === "done" ? "done" : job.state === "failed" ? "failed" : "working"} />
      <div className="fw-targets">
        {job.targets.map(target => <section key={target.address} className={`fw-target ${target.state}`}>
          <header><strong>{target.node_id ?? target.address}</strong><small>{[target.address, target.version_before || target.version_after ? `${target.version_before ?? "?"} → ${target.version_after ?? "?"}` : ""].filter(Boolean).join(" · ")}</small><span className="fw-badge">{t(`fw_state_${target.state}`)}</span></header>
          <Bar percent={target.state === "done" ? 100 : target.progress ?? 0} state={target.state === "done" ? "done" : target.state === "failed" ? "failed" : "working"} />
          <p className={target.state === "failed" ? "err" : "muted small"}>{describeStep(t, target, job.version)}</p>
        </section>)}
      </div>
    </article>}

    {confirming && <ConfirmDialog t={t} title={t("fw_confirm_title")} text={`${t("fw_confirm_text")} (${picked.size})`} confirmLabel={t("fw_confirm_go")} danger confirm={() => void begin()} cancel={() => setConfirming(false)} />}
  </div>;
}
