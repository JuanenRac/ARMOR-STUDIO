/**
 * Configuration > Battery maintenance: writing to Pylontech batteries through the gateway node they are plugged into, one guided operation at a time (administrators only). Four steps:
 * choose the battery and the operation; fill in its values (checked against the table of the server); confirm by typing the battery's serial number and let the node read the battery and
 * check everything (it answers with exactly what it will do); then do it, watch it, and read what changed. Nothing is a free command, nothing is sent before the person has seen what the
 * node will do, and what the battery said before and after is shown next to the difference. See ARMOR-SERVER src/battery_write.ts.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ApiError, batteryArm, batteryCancel, batteryCatalog, batteryExecute, batteryImageUpload, batteryOperation, batteryOperations, batteryRestore, listSolar,
  type BatteryCatalog, type BatteryOperation,
} from "./api";
import { fill } from "./FirmwarePanel";
import {
  buildParams, emptyForm, errorKey, isActive, limitGroupOf, operationGroups, percentOf, readLimit, scaleOf, serialLooksRight, showLimit, specOf, batteryNodes, type BatteryForm,
} from "./batteryModel";

type Translate = (key: string) => string;
type Props = { t: Translate; origin: string; isAdmin: boolean };
type Step = "choose" | "values" | "confirm";

const LIMIT_ROOTS = ["ov", "hv", "lv", "uv", "slp", "ot", "ht", "lt", "ut"];
/** The name of a threshold in words: "pov" is the module's over-voltage protection, "povr" its release (the key always follows the words, so it can be found in the maker's own tool). */
export function limitLabel(t: Translate, key: string): string {
  const base = key.slice(1);
  const release = base.length > 2 && base.endsWith("r") && LIMIT_ROOTS.includes(base.slice(0, -1));
  const root = release ? base.slice(0, -1) : base;
  const words = LIMIT_ROOTS.includes(root) ? t(`bm_lim_${root}`) : key.toUpperCase();
  return `${words}${release ? ` · ${t("bm_lim_release")}` : ""} (${key.toUpperCase()})`;
}

/** The keys of the sentences a screen asks for by building their name: the tests check that every one exists in every language. */
export function dynamicKeys(catalog: BatteryCatalog): string[] {
  const keys: string[] = [];
  for (const item of catalog.ops) keys.push(`bm_op_${item.id}`, `bm_opd_${item.id}`, `bm_group_${item.group}`, `bm_risk_${item.risk}`);
  for (const group of catalog.limit_groups) {
    keys.push(`bm_lg_${group.name}`);
    for (const [key] of group.keys) { const base = key.slice(1); const root = base.length > 2 && base.endsWith("r") && LIMIT_ROOTS.includes(base.slice(0, -1)) ? base.slice(0, -1) : base; keys.push(`bm_lim_${root}`); }
  }
  for (const stage of ["arming", "armed", "starting", "running", "done", "rejected", "expired", "lost", "withdrawn"]) keys.push(`bm_stage_${stage}`);
  for (const outcome of ["ok", "failed", "partial", "retry", "rejected"]) keys.push(`bm_result_${outcome}`);
  for (const output of ["cfet", "dfet", "buzz", "heat"]) keys.push(`bm_out_${output}`);
  return keys;
}

function Bar({ percent }: { percent: number }) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return <div className="fw-bar working" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><i style={{ width: `${value}%` }} /></div>;
}

function Pre({ title, text }: { title: string; text: string }) {
  if (!text) return null;
  return <details open><summary>{title}</summary><pre className="mono" style={{ whiteSpace: "pre-wrap", maxHeight: "16rem", overflow: "auto" }}>{text}</pre></details>;
}

