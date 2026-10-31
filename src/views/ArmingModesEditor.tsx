/**
 * The arming modes in the Alarm Designer: what Home and Night defend (whole zones, single sensors, radar nodes and cameras), the exit and entry delays of each mode and the timetable that
 * changes the mode by itself. Home and Night start with nothing. The document is saved as a whole with the revision that was read (another change in between is a conflict); editing
 * arms nothing. Only an administrator saves; everybody else reads.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useMemo, useState } from "react";
import "./arming-modes.css";
import { ApiError, saveArmingModes, type ArmedMode, type ArmingModesDocument, type ArmingModesState } from "../api";
import type { Translate } from "../components/camera";
import { ASSIGNABLE, MAX_SCHEDULE, cleanedDocument, defendsRef, modeName, problemsOf, refOf, toggleRef, unknownRefs, type RefKind, type Universe } from "../armingModesModel";

type Props = { t: Translate; origin: string; current: ArmingModesState; universe: Universe; isAdmin: boolean; onSaved: (saved: ArmingModesState) => void; onConflict: () => void };
type Definition = { defends?: string[]; entry?: string[]; exit_delay_s?: number; entry_delay_s?: number };

const numberOrUndefined = (text: string): number | undefined => (text.trim() === "" ? undefined : Number(text));
const documentOf = (state: ArmingModesState): ArmingModesDocument => ({ modes: state.modes, schedule: state.schedule });

export function ArmingModesEditor({ t, origin, current, universe, isAdmin, onSaved, onConflict }: Props) {
  const [draft, setDraft] = useState<ArmingModesDocument>(documentOf(current));
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDraft(documentOf(current)); }, [current.revision]);   // eslint-disable-line react-hooks/exhaustive-deps
  const problems = useMemo(() => problemsOf(cleanedDocument(draft), current.max_schedule), [draft, current.max_schedule]);
  const edit = (next: ArmingModesDocument) => { setMessage(null); setDraft(next); };
  const definitionOf = (mode: ArmedMode): Definition => draft.modes[mode] as Definition;
  const patchMode = (mode: ArmedMode, patch: Definition) => edit({ ...draft, modes: { ...draft.modes, [mode]: { ...definitionOf(mode), ...patch } } });
  const schedule = draft.schedule ?? [];
  const patchEntry = (index: number, patch: Partial<(typeof schedule)[number]>) => edit({ ...draft, schedule: schedule.map((entry, at) => at === index ? { ...entry, ...patch } : entry) });
  const save = async () => {
    setBusy(true); setMessage(null);
    try { const saved = await saveArmingModes(origin, cleanedDocument(draft), current.revision); onSaved(saved); setMessage({ text: t("am_ed_saved"), bad: false }); }
    catch (error) {
      if (error instanceof ApiError && error.code === "conflict") { setMessage({ text: t("am_ed_conflict"), bad: true }); onConflict(); }
      else if (error instanceof ApiError && error.status === 403) setMessage({ text: t("am_ed_forbidden"), bad: true });
      else setMessage({ text: t("am_ed_failed"), bad: true });
    }
    setBusy(false);
  };

  const groups: Array<{ kind: RefKind; title: string; items: Array<{ id: string; label: string }> }> = [
    { kind: "zone", title: t("am_ed_zones"), items: universe.zones.map(zone => ({ id: zone, label: zone })) },
    { kind: "device", title: t("am_ed_devices"), items: universe.devices.map(device => ({ id: device.id, label: device.location ? `${device.name} (${device.location})` : device.name })) },
    { kind: "node", title: t("am_ed_nodes"), items: universe.nodes.map(node => ({ id: node, label: node })) },
    { kind: "camera", title: t("am_ed_cameras"), items: universe.cameras.map(camera => ({ id: camera.id, label: camera.name })) },
  ];
  return <div className="am-editor" data-testid="arming-modes-editor">
    <h4>{t("am_ed_title")}</h4>
    <p className="ed-note">{t("am_ed_help")}</p>
    {!current.enabled && <p className="ed-note warn" role="status">{t("am_ed_off")}</p>}
    {!isAdmin && <p className="ed-note" role="status">{t("am_ed_readonly")}</p>}
    <fieldset disabled={!isAdmin || busy} className="am-fields">
      <fieldset className="am-mode" data-testid="arming-mode-def-away">
        <legend>{modeName("away", t)}</legend>
        <p className="ed-note">{t("am_ed_away_all")}</p>
        <DelayFields t={t} definition={definitionOf("away")} onChange={patch => patchMode("away", patch)} />
      </fieldset>
      {ASSIGNABLE.map(mode => {
        const definition = definitionOf(mode);
        const lost = unknownRefs(definition.defends, universe);
        return <fieldset key={mode} className="am-mode" data-testid={`arming-mode-def-${mode}`}>
          <legend>{modeName(mode, t)} <small className="muted">{(definition.defends ?? []).length ? t("am_ed_count").replace("{0}", String((definition.defends ?? []).length)) : ""}</small></legend>
          {(definition.defends ?? []).length === 0 && <p className="ed-note warn">{t("am_ed_empty")}</p>}
          {groups.map(group => <details key={group.kind} open={group.kind === "zone"}>
            <summary>{group.title}</summary>
            {group.items.length === 0 ? <p className="ed-note">{t("am_ed_none_known")}</p> : group.items.map(item => {
              const reference = refOf(group.kind, item.id);
              const marked = defendsRef(definition.defends, reference);
              const waits = defendsRef(definition.entry, reference);
              return <div key={reference} className="am-row">
                <label><input type="checkbox" checked={marked} data-testid={`arming-ref-${mode}-${reference}`}
                  onChange={() => patchMode(mode, { defends: toggleRef(definition.defends, reference), ...(marked ? { entry: (definition.entry ?? []).filter(other => other.toLowerCase() !== reference.toLowerCase()) } : {}) })} /> {item.label}</label>
                {marked && group.kind === "device" && <label className="am-entry"><input type="checkbox" checked={waits} onChange={() => patchMode(mode, { entry: toggleRef(definition.entry, reference) })} /> {t("am_ed_entry")}</label>}
              </div>;
            })}
          </details>)}
          {lost.length > 0 && <div className="am-lost"><p className="ed-note warn">{t("am_ed_unknown")}</p>
            {lost.map(reference => <div key={reference} className="am-row"><code>{reference}</code> <button type="button"
              onClick={() => patchMode(mode, { defends: (definition.defends ?? []).filter(other => other !== reference), entry: (definition.entry ?? []).filter(other => other !== reference) })}>{t("am_ed_remove_unknown")}</button></div>)}</div>}
          <DelayFields t={t} definition={definition} onChange={patch => patchMode(mode, patch)} />
        </fieldset>;
      })}
      <fieldset className="am-mode" data-testid="arming-mode-schedule">
        <legend>{t("am_ed_schedule")}</legend>
        <p className="ed-note">{t("am_ed_schedule_help")}</p>
        {schedule.map((entry, index) => <div key={index} className="am-schedule-row">
          <label>{t("am_ed_schedule_mode")}<select value={entry.mode} onChange={event => patchEntry(index, { mode: event.target.value as ArmedMode })}>
            {(["away", "home", "night"] as const).map(mode => <option key={mode} value={mode}>{modeName(mode, t)}</option>)}</select></label>
          <label>{t("am_ed_schedule_at")}<input type="time" value={entry.at} onChange={event => patchEntry(index, { at: event.target.value })} /></label>
          <div className="am-days" role="group" aria-label={t("am_ed_schedule_days")}>{[1, 2, 3, 4, 5, 6, 7].map(day => <label key={day}><input type="checkbox" checked={entry.days.includes(day)}
            onChange={() => patchEntry(index, { days: entry.days.includes(day) ? entry.days.filter(other => other !== day) : [...entry.days, day].sort((a, b) => a - b) })} /> {t(`am_day_${day}`)}</label>)}</div>
          <button type="button" onClick={() => edit({ ...draft, schedule: schedule.filter((_, at) => at !== index) })}>{t("am_ed_remove")}</button>
        </div>)}
        <button type="button" disabled={schedule.length >= Math.min(MAX_SCHEDULE, current.max_schedule)}
          onClick={() => edit({ ...draft, schedule: [...schedule, { mode: "home", days: [1, 2, 3, 4, 5, 6, 7], at: "22:00" }] })}>{t("am_ed_schedule_add")}</button>
      </fieldset>
    </fieldset>
    {problems.length > 0 && <ul className="ed-note warn" role="status">{problems.map(problem => <li key={problem}>{t(`am_problem_${problem}`)}</li>)}</ul>}
    {isAdmin && <button type="button" className="primary" disabled={busy || problems.length > 0} data-testid="arming-modes-save" onClick={() => void save()}>{t("am_ed_save")}</button>}
    {message && <p className={`ed-note ${message.bad ? "bad" : ""}`} role={message.bad ? "alert" : "status"}>{message.text}</p>}
  </div>;
}

function DelayFields({ t, definition, onChange }: { t: Translate; definition: Definition; onChange: (patch: Definition) => void }) {
  return <div className="am-delays">
    <label>{t("am_ed_exit_delay")}<input type="number" min={0} max={300} value={definition.exit_delay_s ?? ""} onChange={event => onChange({ exit_delay_s: numberOrUndefined(event.target.value) })} /></label>
    <label>{t("am_ed_entry_delay")}<input type="number" min={0} max={300} value={definition.entry_delay_s ?? ""} onChange={event => onChange({ entry_delay_s: numberOrUndefined(event.target.value) })} /></label>
  </div>;
}
