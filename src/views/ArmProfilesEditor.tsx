/**
 * The editor of the arming modes (Away, Home, Night and the owner's own) in the Alarm panels menu, for an administrator: the name of each mode, what it behaves like, the delays, whether the
 * siren sounds, how loudly the server tells people and the zones that differ from their kind. The list is saved as a whole; editing a mode arms nothing and changes nothing on a panel
 * that is already armed. A mode never changes the PIN, the lockout or the smoke, panic and tamper zones (the node sees to that).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useState } from "react";
import { ApiError, saveArmProfiles, type ArmProfile, type ArmProfileZone, type ArmProfiles } from "../api";
import type { Translate } from "../components/camera";
import { cleaned, isReserved, MAX_PROFILES, newProfile, problemsOf, profileName, summaryOf } from "../armProfilesModel";

type Props = { t: Translate; origin: string; current: ArmProfiles; zones: Array<[string, string]>; onSaved: (saved: ArmProfiles) => void; onConflict: () => void };

const numberOrUndefined = (text: string): number | undefined => (text.trim() === "" ? undefined : Number(text));

export function ArmProfilesEditor({ t, origin, current, zones, onSaved, onConflict }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ArmProfile[]>(current.profiles);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setDraft(current.profiles); }, [current.revision, current.profiles]);
  const change = (id: string, patch: Partial<ArmProfile>) => { setMessage(null); setDraft(draft.map(item => item.id === id ? { ...item, ...patch } : item)); };
  const changeZone = (id: string, index: number, patch: Partial<ArmProfileZone>) =>
    change(id, { zones: (draft.find(item => item.id === id)?.zones ?? []).map((zone, at) => at === index ? { ...zone, ...patch } : zone) });
  const problems = problemsOf(draft.map(cleaned));
  const save = async () => {
    setBusy(true); setMessage(null);
    try { const saved = await saveArmProfiles(origin, draft.map(cleaned), current.revision); onSaved(saved); setMessage({ text: t("apm_saved"), bad: false }); }
    catch (error) {
      if (error instanceof ApiError && error.code === "conflict") { setMessage({ text: t("apm_conflict"), bad: true }); onConflict(); }
      else setMessage({ text: t("apm_invalid"), bad: true });
    }
    setBusy(false);
  };
  return <section className="solar-notice apm-card" data-tour="ap-modes" aria-label={t("apm_title")}>
    <div className="apm-head"><h4>{t("apm_title")}</h4>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? t("nh_hide") : t("apm_editor")}</button></div>
    <p className="muted small">{t("apm_help")}</p>
    <ul className="apm-summary">{current.profiles.map(item => <li key={item.id}><b>{profileName(item, t)}</b> <span className="muted">{summaryOf(item, t)}</span></li>)}</ul>
    {open && <div className="apm-editor">
      {draft.map(item => <fieldset key={item.id} className="apm-profile">
        <legend>{profileName(item, t)}</legend>
        <div className="apm-fields">
          <label>{t("apm_name")}<input value={item.name} maxLength={32} onChange={event => change(item.id, { name: event.target.value })} /></label>
          <label>{t("apm_base")}<select value={item.base} disabled={isReserved(item.id)} onChange={event => change(item.id, { base: event.target.value as "away" | "stay" })}>
            <option value="away">{t("apm_base_away")}</option><option value="stay">{t("apm_base_stay")}</option></select></label>
          <label>{t("apm_exit")}<input type="number" min={0} max={300} placeholder={t("apm_node_default")} value={item.exit_delay_s ?? ""} onChange={event => change(item.id, { exit_delay_s: numberOrUndefined(event.target.value) })} /></label>
          <label>{t("apm_entry")}<input type="number" min={0} max={300} placeholder={t("apm_node_default")} value={item.entry_delay_s ?? ""} onChange={event => change(item.id, { entry_delay_s: numberOrUndefined(event.target.value) })} /></label>
          <label className="apm-check"><input type="checkbox" checked={item.siren !== false} onChange={event => change(item.id, { siren: event.target.checked })} /> {t("apm_siren")}<small className="muted">{t("apm_siren_hint")}</small></label>
          <label>{t("apm_notify")}<select value={item.notify ?? "urgent"} onChange={event => change(item.id, { notify: event.target.value as "urgent" | "normal" })}>
            <option value="urgent">{t("apm_notify_urgent")}</option><option value="normal">{t("apm_notify_normal")}</option></select></label>
        </div>
        <h5>{t("apm_zones")}</h5>
        {(item.zones ?? []).map((zone, index) => <div key={index} className="apm-zone-row">
          <select value={zone.id} aria-label={t("apm_zone_pick")} onChange={event => changeZone(item.id, index, { id: event.target.value })}>
            <option value="">{t("apm_zone_pick")}</option>
            {zones.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            {zone.id && !zones.some(([id]) => id === zone.id) && <option value={zone.id}>{zone.id}</option>}
          </select>
          <label>{t("apm_zone_armed")}<select value={zone.armed === undefined ? "" : zone.armed ? "yes" : "no"} onChange={event => changeZone(item.id, index, { armed: event.target.value === "" ? undefined : event.target.value === "yes" })}>
            <option value="">{t("apm_zone_armed_default")}</option><option value="yes">{t("apm_zone_armed_yes")}</option><option value="no">{t("apm_zone_armed_no")}</option></select></label>
          <label>{t("apm_zone_delay")}<select value={zone.delay ?? ""} disabled={zone.armed === false} onChange={event => changeZone(item.id, index, { delay: event.target.value === "" ? undefined : event.target.value as "instant" | "entry" })}>
            <option value="">{t("apm_zone_delay_default")}</option><option value="instant">{t("apm_zone_delay_instant")}</option><option value="entry">{t("apm_zone_delay_entry")}</option></select></label>
          <button type="button" onClick={() => change(item.id, { zones: (item.zones ?? []).filter((_, at) => at !== index) })}>{t("apm_remove")}</button>
        </div>)}
        <div className="apm-actions">
          <button type="button" disabled={(item.zones ?? []).length >= 16} onClick={() => change(item.id, { zones: [...(item.zones ?? []), { id: "" }] })}>{t("apm_zone_add")}</button>
          {isReserved(item.id) ? <small className="muted">{t("apm_locked")}</small> : <button type="button" className="danger" onClick={() => { setMessage(null); setDraft(draft.filter(other => other.id !== item.id)); }}>{t("apm_remove")}</button>}
        </div>
      </fieldset>)}
      <div className="apm-actions">
        <button type="button" disabled={draft.length >= MAX_PROFILES} onClick={() => setDraft([...draft, newProfile(draft, t("apm_new_name"))])}>{t("apm_add")}</button>
        <button type="button" disabled={busy || problems.length > 0} onClick={() => void save()}>{t("apm_save")}</button>
      </div>
      {problems.length > 0 && <p className="muted small" role="status">{t("apm_invalid")}</p>}
    </div>}
    {message && <p className={`solar-notice ${message.bad ? "bad" : ""}`} role={message.bad ? "alert" : "status"}>{message.text}</p>}
  </section>;
}