export function BatteryMaintenance({ t, origin, isAdmin }: Props) {
  const [info, setInfo] = useState<{ enabled: boolean; catalog: BatteryCatalog } | null>(null);
  const [nodes, setNodes] = useState<string[]>([]);
  const [history, setHistory] = useState<BatteryOperation[]>([]);
  const [step, setStep] = useState<Step>("choose");
  const [node, setNode] = useState("");
  const [port, setPort] = useState("1");
  const [op, setOp] = useState("");
  const [form, setForm] = useState<BatteryForm>(emptyForm());
  const [serial, setSerial] = useState("");
  const [active, setActive] = useState<BatteryOperation | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const known = useCallback((key: string) => t(key) !== key, [t]);
  const explain = useCallback((error: unknown): string => {
    const code = error instanceof ApiError ? error.code : "generic";
    return t(errorKey(code.startsWith("stage_") ? "stage" : code, known));
  }, [t, known]);

  const refresh = useCallback(async () => {
    try {
      const [catalogue, list, solar] = await Promise.all([batteryCatalog(origin), batteryOperations(origin), listSolar(origin)]);
      if (!alive.current) return;
      setInfo(catalogue);
      setHistory(list.operations);
      setNodes(batteryNodes(solar.devices));
      setNode(current => current || batteryNodes(solar.devices)[0] || "");
    } catch (error) { if (alive.current) setMessage(explain(error)); }
  }, [origin, explain]);
  useEffect(() => { if (isAdmin) void refresh(); }, [isAdmin, refresh]);

  // while an operation is under way the node's progress is asked for often, otherwise the list now and then
  useEffect(() => {
    if (!isAdmin || !active) return;
    if (!isActive(active)) { void refresh(); return; }
    const timer = window.setInterval(() => {
      batteryOperation(origin, active.id).then(next => { if (alive.current) setActive(next); }).catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [active, isAdmin, origin, refresh]);

  const catalog = info?.catalog;
  const groups = useMemo(() => (catalog ? operationGroups(catalog) : []), [catalog]);
  const spec = catalog && op ? specOf(catalog, op) : undefined;
  const portNumber = Number(port);
  const set = <K extends keyof BatteryForm>(key: K, value: BatteryForm[K]) => setForm(current => ({ ...current, [key]: value }));

  if (!isAdmin) return <article className="stack-card"><h3>{t("bm_title")}</h3><p className="muted">{t("bm_admin_only")}</p></article>;

  const fail = (error: unknown) => { setMessage(explain(error)); setBusy(false); };

  const goValues = () => {
    if (!node || !Number.isInteger(portNumber) || portNumber < 1 || portNumber > 10 || !spec) { setMessage(t("bm_prob_choose")); return; }
    setMessage(""); setStep("values");
  };
  const goConfirm = () => {
    const built = catalog ? buildParams(catalog, op, form) : { ok: false as const, problem: "bm_prob_choose" };
    if (!built.ok) { setMessage(t(built.problem)); return; }
    setMessage(""); setStep("confirm");
  };
  const prepare = async () => {
    if (!catalog) return;
    const built = buildParams(catalog, op, form);
    if (!built.ok) { setMessage(t(built.problem)); return; }
    if (!serialLooksRight(catalog, serial.trim())) { setMessage(t("bm_prob_serial")); return; }
    setBusy(true); setMessage("");
    try {
      const armed = await batteryArm(origin, { node, port: portNumber, op, params: built.params, serial: serial.trim() });
      setActive(armed); setBusy(false);
    } catch (error) { fail(error); }
  };
  const execute = async () => {
    if (!active) return;
    setBusy(true); setMessage("");
    try { setActive(await batteryExecute(origin, active.id, serial.trim())); setBusy(false); } catch (error) { fail(error); }
  };
  const stop = async () => {
    if (!active) return;
    setBusy(true); setMessage("");
    try { const next = await batteryCancel(origin, active.id); setActive(next); setBusy(false); if (next.cancel_requested) setMessage(t("bm_cancel_asked")); } catch (error) { fail(error); }
  };
  const restore = async () => {
    if (!active) return;
    setBusy(true); setMessage("");
    try { setActive(await batteryRestore(origin, active.id, serial.trim())); setBusy(false); } catch (error) { fail(error); }
  };
  const again = () => { setActive(null); setStep("choose"); setForm(emptyForm()); setSerial(""); setMessage(""); void refresh(); };
  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true); setMessage(t("bm_image_sending"));
    try { set("image", await batteryImageUpload(origin, file)); setMessage(""); } catch (error) { setMessage(explain(error)); } finally { setBusy(false); }
  };

  // ---- the values of the operation -------------------------------------------------------------------------------------------------------
  const values = () => {
    if (!catalog || !spec) return null;
    const names = Object.keys(spec.params);
    if (names.length === 0) return <p className="muted">{t("bm_values_none")}</p>;
    const group = limitGroupOf(catalog, form.group);
    return <div className="form-grid">
      {names.includes("which") && <label>{t("bm_which")}<select value={form.which} onChange={event => set("which", event.target.value)}><option value="event">{t("bm_which_event")}</option><option value="history">{t("bm_which_history")}</option></select></label>}
      {names.includes("group") && <label>{t("bm_limit_group")}<select value={form.group} onChange={event => set("group", event.target.value)}>{catalog.limit_groups.map(item => <option key={item.name} value={item.name}>{t(`bm_lg_${item.name}`)}</option>)}</select></label>}
      {names.includes("values") && group && <div>
        <p className="hint">{t("bm_limits_note")}</p>
        {group.keys.map(([key]) => {
          const field = `${group.name}.${key}`;
          const scale = scaleOf(group);
          return <label key={field}>{limitLabel(t, key)} <small className="muted">({fill(t("bm_range"), showLimit(group, group.lowest), showLimit(group, group.highest))} {scale.unit})</small>
            <input inputMode="decimal" value={form.limits[field] ?? ""} onChange={event => set("limits", { ...form.limits, [field]: event.target.value })} aria-invalid={form.limits[field] !== undefined && form.limits[field] !== "" && readLimit(group, form.limits[field]) === undefined} />
          </label>;
        })}
      </div>}
      {names.includes("items") && <div>
        <p className="hint">{t("bm_prot_legend")}</p>
        {catalog.protections.map(name => <label key={name}><span className="mono">{name.toUpperCase()}</span>{" "}
          <select value={form.protections[name] ?? "keep"} onChange={event => set("protections", { ...form.protections, [name]: event.target.value as "keep" | "en" | "dis" })}>
            <option value="keep">{t("bm_prot_keep")}</option><option value="en">{t("bm_prot_en")}</option><option value="dis">{t("bm_prot_dis")}</option>
          </select></label>)}
        <label><input type="checkbox" checked={form.acceptRisk} onChange={event => set("acceptRisk", event.target.checked)} /> {t("bm_accept_risk")}</label>
      </div>}
      {names.includes("output") && <label>{t("bm_output")}<select value={form.output} onChange={event => set("output", event.target.value)}>{["cfet", "dfet", "buzz", "heat"].map(item => <option key={item} value={item}>{t(`bm_out_${item}`)}</option>)}</select></label>}
      {names.includes("state") && <label>{t("bm_state")}<select value={form.state} onChange={event => set("state", event.target.value)}><option value="on">{t("bm_state_on")}</option><option value="off">{t("bm_state_off")}</option></select></label>}
      {spec.params.serial && <label>{t("bm_label")}<input value={form.label} onChange={event => set("label", event.target.value)} autoComplete="off" /></label>}
      {names.includes("restore_barcode") && <label><input type="checkbox" checked={form.restoreBarcode} onChange={event => set("restoreBarcode", event.target.checked)} /> {t("bm_restore_barcode")}</label>}
      {names.includes("image_size") && <div>
        <p className="hint">{t("bm_image_note")}</p>
        <label>{t("bm_image_file")}<input type="file" accept=".bin,application/octet-stream" onChange={event => void pick(event)} disabled={busy} /></label>
        {form.image && <p className="mono">{fill(t("bm_image_read"), form.image.board, form.image.version, Math.round(form.image.size / 1024))}<br />SHA-256 {form.image.sha256}</p>}
        <label><input type="checkbox" checked={form.clearEeprom} onChange={event => set("clearEeprom", event.target.checked)} /> {t("bm_clear_eeprom")}</label>
      </div>}
      {names.includes("line") && <div><p className="hint">{t("bm_expert_note")}</p><label>{t("bm_expert_line")}<input className="mono" value={form.line} maxLength={48} onChange={event => set("line", event.target.value)} autoComplete="off" spellCheck={false} /></label></div>}
    </div>;
  };

  // ---- an operation as it stands ---------------------------------------------------------------------------------------------------------
  const operationView = (operation: BatteryOperation) => {
    const running = operation.stage === "starting" || operation.stage === "running";
    return <article className="stack-card" data-testid="battery-operation">
      <p className="eyebrow">{t("bm_step_run")}</p>
      <h3>{t(`bm_op_${operation.op}`)} · {operation.node}/{operation.port}</h3>
      <p><strong>{t(`bm_stage_${operation.stage}`)}</strong>{operation.summary ? ` — ${operation.summary}` : ""}</p>
      {operation.stage === "arming" && <p className="muted">{operation.staging ? fill(t("bm_staging"), operation.staging.sent, operation.staging.total) : t("bm_arming")}</p>}
      {operation.battery && <p className="muted">{fill(t("bm_battery_is"), operation.battery.model, operation.battery.serial || "—", operation.battery.soft_version)}</p>}
      {operation.risk && <p className={operation.risk === "irreversible" || operation.risk === "high" ? "login-notice" : "muted"}>{fill(t("bm_risk_is"), t(`bm_risk_${operation.risk}`))}{operation.atomic ? ` — ${t("bm_atomic_note")}` : ""}</p>}
      {operation.stage === "armed" && <>
        <h4>{t("bm_armed_title")}</h4>
        <p className="mono">{operation.canonical}</p>
        {operation.armed_until && <p className="muted">{fill(t("bm_valid_until"), new Date(operation.armed_until).toLocaleTimeString())}</p>}
        <Pre title={t("bm_read_title")} text={operation.snapshot_before ?? ""} />
        <div className="confirm-actions"><button className="primary" disabled={busy} onClick={() => void execute()}>{t("bm_execute")}</button><button disabled={busy} onClick={() => void stop()}>{t("bm_withdraw")}</button></div>
      </>}
      {running && <>
        <Bar percent={percentOf(operation)} />
        <p className="muted">{operation.steps_total ? fill(t("bm_step_n"), operation.steps_done ?? 0, operation.steps_total) : t("bm_running")}{operation.packets_total ? ` · ${fill(t("bm_packet_n"), operation.packets_sent ?? 0, operation.packets_total)}` : ""}</p>
        {!operation.atomic && <button disabled={busy || operation.cancel_requested} onClick={() => void stop()}>{t("bm_cancel_op")}</button>}
      </>}
      {operation.stage === "rejected" && operation.refusal && <p className="login-notice" role="alert">{t(errorKey(operation.refusal.startsWith("stage_") ? "stage" : operation.refusal, known))}</p>}
      {(operation.stage === "expired" || operation.stage === "lost") && <p className="login-notice" role="alert">{t(errorKey(operation.stage === "expired" ? "expired" : "no_answer", known))}{operation.code ? ` ${fill(t("bm_code"), operation.code)}` : ""}</p>}
      {operation.stage === "done" && operation.outcome && <>
        <p className={operation.outcome === "ok" ? "" : "login-notice"} role={operation.outcome === "ok" ? undefined : "alert"}>{t(`bm_result_${operation.outcome}`)}{operation.code ? ` ${fill(t("bm_code"), operation.code)}` : ""}</p>
        <h4>{t("bm_diff_title")}</h4>
        {operation.diff && operation.diff.length > 0
          ? operation.diff.map(item => <p key={item.label} className="mono"><strong>{item.label}</strong><br />{t("bm_before")}: {item.before || "—"}<br />{t("bm_after")}: {item.after || "—"}</p>)
          : <p className="muted">{t("bm_diff_none")}</p>}
        {operation.restore && <button disabled={busy} onClick={() => void restore()}>{t("bm_restore_btn")}</button>}
        <Pre title={t("bm_read_title")} text={operation.before ?? operation.snapshot_before ?? ""} />
        <Pre title={t("bm_after")} text={operation.after ?? ""} />
        <Pre title={t("bm_transcript_title")} text={operation.transcript ?? ""} />
      </>}
      {!isActive(operation) && <button onClick={again}>{t("bm_new")}</button>}
    </article>;
  };

  return <section className="config-grid" data-testid="battery-maintenance">
    <article className="stack-card">
      <p className="eyebrow">{t("tabBatteries")}</p>
      <h3>{t("bm_title")}</h3>
      <p className="muted">{t("bm_help")}</p>
      <p className="login-notice" role="note">{t("bm_warning")}</p>
      {info && !info.enabled && <p className="login-notice" role="alert">{t("bm_off")}</p>}
      {message && <p className="login-notice" role="alert">{message}</p>}
    </article>
    {active ? operationView(active) : <article className="stack-card">
      <nav className="muted" aria-label="steps"><strong>{t(step === "choose" ? "bm_step_choose" : step === "values" ? "bm_step_values" : "bm_step_confirm")}</strong></nav>
      {step === "choose" && <div className="form-grid">
        <label>{t("bm_node")}{nodes.length > 0
          ? <select value={node} onChange={event => setNode(event.target.value)}>{nodes.map(item => <option key={item} value={item}>{item}</option>)}</select>
          : <span className="muted"> {t("bm_node_none")}</span>}</label>
        <label>{t("bm_port")}<input type="number" min={1} max={10} value={port} onChange={event => setPort(event.target.value)} /></label>
        <p className="hint">{t("bm_port_hint")}</p>
        <label>{t("bm_operation")}<select value={op} onChange={event => setOp(event.target.value)}>
          <option value="">—</option>
          {groups.map(item => <optgroup key={item.group} label={t(`bm_group_${item.group}`)}>{item.ops.map(entry => <option key={entry.id} value={entry.id}>{t(`bm_op_${entry.id}`)}</option>)}</optgroup>)}
        </select></label>
        {spec && <><p>{t(`bm_opd_${spec.id}`)}</p><p className="muted">{fill(t("bm_risk_is"), t(`bm_risk_${spec.risk}`))}{spec.atomic ? ` — ${t("bm_atomic_note")}` : ""}</p></>}
        <div className="confirm-actions"><button className="primary" disabled={!info?.enabled || !spec || !node} onClick={goValues}>{t("bm_next")}</button></div>
      </div>}
      {step === "values" && <>
        {values()}
        <div className="confirm-actions"><button onClick={() => setStep("choose")}>{t("bm_back")}</button><button className="primary" disabled={busy} onClick={goConfirm}>{t("bm_next")}</button></div>
      </>}
      {step === "confirm" && spec && <>
        <p><strong>{t(`bm_op_${spec.id}`)}</strong> · {node}/{port}</p>
        <p className="muted">{t(`bm_opd_${spec.id}`)}</p>
        <label>{t("bm_serial")}<input className="mono" value={serial} onChange={event => setSerial(event.target.value)} autoComplete="off" spellCheck={false} /></label>
        <p className="hint">{t("bm_serial_help")}</p>
        <div className="confirm-actions"><button onClick={() => setStep("values")}>{t("bm_back")}</button><button className="primary" disabled={busy || !serial.trim()} onClick={() => void prepare()}>{t("bm_prepare")}</button></div>
      </>}
    </article>}
    <article className="stack-card">
      <h3>{t("bm_history_title")}</h3>
      {history.length === 0 ? <p className="muted">{t("bm_history_empty")}</p> : <div className="scroll"><table>
        <thead><tr><th>{t("bm_col_when")}</th><th>{t("bm_col_who")}</th><th>{t("bm_col_battery")}</th><th>{t("bm_operation")}</th><th>{t("bm_col_result")}</th><th /></tr></thead>
        <tbody>{history.slice(0, 20).map(item => <tr key={item.id}>
          <td>{new Date(item.updated_at).toLocaleString()}</td><td>{item.actor}</td><td>{item.node}/{item.port}</td><td>{t(`bm_op_${item.op}`)}</td>
          <td>{item.stage === "done" && item.outcome ? t(`bm_result_${item.outcome}`).split(":")[0].split(".")[0] : t(`bm_stage_${item.stage}`)}</td>
          <td><button onClick={() => { setActive(item); }}>{t("bm_open")}</button></td>
        </tr>)}</tbody></table></div>}
    </article>
  </section>;
}
