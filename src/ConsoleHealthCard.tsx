/**
 * Configuration > Diagnostics: how the console's own calls to the server are doing (calls a minute, refusals, server errors, calls that got no answer, and the slowest routes), measured
 * here in the browser by the one function every call goes through. Nothing is sent anywhere: a person helping from afar can ask for the copied text.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useState } from "react";
import { callReport, clearCalls, summarizeCalls, type CallSummary } from "./callStats";
import type { Translate } from "./components/camera";

export function ConsoleHealthCard({ t }: { t: Translate }) {
  const [summary, setSummary] = useState<CallSummary>(() => summarizeCalls());
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setSummary(summarizeCalls()), 3000);
    return () => window.clearInterval(timer);
  }, []);
  const copy = async () => {
    try { await navigator.clipboard.writeText(callReport(summary)); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); }
  };
  return <article className="stack-card" data-testid="ch-card">
    <h3>{t("ch_title")}</h3>
    <p className="muted">{t("ch_help")}</p>
    <p data-testid="ch-line">{t("ch_summary").replace("{0}", String(summary.lastMinute)).replace("{1}", String(summary.clientErrors)).replace("{2}", String(summary.serverErrors)).replace("{3}", String(summary.failures))}</p>
    {summary.routes.length === 0 ? <p className="muted">{t("ch_none")}</p> : <div className="dg-table-wrap"><table className="dg-tokens">
      <thead><tr><th>{t("ch_route")}</th><th>{t("ch_calls")}</th><th>{t("ch_refused")}</th><th>{t("ch_errors")}</th><th>{t("ch_noanswer")}</th><th>{t("ch_avg")}</th><th>{t("ch_max")}</th></tr></thead>
      <tbody>{summary.routes.map(item => <tr key={`${item.method} ${item.route}`}>
        <td className="mono">{item.method} {item.route}</td><td>{item.calls}</td><td>{item.clientErrors}</td><td>{item.serverErrors}</td><td>{item.failures}</td><td>{item.avgMs} ms</td><td>{item.maxMs} ms</td>
      </tr>)}</tbody>
    </table></div>}
    <div className="adm-foot">
      <button type="button" onClick={() => void copy()}>{copied ? t("ch_copied") : t("ch_copy")}</button>{" "}
      <button type="button" onClick={() => { clearCalls(); setSummary(summarizeCalls()); }}>{t("ch_clear")}</button>
    </div>
  </article>;
}
