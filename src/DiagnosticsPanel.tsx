/**
 * Configuration > Diagnostics (administrators only): ask a node for its diagnostic package or its log and read what it handed over, and give somebody else temporary read-only access to
 * look at some nodes. Studio only issues, lists and revokes the tokens; it never uses one, and the secret of a token is shown once, in this screen, and is gone when the screen is closed
 * (it is not kept in the browser's storage). A token reads the health, the package and the log of the nodes it covers and can never give an order.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ApiError, controlNode, downloadDiagnosticLog, downloadDiagnosticPackage, issueDiagnosticToken, listDiagnosticTokens, readNodeControlOperation, readNodeDiagnostics, readNodeHealth, revokeDiagnosticToken,
  type DeliveredDiagnostics, type DiagnosticDetail, type DiagnosticTokenCreated, type DiagnosticTokenInfo, type NodeDiagnostics,
} from "./api";
import { askConfirm } from "./askConfirm";
import type { Translate } from "./components/camera";
import { ASK_GAP_MS, askWait, buildTokenRequest, configEntries, DEFAULT_TTL_S, diagnosticsErrorKey, leastStack, MAX_TOKEN_NODES, sortTokens, tokenState, ttlKey, TTL_CHOICES } from "./diagnosticsModel";
import { downloadText } from "./download";
import { usePolled } from "./hooks";
import { bootLines, fillAll, formatBytes, formatUptime, resetText } from "./nodeHealthModel";
import { isFailed, operationFinished, refusalKey } from "./nodeControlModel";
import "./diagnostics.css";

type Props = { t: Translate; origin: string; isAdmin: boolean };

const when = (iso: string | undefined): string => (iso && Number.isFinite(Date.parse(iso)) ? new Date(iso).toLocaleString() : "–");

// ---- what a token can and cannot do ------------------------------------------------------------------------------------------------------------

/** The explanation that sits on the screen: what a token reads, what it can never do and how it ends. */
export function TokenRules({ t }: { t: Translate }) {
  return <article className="stack-card dg-rules" data-testid="dg-rules" data-tour="dg-rules">
    <h3>{t("dg_rules_title")}</h3>
    <ul>
      <li className="can">{t("dg_can_1")}</li>
      <li className="cannot">{t("dg_cannot_1")}</li>
      <li className="cannot">{t("dg_cannot_2")}</li>
      <li>{t("dg_limits_1")}</li>
      <li>{t("dg_limits_2")}</li>
      <li>{t("dg_limits_3")}</li>
    </ul>
  </article>;
}

// ---- the secret, shown once --------------------------------------------------------------------------------------------------------------------

/** The token just issued, with its secret. The secret lives only in this component's props: closing it drops the last reference. */
export function TokenSecret({ t, created, close }: { t: Translate; created: DiagnosticTokenCreated; close: () => void }) {
  const [copy, setCopy] = useState<"idle" | "done" | "failed">("idle");
  const copySecret = () => {
    const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (!clipboard) { setCopy("failed"); return; }
    clipboard.writeText(created.token).then(() => setCopy("done"), () => setCopy("failed"));
  };
  return <section className="notice adm-secret dg-secret" role="alert" data-testid="dg-secret">
    <h4>{t("dg_created_title")}{created.label ? ` · ${created.label}` : ""}</h4>
    <p className="dg-once"><strong>{t("dg_once")}</strong></p>
    <label>{t("dg_secret")}
      <input className="mono dg-token" readOnly value={created.token} onFocus={event => event.currentTarget.select()} autoComplete="off" spellCheck={false} aria-label={t("dg_secret")} />
    </label>
    <p className="muted small">{fillAll(t("dg_read_only"), created.nodes.join(", "), when(created.expires_at))}</p>
    <div className="adm-foot">
      <button type="button" className="primary" onClick={copySecret}>{copy === "done" ? t("dg_copied") : t("dg_copy")}</button>
      <button type="button" onClick={close}>{t("dg_done")}</button>
    </div>
    {copy === "failed" && <p className="hint" role="status">{t("dg_copy_failed")}</p>}
  </section>;
}

