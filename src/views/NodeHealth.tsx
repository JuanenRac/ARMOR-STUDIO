/**
 * The health of the nodes, in the System menu: the same report from every radar, solar, electrical, alarm and wall-panel node (how long it has been up and why it last restarted, its memory,
 * its link, how often it lost the broker, the last error it logged), what the server makes of it (the warnings) and, for one node, the history of its memory and signal and its restarts.
 * Reading never moves anything; an administrator can forget a node that was taken away.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useRef, useState } from "react";
import { ApiError, forgetNodeHealth, readNodeControlOperation, readNodeHealth, readNodeHealthDetail, type HealthFamily, type NodeControlOperation, type NodeHealthDetail, type NodeHealthItem, type NodeHealthLevels } from "../api";
import { askConfirm } from "../askConfirm";
import type { Translate } from "../components/camera";
import { usePolled } from "../hooks";
import { causeText, fillAll, formatBytes, formatUptime, heapMeter, heapSeries, HEALTH_FAMILIES, isAbnormalReset, resetText, signalLevel, signalSeries, sparkline, statusClass, visibleNodes, warningExplanation } from "../nodeHealthModel";
import { operationFinished, reachableNodes, stateChips, type NodeAction } from "../nodeControlModel";
import { RadarFactsInfo, SensorTable, StartInfo } from "./NodeHealthExtras";
import { ActionMenu, ControlDialog, GroupActions, OperationView, type DialogRequest } from "./NodeControl";
import "./electrical-live.css";
import "./node-health.css";
import "./node-control.css";

const sinceIso = (iso: string, now: number, t: Translate): string => {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return Number.isFinite(seconds) ? (seconds < 90 ? `${seconds} s` : seconds < 5400 ? `${Math.round(seconds / 60)} ${t("minutesShort")}` : `${Math.round(seconds / 3600)} ${t("hoursShort")}`) : "–";
};

export function NodeHealth({ t, origin, isAdmin, now = Date.now() }: { t: Translate; origin: string; isAdmin: boolean; now?: number }) {
  const poll = usePolled(() => readNodeHealth(origin), 15000, origin);
  const [family, setFamily] = useState<HealthFamily | "all">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const [order, setOrder] = useState<NodeControlOperation | null>(null);
  const data = poll.data;
  const orderOpen = order !== null && !operationFinished(order);
  const orderId = order?.id;
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  // while an order is under way the server is asked how it stands every couple of seconds; when it is over the health of the nodes is read again
  useEffect(() => {
    if (!orderId || !orderOpen) return;
    const timer = window.setInterval(() => {
      readNodeControlOperation(origin, orderId).then(next => { if (alive.current) { setOrder(next); if (operationFinished(next)) poll.reload?.(); } }).catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, orderOpen, origin]);
  const nodes = data ? visibleNodes(data.nodes, family) : [];
  const forget = async (node: NodeHealthItem) => {
    if (!(await askConfirm(fillAll(t("nh_forget_q"), node.node_id), t))) return;
    try { await forgetNodeHealth(origin, node.node_id); setMessage({ text: t("nh_forgotten"), bad: false }); setOpen(null); poll.reload?.(); }
    catch (error) { setMessage({ text: error instanceof ApiError && error.status === 404 ? t("nh_forgotten") : t("nh_forget_failed"), bad: true }); }
  };
  return <article className="stack-card node-health" data-tour="sys-health" aria-label={t("nh_title")}>
    <div className="log-head">
      <h3>{t("nh_title")}</h3>
      {data && <div className="nh-totals" aria-live="polite">
        <span className="el-pill good">{t("nh_total_reporting")}: {data.totals.nodes - data.totals.stale}</span>
        <span className={`el-pill ${data.totals.with_warnings > 0 ? "warn" : "good"}`}>{t("nh_total_warnings")}: {data.totals.with_warnings}</span>
        {data.totals.stale > 0 && <span className="el-pill bad">{t("nh_total_silent")}: {data.totals.stale}</span>}
      </div>}
    </div>
    {isAdmin && data && data.nodes.length > 0 && <GroupActions t={t} nodes={data.nodes} choose={operation => setDialog({ operation, scope: "all", label: `nc_op_${operation}`, count: reachableNodes(data.nodes).length })} />}
    {isAdmin && order && <OperationView t={t} operation={order} dismiss={() => setOrder(null)} />}
    <p className="muted">{t("nh_help")}</p>
    {poll.failed && !data && <p className="solar-notice bad">{t("nh_unreachable")}</p>}
    {data && <p className="muted small" data-testid="nh-levels">{fillAll(t("nh_levels"), Math.round(data.levels.low_heap_b / 1000), data.levels.restarts_per_day, data.levels.flap_reconnects, data.levels.flap_window_min, data.levels.weak_signal_dbm)}</p>}
    {data && data.nodes.length > 0 && <label className="nh-filter">
      <select value={family} onChange={event => setFamily(event.target.value as HealthFamily | "all")} aria-label={t("nh_filter_all")}>
        <option value="all">{t("nh_filter_all")}</option>
        {HEALTH_FAMILIES.filter(item => data.nodes.some(node => node.family === item)).map(item => <option key={item} value={item}>{t(`nh_family_${item}`)}</option>)}
      </select>
    </label>}
    {data && data.nodes.length === 0 && <div className="nh-empty"><h4>{t("nh_none")}</h4><p className="muted">{t("nh_none_help")}</p></div>}
    <div className="nh-grid">
      {nodes.map(node => <NodeCard key={node.node_id} t={t} node={node} levels={data!.levels} now={now} opened={open === node.node_id} toggle={() => setOpen(open === node.node_id ? null : node.node_id)}
        origin={origin} isAdmin={isAdmin} forget={() => void forget(node)} control={action => setDialog({ operation: action.operation, scope: "node", node, label: action.label })} />)}
    </div>
    {data && data.waiting.length > 0 && <p className="muted small nh-waiting">{t("nh_waiting")} {data.waiting.map(item => `${item.node_id} (${t(`nh_family_${item.family}`)})`).join(", ")}</p>}
    {message && <p className={`solar-notice ${message.bad ? "bad" : ""}`} role={message.bad ? "alert" : "status"}>{message.text}</p>}
    {isAdmin && dialog && <ControlDialog t={t} origin={origin} request={dialog} close={() => setDialog(null)} started={operation => { setDialog(null); setOrder(operation); setMessage({ text: t("nc_sent_ok"), bad: false }); poll.reload?.(); }} />}
  </article>;
}

export function NodeCard({ t, node, levels, now, opened, toggle, origin, isAdmin, forget, control }: { t: Translate; node: NodeHealthItem; levels: NodeHealthLevels; now: number; opened: boolean; toggle: () => void; origin: string; isAdmin: boolean; forget: () => void; control?: (action: NodeAction) => void }) {
  const report = node.report;
  const memory = heapMeter(report.heap_free, levels.low_heap_b);
  const internal = heapMeter(report.heap_internal_free ?? 0, levels.low_internal_b ?? 40_960);
  const abnormal = isAbnormalReset(report.reset_reason);
  const chips = stateChips(node, now, t);
  return <section className={`nh-card ${node.status}`} data-testid={`nh-${node.node_id}`}>
    <header>
      <strong>{node.node_id}</strong>
      <span className="el-pill">{t(`nh_family_${node.family}`)}</span>
      <span className={`el-pill ${statusClass(node)}`}>{t(`nh_status_${node.status}`)} · {sinceIso(node.received_at, now, t)}</span>
    </header>
    {chips.length > 0 && <div className="nc-chips" data-testid={`nc-chips-${node.node_id}`}>{chips.map(chip => <span key={chip.id} className={`el-pill nc-chip ${chip.id}`}>{chip.text}</span>)}</div>}
    {node.warnings.length > 0 && <ul className="nh-warnings">{node.warnings.map(warning => <li key={warning.code}>{t(`nh_warn_${warning.code}`)}{warningExplanation(warning, t) && <small className="nh-warning-why">{warningExplanation(warning, t)}</small>}</li>)}</ul>}
    <dl className="nh-facts">
      <div><dt>{t("nh_firmware")}</dt><dd>{node.firmware}{node.board ? ` · ${node.board}` : ""}</dd></div>
      <div><dt>{t("nh_uptime")}</dt><dd>{formatUptime(report.uptime_s, t)}</dd></div>
      <div><dt>{t("nh_reset")}</dt><dd className={abnormal ? "bad" : ""}>{resetText(report.reset_reason, t)}{abnormal ? ` · ${t("nh_unexpected")}` : ""}</dd></div>
      <div><dt>{t("nh_heap")}</dt><dd>
        <span className="nh-meter" role="img" aria-label={formatBytes(report.heap_free)}><i className={memory.level} style={{ width: `${memory.percent}%` }} /></span>
        {formatBytes(report.heap_free)} <small className="muted">{fillAll(t("nh_heap_min"), formatBytes(report.heap_min))}</small>
      </dd></div>
      {report.heap_internal_free !== undefined && <div><dt>{t("nh_internal")}</dt><dd data-testid="nh-internal">
        <span className="nh-meter" role="img" aria-label={formatBytes(report.heap_internal_free)}><i className={internal.level} style={{ width: `${internal.percent}%` }} /></span>
        {formatBytes(report.heap_internal_free)} <small className="muted">{fillAll(t("nh_internal_detail"), formatBytes(report.heap_internal_min ?? 0), formatBytes(report.heap_internal_largest ?? 0))}{report.psram_free !== undefined ? ` · ${fillAll(t("nh_psram"), formatBytes(report.psram_free))}` : ""}</small>
      </dd></div>}
      <div><dt>{t("nh_link")}</dt><dd>{t(`nh_link_${report.link}`)} · {t(report.link_up ? "nh_link_up" : "nh_link_down")}{report.rssi_dbm !== undefined && <> · {t("nh_signal")}: {report.rssi_dbm} dBm <span className={`nh-signal ${signalLevel(report.rssi_dbm)}`}>{t(`nh_signal_${signalLevel(report.rssi_dbm)}`)}</span></>}</dd></div>
      <div><dt>{t("nh_reconnects")}</dt><dd title={t("nh_reconnects_hint")}>{report.broker_reconnects}</dd></div>
      <div><dt>{t("nh_restarts")}</dt><dd>{node.restarts_24h}</dd></div>
      {(report.low_stack_tasks ?? 0) > 0 && <div><dt>{t("nh_stack")}</dt><dd className="bad">{report.low_stack_tasks}</dd></div>}
      <div className="wide"><dt>{t("nh_last_error")}</dt><dd className={report.last_error ? "mono" : "muted"}>{report.last_error ?? t("nh_no_error")}</dd></div>
    </dl>
    <StartInfo t={t} report={report} />
    <SensorTable t={t} report={report} isAdmin={isAdmin} />
    {report.radar && <RadarFactsInfo t={t} radar={report.radar} />}
    <div className="nh-actions">
      <button type="button" onClick={toggle} aria-expanded={opened}>{opened ? t("nh_hide") : t("nh_details")}</button>
      {isAdmin && control && !node.stale && <ActionMenu t={t} node={node} choose={control} />}
      {isAdmin && <button type="button" className="danger" onClick={forget}>{t("nh_forget")}</button>}
    </div>
    {opened && <Detail t={t} origin={origin} node={node} />}
  </section>;
}

function Line({ title, values, unit, none }: { title: string; values: number[]; unit: string; none: string }) {
  const path = sparkline(values, 240, 48);
  return <figure className="nh-line">
    <figcaption>{title}</figcaption>
    {path ? <svg viewBox="0 0 240 48" role="img" aria-label={title}><path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg> : <p className="muted small">{none}</p>}
    {path && <small className="muted">{unit}</small>}
  </figure>;
}

function Detail({ t, origin, node }: { t: Translate; origin: string; node: NodeHealthItem }) {
  const [detail, setDetail] = useState<NodeHealthDetail | null>(null);
  useEffect(() => {
    let live = true;
    readNodeHealthDetail(origin, node.node_id).then(answer => { if (live) setDetail(answer); }).catch(() => { if (live) setDetail(null); });
    return () => { live = false; };
  }, [origin, node.node_id, node.received_at]);
  if (!detail) return null;
  const heap = heapSeries(detail.samples), signal = signalSeries(detail.samples);
  return <div className="nh-detail">
    <Line title={t("nh_history_heap")} values={heap} unit={`${formatBytes(Math.min(...heap))} – ${formatBytes(Math.max(...heap))}`} none={t("nh_history_none")} />
    {node.report.link === "wifi" && <Line title={t("nh_history_signal")} values={signal} unit={signal.length ? `${Math.min(...signal)} – ${Math.max(...signal)} dBm` : ""} none={t("nh_history_none")} />}
    <h4>{t("nh_restart_log")}</h4>
    {detail.restarts.length === 0 ? <p className="muted small">{t("nh_no_restarts")}</p> : <ul className="nh-restarts">
      {detail.restarts.map(item => <li key={item.at} className={item.abnormal ? "bad" : ""}>
        <time dateTime={item.at}>{new Date(item.at).toLocaleString()}</time> · {resetText(item.reason, t)}{item.abnormal ? ` · ${t("nh_unexpected")}` : ""}{item.boot ? ` · ${causeText(item.boot.cause, t)}` : ""}
        {item.uptime_before_s !== undefined && <small className="muted"> · {fillAll(t("nh_up_before"), formatUptime(item.uptime_before_s, t))}</small>}
      </li>)}
    </ul>}
  </div>;
}
