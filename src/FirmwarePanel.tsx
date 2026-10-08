/**
 * Configuration > Node firmware: update the firmware of the field nodes without opening the page of each one - from a file of this computer or from the newest release
 * on GitHub, to one node or to every node of a type, one after another. The server does the work (see ARMOR-SERVER src/firmware.ts); this screen picks the nodes, takes the
 * login of the nodes' own panel (used for the update only, never kept) and shows how each node goes.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ApiError, firmwareJob, firmwareProbe, firmwareRelease, firmwareStart, firmwareUpload,
  type FirmwareJob, type FirmwareKind, type FirmwareProbe, type FirmwareRelease,
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

const explain = (t: Translate, error: unknown): string => {
  const code = error instanceof ApiError ? error.code : error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "generic";
  const text = t(`fw_err_${code}`);
  return text === `fw_err_${code}` ? t("fw_err_generic") + (code === "generic" ? "" : ` (${code})`) : text;
};

export function FirmwarePanel({ t, origin, isAdmin, network }: Props) {
  const [kind, setKind] = useState<FirmwareKind>("radar");
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [probes, setProbes] = useState<Record<string, FirmwareProbe>>({});
  const [login, setLogin] = useState({ user: "admin", password: "" });
  const [source, setSource] = useState<"github" | "file">("github");
  const [file, setFile] = useState<File | null>(null);
  const [release, setRelease] = useState<FirmwareRelease | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [job, setJob] = useState<FirmwareJob | null>(null);
  const jobId = useRef("");

  const found = useMemo(() => firmwareNodes(network), [network]);
  const candidates = useMemo(() => found.filter(node => !node.kind || node.kind === kind), [found, kind]);
  const running = job !== null && (job.state === "preparing" || job.state === "running");

  useEffect(() => { setPicked(new Set()); setRelease(null); setMessage(""); }, [kind]);

  // While a job runs, ask the server how it stands.
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      firmwareJob(origin, jobId.current).then(next => setJob(next)).catch(error => setMessage(explain(t, error)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, origin]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAdmin) return <article className="stack-card"><h3>{t("fw_title")}</h3><p className="muted">{t("cs_admin_only")}</p></article>;

  const toggle = (ip: string) => setPicked(current => { const next = new Set(current); if (next.has(ip)) next.delete(ip); else next.add(ip); return next; });
  const ask = async () => {
    setBusy(true); setMessage("");
    try { const answer = await firmwareProbe(origin, candidates.map(node => node.ip)); setProbes(Object.fromEntries(answer.nodes.map(node => [node.address, node]))); }
    catch (error) { setMessage(explain(t, error)); } finally { setBusy(false); }
  };
  const lookUp = async () => {
    setBusy(true); setMessage(""); setRelease(null);
    try { setRelease(await firmwareRelease(origin, kind)); } catch (error) { setMessage(explain(t, error)); } finally { setBusy(false); }
  };
  const ready = picked.size > 0 && login.user.trim() !== "" && login.password !== "" && (source === "github" || file !== null) && !running && !busy;
  const begin = async () => {
    setConfirming(false); setBusy(true); setMessage("");
    try {
      const upload = source === "file" && file ? await firmwareUpload(origin, file) : undefined;
      const targets = candidates.filter(node => picked.has(node.ip)).map(node => ({ address: node.ip, ...(node.nodeId ? { node_id: node.nodeId } : {}) }));
      const started = await firmwareStart(origin, { kind, source: source === "file" ? "upload" : "github", ...(upload ? { upload_id: upload.id } : {}), targets, panel_user: login.user.trim(), panel_password: login.password });
      jobId.current = started.id;
      setJob(await firmwareJob(origin, started.id));
    } catch (error) { setMessage(explain(t, error)); } finally { setBusy(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); if (ready) setConfirming(true); };

  return <article className="stack-card camera-form">
    <h3>{t("fw_title")}</h3>
    <p className="muted">{t("fw_help")}</p>
    <form onSubmit={submit}>
      <div className="camera-field"><label><span>{t("fw_kind")}</span>
        <select value={kind} onChange={event => setKind(event.target.value as FirmwareKind)} disabled={running}>
          {FIRMWARE_KINDS.map(item => <option key={item} value={item}>{t(`fw_kind_${item}`)}</option>)}
        </select></label></div>

      <h4>{t("fw_nodes")}</h4>
      {candidates.length === 0 ? <p className="muted small">{t("fw_none")}</p> : <>
        <div className="camera-form-actions">
          <button type="button" onClick={() => void ask()} disabled={busy || running}>{t("fw_ask")}</button>
          <button type="button" onClick={() => setPicked(new Set(candidates.filter(node => node.online).map(node => node.ip)))} disabled={running}>{t("fw_select_kind")}</button>
          <button type="button" onClick={() => setPicked(new Set())} disabled={running || picked.size === 0}>{t("fw_select_none")}</button>
        </div>
        <ul className="node-finder-list">
          {candidates.map(node => {
            const probe = probes[node.ip];
            return <li key={node.ip} className={node.online ? "" : "off"}>
              <input type="checkbox" checked={picked.has(node.ip)} onChange={() => toggle(node.ip)} disabled={running} aria-label={node.nodeId ?? node.hostname ?? node.ip} />
              <div><strong>{probe?.node_id ?? node.nodeId ?? node.hostname ?? node.ip}</strong>
                <small>{[node.ip, probe?.reachable ? `${t("fw_version_now")} ${probe.version ?? "?"}` : probe ? t("fw_unreachable") : "", probe?.board].filter(Boolean).join(" · ")}</small></div>
            </li>;
          })}
        </ul></>}

      <h4>{t("fw_login_title")}</h4>
      <p className="muted small">{t("fw_login_help")}</p>
      <div className="camera-field"><label><span>{t("fw_user")}</span><input value={login.user} autoComplete="off" onChange={event => setLogin({ ...login, user: event.target.value })} /></label></div>
      <div className="camera-field"><label><span>{t("fw_password")}</span><input type="password" value={login.password} autoComplete="new-password" onChange={event => setLogin({ ...login, password: event.target.value })} /></label></div>

      <h4>{t("fw_source")}</h4>
      <div className="camera-field">
        <label><input type="radio" name="fw-source" checked={source === "github"} onChange={() => setSource("github")} disabled={running} /> {t("fw_source_github")}</label>
        <label><input type="radio" name="fw-source" checked={source === "file"} onChange={() => setSource("file")} disabled={running} /> {t("fw_source_file")}</label>
      </div>
      {source === "github" && <div className="camera-form-actions">
        <button type="button" onClick={() => void lookUp()} disabled={busy || running}>{t("fw_check_release")}</button>
        {release && <span className="notice">{t("fw_release")}: <b>{release.version}</b> ({Math.round(release.bytes / 1024)} KB), {t("fw_release_ok")}</span>}
      </div>}
      {source === "file" && <div className="camera-field"><label><span>{t("fw_file")}</span>
        <input type="file" accept=".bin,application/octet-stream" disabled={running} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label></div>}

      <div className="camera-form-actions">
        <button className="primary" type="submit" disabled={!ready}>{t("fw_start")}{picked.size > 0 ? ` (${picked.size})` : ""}</button>
      </div>
    </form>
    {message && <p className="notice bad" role="status">{message}</p>}

    {job && <section aria-label={t("fw_job")}>
      <h4>{t("fw_job")}</h4>
      <p className={job.state === "failed" ? "notice bad" : "notice"}>
        {job.state === "preparing" ? t("fw_job_preparing") : job.state === "running" ? t("fw_job_running") : job.state === "done" ? t("fw_job_done") : job.error && job.error !== "some_nodes_failed" ? explain(t, new ApiError(0, job.error)) : t("fw_job_failed")}
        {job.version && <> · {job.version}</>}
      </p>
      <ul className="node-finder-list">
        {job.targets.map(target => <li key={target.address} className={target.state === "failed" ? "off" : ""}>
          <span className="state-dot" />
          <div><strong>{target.node_id ?? target.address}</strong>
            <small>{[target.address, t(`fw_state_${target.state}`), target.version_before || target.version_after ? `${target.version_before ?? "?"} → ${target.version_after ?? "?"}` : "", target.error ? explain(t, new ApiError(0, target.error)) : ""].filter(Boolean).join(" · ")}</small></div>
        </li>)}
      </ul>
    </section>}

    {confirming && <ConfirmDialog t={t} title={t("fw_confirm_title")} text={`${t("fw_confirm_text")} (${picked.size})`} confirmLabel={t("fw_confirm_go")} danger confirm={() => void begin()} cancel={() => setConfirming(false)} />}
  </article>;
}