// ---- the list of tokens ------------------------------------------------------------------------------------------------------------------------

export function TokenTable({ t, tokens, now, revoke }: { t: Translate; tokens: readonly DiagnosticTokenInfo[]; now: number; revoke: (token: DiagnosticTokenInfo) => void }) {
  if (tokens.length === 0) return <p className="muted" data-testid="dg-tokens-none">{t("dg_list_none")}</p>;
  return <div className="dg-table-wrap"><table className="dg-tokens" data-testid="dg-tokens">
    <thead><tr><th scope="col">{t("dg_c_note")}</th><th scope="col">{t("dg_c_nodes")}</th><th scope="col">{t("dg_c_status")}</th><th scope="col">{t("dg_c_expires")}</th><th scope="col">{t("dg_c_uses")}</th><th scope="col">{t("dg_c_last")}</th><th scope="col">{t("dg_c_by")}</th><th scope="col" /></tr></thead>
    <tbody>{sortTokens(tokens, now).map(token => {
      const state = tokenState(token, now);
      return <tr key={token.id} className={`dg-${state}`} data-testid={`dg-token-${token.id}`}>
        <td><strong>{token.label ?? t("dg_no_label")}</strong><br /><small className="mono muted">{token.id}</small></td>
        <td>{token.nodes.join(", ")}</td>
        <td><span className={`el-pill ${state === "active" ? "good" : "bad"}`}>{t(`dg_status_${state}`)}</span></td>
        <td>{when(token.expires_at)}</td>
        <td>{token.uses}</td>
        <td>{token.last_used_at ? when(token.last_used_at) : t("dg_never")}</td>
        <td>{token.created_by}</td>
        <td>{state === "active" && <button type="button" className="danger" onClick={() => revoke(token)} aria-label={`${t("dg_revoke")} ${token.id}`}>{t("dg_revoke")}</button>}</td>
      </tr>;
    })}</tbody>
  </table></div>;
}

// ---- what a node handed over --------------------------------------------------------------------------------------------------------------------

