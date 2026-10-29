/**
 * The check before arming: asks the server what would leave the perimeter blind or noisy (a radar that does not answer, a silent panel, an open zone, a camera that is down, an open door or
 * window, an alarm nobody has seen) and shows it before the person arms. Blocking findings change the button into "Arm anyway"; nothing is armed until the person confirms.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useState } from "react";
import "./preflight.css";
import { readPreflight, type Preflight, type PreflightIssue } from "../api";
import { DialogLogo } from "../menuLogos";

type Names = { cameras: ReadonlyArray<{ id: string; name?: string }>; devices: ReadonlyArray<{ id: string; name: string }> };

const fill = (template: string, values: ReadonlyArray<string>): string => template.replace(/\{(\d+)\}/g, (_m, index: string) => values[Number(index)] ?? "");

export function describeIssue(issue: PreflightIssue, t: (key: string) => string, names: Names): string {
  const label = issue.kind === "camera" ? names.cameras.find(item => item.id === issue.id)?.name ?? issue.id
    : issue.kind === "device" ? names.devices.find(item => item.id === issue.id)?.name ?? issue.id : issue.id;
  return fill(t(`pre_${issue.code}`), [label, issue.detail ?? ""]);
}

export function PreflightDialog({ origin, names, confirm, cancel, infoOnly = false, t }: { origin: string; names: Names; confirm: () => void; cancel: () => void; /** Only look: no arm button, just close. */ infoOnly?: boolean; t: (key: string) => string }) {
  const [result, setResult] = useState<Preflight | null | "failed">(null);
  useEffect(() => {
    let alive = true;
    readPreflight(origin).then(value => { if (alive) setResult(value); }, () => { if (alive) setResult("failed"); });
    return () => { alive = false; };
  }, [origin]);
  const ok = result !== null && result !== "failed" && result.ready;
  const issues = result !== null && result !== "failed" ? result.issues : [];
  return <div className="modal-backdrop" role="presentation" onMouseDown={cancel} onKeyDown={event => { if (event.key === "Escape") cancel(); }}>
    <section className="about-dialog confirm-dialog preflight-dialog" role="alertdialog" aria-modal="true" aria-labelledby="pre-title" onMouseDown={event => event.stopPropagation()}>
      <h2 id="pre-title"><DialogLogo kind="system" />{t("pre_title")}</h2>
      {result === null && <p className="muted">{t("pre_checking")}</p>}
      {result === "failed" && <p className="muted">{t("pre_unavailable")}</p>}
      {ok && <p className="pre-ok">✓ {t("pre_ready")}</p>}
      {issues.length > 0 && <ul className="pre-list">{issues.map((issue, index) => <li key={`${issue.code}-${issue.id}-${issue.detail ?? ""}-${index}`} className={issue.level}>
        <span aria-hidden="true">{issue.level === "block" ? "⛔" : "⚠"}</span><span>{describeIssue(issue, t, names)}</span></li>)}</ul>}
      {infoOnly ? <div className="confirm-actions"><button className="primary" onClick={cancel} autoFocus>{t("close")}</button></div> : <div className="confirm-actions">
        <button onClick={cancel}>{t("cancelAction")}</button>
        <button className={ok ? "primary" : "danger"} onClick={confirm} disabled={result === null} autoFocus>{ok || result === "failed" ? t("armSystem") : t("pre_arm_anyway")}</button>
      </div>}
    </section>
  </div>;
}
