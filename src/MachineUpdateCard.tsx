/**
 * Configuration > Updates > Programs of the machine, from the phone: whether the switch that lets administrators check and update the programs of this machine from the phone apps is on
 * (the server's and the maintenance helper's), why not when it is off, how it is turned on, the programs the helper can update and the latest activity of the audit trail. The switch lives in
 * the environment of the server and of the helper: this card only shows it and explains it, it never changes it. The update itself is done from the apps; see ARMOR-SERVER
 * src/routes/machine_update.ts.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useState } from "react";
import { readAudit, readMachineUpdate, type AuditEntry, type MachineUpdateInfo } from "./api";

type Props = { t: (key: string) => string; origin: string };

/** The reasons the server can give for the switch being off; anything else says the update is not available. */
export const MACHINE_UPDATE_REASONS = ["switched_off", "not_configured", "agent_switched_off", "not_answering", "refused"] as const;
const ACTIONS = ["machine_update.preview", "machine_update.apply"] as const;
/** The lines of the audit trail (the server sends the newest first) that belong to this feature, at most `limit`. */
export function machineUpdateActivity(entries: readonly AuditEntry[], limit = 8): AuditEntry[] {
  return entries.filter(entry => (ACTIONS as readonly string[]).includes(entry.action)).slice(0, limit);
}
export const machineUpdateReasonKey = (reason: string | undefined): string =>
  reason !== undefined && (MACHINE_UPDATE_REASONS as readonly string[]).includes(reason) ? `mu_reason_${reason}` : "mu_reason_generic";

export function MachineUpdateCard({ t, origin }: Props) {
  const [info, setInfo] = useState<MachineUpdateInfo | null | undefined>(undefined);   // undefined: reading; null: could not be read
  const [activity, setActivity] = useState<AuditEntry[]>([]);
  const load = useCallback(async () => {
    try { setInfo(await readMachineUpdate(origin)); } catch { setInfo(null); }
    try { setActivity(machineUpdateActivity((await readAudit(origin, 200)).entries)); } catch { setActivity([]); }
  }, [origin]);
  useEffect(() => { void load(); }, [load]);
  if (info === undefined) return null;
  return <article className="stack-card mt-auto" data-testid="machine-update-card">
    <h3>{t("mu_title")}</h3>
    <p className="muted">{t("mu_help")}</p>
    {info === null ? <p className="notice" role="alert">{t("mu_unreadable")}</p> : <>
      <p className={info.enabled ? "notice" : "notice bad"} role="status" data-testid="machine-update-state"><b>{t(info.enabled ? "mu_state_on" : "mu_state_off")}</b>{!info.enabled && <> {t(machineUpdateReasonKey(info.reason))}</>}</p>
      {!info.enabled && <><h4>{t("mu_how_title")}</h4><p className="muted">{t("mu_how")}</p></>}
      {info.enabled && <>
        <h4>{t("mu_projects")}</h4>
        {(info.projects ?? []).length === 0 ? <p className="muted">{t("mu_no_projects")}</p> : <ul>{(info.projects ?? []).map(name => <li key={name}><code>{name}</code></li>)}</ul>}
        <p className={info.require_signed === false ? "notice bad" : "muted"}>{t(info.require_signed === false ? "mu_unsigned" : "mu_signed")}</p>
      </>}
    </>}
    <h4>{t("mu_activity")}</h4>
    {activity.length === 0 ? <p className="muted">{t("mu_activity_none")}</p>
      : <ul className="mt-history" data-testid="machine-update-activity">{activity.map((entry, index) => <li key={`${entry.at}-${index}`} className={entry.outcome === "allowed" ? "done" : "failed"}>
        <span>{entry.at}</span><span>{entry.actor ?? "-"} {t(entry.action.endsWith("apply") ? "mu_act_apply" : "mu_act_preview")} <code>{entry.target ?? ""}</code></span><span>{t(`mu_out_${entry.outcome}`)}</span></li>)}</ul>}
    <div className="mt-buttons"><button onClick={() => void load()}>{t("mu_refresh")}</button></div>
  </article>;
}