/** The summary of the latest package of a node (or just its log when that is all it delivered): the versions, why it last started, the memory, the tasks that are closest to overflowing, the gate, the core dump, the settings it allows to be read and the log. */
export function PackageSummary({ t, entry, kind }: { t: Translate; entry: DeliveredDiagnostics; kind: DiagnosticDetail }) {
  const data = entry.data;
  const full = data.detail === "package";
  const core = data.coredump;
  return <div className="dg-package" data-testid="dg-package">
    <p className="muted small">{fillAll(t(kind === "log" ? "dg_log_received" : "dg_received"), when(entry.at), entry.requested_by)}</p>
    {full && <>
      {data.versions && <section><h5>{t("dg_s_versions")}</h5>
        <p>{t("nh_firmware")} {data.versions.firmware} · IDF {data.versions.idf}{data.versions.board ? ` · ${data.versions.board}` : ""}</p>
        {data.versions.sensors.length > 0 && <p className="muted small">{data.versions.sensors.map(sensor => `${sensor.name} ${sensor.version}`).join(" · ")}</p>}
      </section>}
      <section data-testid="dg-boot"><h5>{t("dg_s_boot")}</h5>
        {data.resets && <p>{fillAll(t("dg_resets_line"), resetText(data.resets.reason, t), formatUptime(data.resets.uptime_s, t), data.resets.guard_restarts_in_hour)}</p>}
        {data.boot ? bootLines(data.boot, t).map(line => <p key={line} className="bad">{line}</p>) : <p className="muted small">–</p>}
      </section>
      {data.heap && <section data-testid="dg-memory"><h5>{t("dg_s_memory")}</h5>
        <p>{fillAll(t("dg_mem_internal"), formatBytes(data.heap.internal_free), formatBytes(data.heap.internal_min), formatBytes(data.heap.internal_largest))}</p>
        <p>{fillAll(t("dg_mem_total"), formatBytes(data.heap.total_free), formatBytes(data.heap.total_min))}{data.heap.psram_free !== undefined ? ` · ${fillAll(t("nh_psram"), formatBytes(data.heap.psram_free))}` : ""}</p>
      </section>}
      {data.tasks && data.tasks.length > 0 && <section data-testid="dg-tasks"><h5>{t("dg_s_tasks")}</h5>
        <ul>{leastStack(data.tasks).map(task => <li key={task.name} className="mono">{fillAll(t("dg_task_row"), task.name, formatBytes(task.stack_free), task.priority)}</li>)}</ul>
      </section>}
      {data.memory_gate && <section data-testid="dg-gate"><h5>{t("nh_gate")}</h5>
        <p className={data.memory_gate.closed ? "bad" : ""}>{t(data.memory_gate.closed ? "nh_gate_closed" : "nh_gate_open")} · {fillAll(t("nh_gate_times"), data.memory_gate.transitions)}</p>
        <p className="muted small">{fillAll(t("nh_gate_detail"), formatBytes(data.memory_gate.close_free), formatBytes(data.memory_gate.close_block), formatBytes(data.memory_gate.open_free), formatBytes(data.memory_gate.open_block))}</p>
      </section>}
      {core && <section data-testid="dg-core"><h5>{t("nh_coredump")}</h5>
        {!core.present && <p>{t("nh_coredump_none")}</p>}
        {core.present && <p className="bad">{fillAll(t("nh_coredump_present"), core.size !== undefined ? formatBytes(core.size) : "–")}</p>}
        {core.present && !core.summary && <p className="muted small">{t("dg_core_nosummary")}</p>}
        {core.summary && <>
          <p>{fillAll(t("dg_core_in"), core.summary.task)}{core.summary.reason ? ` · ${core.summary.reason}` : ""}{core.summary.pc ? ` · ${core.summary.pc}` : ""}</p>
          {core.summary.backtrace && core.summary.backtrace.length > 0 && <><h6>{t("dg_core_backtrace")}</h6><pre className="dg-log mono">{core.summary.backtrace.join("\n")}</pre></>}
        </>}
      </section>}
      {data.config && <section data-testid="dg-config"><h5>{t("dg_s_config")}</h5>
        {configEntries(data.config).length === 0 ? <p className="muted small">–</p> : <dl className="nh-facts">{configEntries(data.config).map(([name, value]) => <div key={name}><dt className="mono">{name}</dt><dd className="mono">{value}</dd></div>)}</dl>}
      </section>}
    </>}
    <section data-testid="dg-log"><h5>{t("dg_s_log")}</h5>
      <pre className="dg-log mono">{data.log === "" ? t("dg_log_empty") : data.log}</pre>
      {data.truncated && <p className="muted small">{t("dg_truncated")}</p>}
    </section>
  </div>;
}

// ---- the screen --------------------------------------------------------------------------------------------------------------------------------

const wait = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));

/** The tab: only an administrator sees it work (the server refuses everybody else anyway, so nothing is asked for anybody else). */
export function DiagnosticsPanel({ t, origin, isAdmin }: Props) {
  if (!isAdmin) return <article className="stack-card"><h3>{t("dg_title")}</h3><p className="muted">{t("cs_admin_only")}</p></article>;
  return <AdminDiagnostics t={t} origin={origin} />;
}

function AdminDiagnostics({ t, origin }: { t: Translate; origin: string }) {
  const health = usePolled(() => readNodeHealth(origin), 30_000, origin);
  const tokens = usePolled(() => listDiagnosticTokens(origin), 20_000, origin);
  const [picked, setPicked] = useState<string[]>([]);
  const [ttl, setTtl] = useState(DEFAULT_TTL_S);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const [created, setCreated] = useState<DiagnosticTokenCreated | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);

  const nodeIds = (health.data?.nodes ?? []).map(node => node.node_id).sort((a, b) => a.localeCompare(b));
  const request = buildTokenRequest(picked, ttl, label);
  const toggle = (id: string) => setPicked(current => (current.includes(id) ? current.filter(item => item !== id) : current.length >= MAX_TOKEN_NODES ? current : [...current, id]));
  const issue = async (event: FormEvent) => {
    event.preventDefault();
    if (!request || busy) return;
    setBusy(true); setMessage(null);
    try {
      const answer = await issueDiagnosticToken(origin, request);
      if (!alive.current) return;
      setCreated(answer); setPicked([]); setLabel(""); tokens.reload();
    } catch (error) { if (alive.current) setMessage({ text: t(diagnosticsErrorKey(error)), bad: true }); }
    finally { if (alive.current) setBusy(false); }
  };
  const revoke = async (token: DiagnosticTokenInfo) => {
    if (!(await askConfirm(fillAll(t("dg_revoke_q"), token.label ? `${token.label} (${token.id})` : token.id), t))) return;
    try { await revokeDiagnosticToken(origin, token.id); setMessage({ text: t("dg_revoked_ok"), bad: false }); }
    catch (error) { setMessage({ text: t(diagnosticsErrorKey(error)), bad: error instanceof ApiError ? error.status !== 404 : true }); }
    tokens.reload();
  };

  return <div className="dg-panel" data-testid="dg-panel">
    <article className="stack-card"><h3>{t("dg_title")}</h3><p className="muted">{t("dg_help")}</p></article>
    <TokenRules t={t} />
    <article className="stack-card" data-tour="dg-issue">
      <h3>{t("dg_issue_title")}</h3>
      {created && <TokenSecret t={t} created={created} close={() => setCreated(null)} />}
      <form className="dg-form" onSubmit={event => void issue(event)}>
        <fieldset>
          <legend>{t("dg_issue_nodes")}</legend>
          {nodeIds.length === 0 ? <p className="muted">{t("dg_nodes_none")}</p> : <div className="dg-nodes">{nodeIds.map(id => <label key={id} className="dg-node"><input type="checkbox" checked={picked.includes(id)} onChange={() => toggle(id)} />{id}</label>)}</div>}
          <small className="muted">{t("dg_nodes_max")}</small>
        </fieldset>
        <label>{t("dg_ttl")}
          <select value={ttl} onChange={event => setTtl(Number(event.target.value))}>{TTL_CHOICES.map(seconds => <option key={seconds} value={seconds}>{t(ttlKey(seconds))}</option>)}</select>
        </label>
        <label>{t("dg_label")}
          <input value={label} maxLength={48} placeholder={t("dg_label_ph")} onChange={event => setLabel(event.target.value)} autoComplete="off" />
        </label>
        <p className="hint">{t("dg_issue_hint")}</p>
        <button type="submit" className="primary" disabled={!request || busy}>{busy ? t("dg_issuing") : t("dg_issue")}</button>
      </form>
      {message && <p className={`notice ${message.bad ? "bad" : ""}`} role={message.bad ? "alert" : "status"}>{message.text}</p>}
    </article>
    <article className="stack-card" data-tour="dg-tokens">
      <h3>{t("dg_list_title")}</h3>
      {tokens.failed && !tokens.data && <p className="notice bad" role="alert">{t("dg_load_failed")}</p>}
      {tokens.data && <TokenTable t={t} tokens={tokens.data.tokens} now={now} revoke={token => void revoke(token)} />}
      <div className="adm-foot"><button type="button" onClick={() => tokens.reload()}>{t("svcRefresh")}</button></div>
    </article>
    <NodeDiagnosticsCard t={t} origin={origin} nodes={nodeIds} />
  </div>;
}

/** Ask one node for its package or its log, read what it handed over and download it. */
export function NodeDiagnosticsCard({ t, origin, nodes }: { t: Translate; origin: string; nodes: readonly string[] }) {
  const [node, setNode] = useState("");
  const [data, setData] = useState<NodeDiagnostics | null>(null);
  const [busy, setBusy] = useState<DiagnosticDetail | null>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const [lastAsked, setLastAsked] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const current = nodes.includes(node) ? node : nodes[0] ?? "";
  useEffect(() => {
    if (!current) { setData(null); return; }
    let live = true;
    setData(null);
    readNodeDiagnostics(origin, current).then(answer => { if (live) setData(answer); }).catch(() => { if (live) setData(null); });
    return () => { live = false; };
  }, [origin, current]);
  useEffect(() => { if (lastAsked === null) return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [lastAsked]);
  const waitMs = askWait(lastAsked, now);

  const ask = async (detail: DiagnosticDetail) => {
    if (!current || busy || waitMs > 0) return;
    setBusy(detail); setMessage({ text: t("dg_asking"), bad: false });
    try {
      let operation = await controlNode(origin, current, { operation: "diagnostics", detail });
      setLastAsked(Date.now()); setNow(Date.now());
      // the node answers in a few seconds: the order is followed until the node handed it over or the order is over
      for (let turn = 0; turn < 12 && alive.current; turn += 1) {
        const line = operation.nodes[0];
        if (line?.delivered === detail || (line && isFailed(line)) || operationFinished(operation)) break;
        await wait(2500);
        operation = await readNodeControlOperation(origin, operation.id);
      }
      if (!alive.current) return;
      const line = operation.nodes[0];
      if (line && isFailed(line)) { setMessage({ text: line.stage === "refused" ? t(refusalKey(line.refusal)) : t("dg_not_delivered"), bad: true }); return; }
      const answer = await readNodeDiagnostics(origin, current);
      if (!alive.current) return;
      setData(answer);
      const got = detail === "log" ? answer.log ?? answer.package : answer.package;
      setMessage({ text: t(line?.delivered === detail || got ? "dg_delivered" : "dg_not_delivered"), bad: false });
    } catch (error) { if (alive.current) setMessage({ text: t(diagnosticsErrorKey(error)), bad: true }); }
    finally { if (alive.current) setBusy(null); }
  };
  const save = async (kind: DiagnosticDetail) => {
    try {
      const file = kind === "log" ? await downloadDiagnosticLog(origin, current) : await downloadDiagnosticPackage(origin, current);
      downloadText(file.filename, file.text, file.mime);
    } catch (error) { setMessage({ text: t(diagnosticsErrorKey(error)), bad: true }); }
  };
  const shown: { entry: DeliveredDiagnostics; kind: DiagnosticDetail } | null = data?.package ? { entry: data.package, kind: "package" } : data?.log ? { entry: data.log, kind: "log" } : null;

  return <article className="stack-card dg-node-card" data-tour="dg-node">
    <h3>{t("dg_node_title")}</h3>
    <p className="muted">{t("dg_node_help")}</p>
    {nodes.length === 0 ? <p className="muted">{t("dg_nodes_none")}</p> : <>
      <label>{t("dg_node_pick")}
        <select value={current} onChange={event => { setNode(event.target.value); setMessage(null); }}>{nodes.map(id => <option key={id} value={id}>{id}</option>)}</select>
      </label>
      <div className="adm-foot">
        <button type="button" className="primary" disabled={busy !== null || waitMs > 0} onClick={() => void ask("package")}>{t("dg_ask_package")}</button>
        <button type="button" disabled={busy !== null || waitMs > 0} onClick={() => void ask("log")}>{t("dg_ask_log")}</button>
        {waitMs > 0 && <small className="muted">{Math.ceil(waitMs / 1000)} s / {ASK_GAP_MS / 1000} s</small>}
      </div>
      {message && <p className={`notice ${message.bad ? "bad" : ""}`} role={message.bad ? "alert" : "status"}>{message.text}</p>}
      {shown ? <>
        <PackageSummary t={t} entry={shown.entry} kind={shown.kind} />
        <div className="adm-foot">
          <button type="button" onClick={() => void save("package")} disabled={!data?.package}>{t("dg_dl_package")}</button>
          <button type="button" onClick={() => void save("log")}>{t("dg_dl_log")}</button>
        </div>
      </> : <p className="muted" data-testid="dg-empty">{t("dg_empty")}</p>}
    </>}
  </article>;
}
