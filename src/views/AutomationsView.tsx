/**
 * The Automations menu: "when this happens, do that". Each automation is drawn as a sentence; the form builds one from a trigger
 * (a device reaching a state, an alarm, the mode), an optional mode limit and up to six actions.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState, type FormEvent } from "react";
import { ApiError, createAutomation, deleteAutomation, runAutomation, updateAutomation, type Automation, type AutomationAction, type AutomationInput, type StudioDevice, type Trigger } from "../api";
import { ACTUATOR_KINDS, MAIN_FIELD } from "../deviceKinds";
import type { Translate } from "../components/camera";
import "./alarms.css";
import { MenuTitle } from "../menuLogos";

type Props = { t: Translate; origin: string; automations: Automation[]; reload: () => void; devices: StudioDevice[]; now: number };

const stateWord = (field: string, value: boolean | number, t: Translate): string =>
  field === "open" ? t(value ? "state_open" : "state_closed") : field === "locked" ? t(value ? "state_locked" : "state_unlocked") : field === "triggered" ? t(value ? "problem_triggered" : "state_clear") : t(value ? "state_on" : "state_off");
const commandWord = (kind: StudioDevice["kind"] | undefined, command: string, t: Translate): string =>
  command === "toggle" ? t("cmdToggle") : kind === "lock" ? t(command === "on" ? "cmdLock" : "cmdUnlock") : kind === "valve" ? t(command === "on" ? "cmdOpen" : "cmdClose") : t(command === "on" ? "cmdOn" : "cmdOff");

const blank = (): AutomationInput & { id?: string } => ({ name: "", enabled: true, trigger: { type: "device", device_id: "", field: "triggered", equals: true }, when_mode: "any", actions: [{ type: "device", device_id: "", command: "on" }] });

export function AutomationsView({ t, origin, automations, reload, devices, now }: Props) {
  const [form, setForm] = useState<(AutomationInput & { id?: string }) | null>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean }>({ text: "", bad: false });
  const say = (text: string, bad = false) => setMessage({ text, bad });
  const explain = (error: unknown) => { const key = `autoErr_${error instanceof ApiError ? error.code : "generic"}`, text = t(key); say(text === key ? t("autoErr_generic") : text, true); };
  const byId = (id: string) => devices.find(device => device.id === id);
  const binary = devices.filter(device => MAIN_FIELD[device.kind]);
  const actuators = devices.filter(device => ACTUATOR_KINDS.includes(device.kind));

  const describeTrigger = (trigger: Trigger): string => {
    if (trigger.type === "device") { const device = byId(trigger.device_id); return `${device?.name ?? trigger.device_id} ${t("becomes")} ${stateWord(trigger.field, trigger.equals, t)}`; }
    if (trigger.type === "mode") return t(trigger.mode === "armed" ? "modeArmedNotice" : "modeDisarmedNotice");
    const parts = [t("trigger_alarm")];
    if (trigger.severity) parts.push(t(`severity_${trigger.severity}`));
    if (trigger.source_type) parts.push(t(trigger.source_type === "node" ? "sourceNode" : trigger.source_type === "camera" ? "sourceCamera" : "sourceDevice"));
    if (trigger.source_id) parts.push(byId(trigger.source_id)?.name ?? trigger.source_id);
    return parts.join(" · ");
  };
  const describeAction = (action: AutomationAction): string => {
    if (action.type === "notify") return t("actionNotify");
    const device = byId(action.device_id);
    return `${device?.name ?? action.device_id}: ${commandWord(device?.kind, action.command, t)}${action.for_s ? ` (${action.for_s} s)` : ""}`;
  };
  const modeWord = (mode: Automation["when_mode"]) => t(mode === "any" ? "modeAny" : mode === "armed" ? "modeOnlyArmed" : "modeOnlyDisarmed");

  const act = async (work: () => Promise<unknown>, done?: string) => { try { await work(); if (done) say(done); reload(); } catch (error) { explain(error); } };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    const { id, ...input } = form;
    try { if (id) await updateAutomation(origin, id, input); else await createAutomation(origin, input); say(t("automationSaved")); setForm(null); reload(); }
    catch (error) { explain(error); }
  };

  // ---- templates: an example filled in from the devices that exist ----
  const template = (which: "smoke" | "intrusion" | "door") => {
    const siren = actuators.find(device => device.kind === "siren") ?? actuators[0], light = actuators.find(device => device.kind === "smart_light") ?? actuators[0];
    if (which === "smoke") {
      const sensor = devices.find(device => device.kind === "smoke") ?? devices.find(device => device.kind === "co" || device.kind === "gas");
      setForm({ name: t("template_smoke"), enabled: true, when_mode: "any", trigger: { type: "device", device_id: sensor?.id ?? "", field: "triggered", equals: true }, actions: [{ type: "device", device_id: siren?.id ?? "", command: "on" }, { type: "notify" }] });
    } else if (which === "intrusion") {
      setForm({ name: t("template_intrusion"), enabled: true, when_mode: "armed", trigger: { type: "alarm", severity: "high" }, actions: [{ type: "device", device_id: light?.id ?? "", command: "on", for_s: 300 }] });
    } else {
      const sensor = devices.find(device => device.kind === "door") ?? devices.find(device => device.kind === "window");
      setForm({ name: t("template_door"), enabled: true, when_mode: "armed", trigger: { type: "device", device_id: sensor?.id ?? "", field: "open", equals: true }, actions: [{ type: "notify" }] });
    }
  };

  const setTrigger = (trigger: Trigger) => setForm(current => current && { ...current, trigger });
  const setAction = (index: number, action: AutomationAction) => setForm(current => current && { ...current, actions: (current.actions ?? []).map((item, i) => i === index ? action : item) });
  const trigger = form?.trigger;

  return <section className="automations-view">
    <header className="devices-head">
      <MenuTitle kind="automations"><p className="eyebrow">{t("automationsTitle")}</p><h2>{t("automations")}</h2><p className="muted">{t("automationsHelp")}</p></MenuTitle>
      <div className="devices-stats"><button className="primary" onClick={() => setForm(blank())}>{t("newAutomation")}</button></div>
    </header>
    {message.text && <p className={`notice devices-notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}

    {form && <form className="automation-form stack-card" onSubmit={event => void save(event)}>
      <h3>{form.id ? t("editAutomation") : t("newAutomation")}</h3>
      {!form.id && <div className="template-row"><small className="muted">{t("templates")}:</small>{(["smoke", "intrusion", "door"] as const).map(item => <button type="button" key={item} onClick={() => template(item)}>{t(`template_${item}`)}</button>)}</div>}
      <label>{t("automationName")}<input value={form.name ?? ""} maxLength={80} required onChange={event => setForm({ ...form, name: event.target.value })} /></label>

      <div className="automation-row">
        <span className="step">{t("whenLabel")}</span>
        <label>{t("whenLabel")}<select value={trigger?.type} onChange={event => setTrigger(event.target.value === "device" ? { type: "device", device_id: binary[0]?.id ?? "", field: MAIN_FIELD[binary[0]?.kind ?? "door"] ?? "open", equals: true } : event.target.value === "alarm" ? { type: "alarm" } : { type: "mode", mode: "armed" })}>
          <option value="device">{t("trigger_device")}</option><option value="alarm">{t("trigger_alarm")}</option><option value="mode">{t("trigger_mode")}</option></select></label>
        {trigger?.type === "device" && <>
          <label>{t("devices")}<select value={trigger.device_id} onChange={event => { const device = byId(event.target.value); setTrigger({ ...trigger, device_id: event.target.value, field: MAIN_FIELD[device?.kind ?? "door"] ?? trigger.field }); }}>
            <option value="">{t("chooseDevice")}</option>{binary.map(device => <option key={device.id} value={device.id}>{device.name}</option>)}</select></label>
          <label>{t("becomes")}<select value={String(trigger.equals)} onChange={event => setTrigger({ ...trigger, equals: event.target.value === "true" })}><option value="true">{stateWord(trigger.field, true, t)}</option><option value="false">{stateWord(trigger.field, false, t)}</option></select></label>
        </>}
        {trigger?.type === "alarm" && <>
          <label>{t("anySeverity")}<select value={trigger.severity ?? ""} onChange={event => setTrigger({ ...trigger, severity: (event.target.value || undefined) as Trigger extends { severity?: infer S } ? S : never })}><option value="">{t("anySeverity")}</option>{(["critical", "high", "warning"] as const).map(item => <option key={item} value={item}>{t(`severity_${item}`)}</option>)}</select></label>
          <label>{t("anySource")}<select value={trigger.source_type ?? ""} onChange={event => setTrigger({ ...trigger, source_type: (event.target.value || undefined) as "node" | "camera" | "device" | undefined })}><option value="">{t("anySource")}</option><option value="node">{t("sourceNode")}</option><option value="camera">{t("sourceCamera")}</option><option value="device">{t("sourceDevice")}</option></select></label>
        </>}
        {trigger?.type === "mode" && <label>{t("trigger_mode")}<select value={trigger.mode} onChange={event => setTrigger({ type: "mode", mode: event.target.value as "armed" | "disarmed" })}><option value="armed">{t("modeArmedNotice")}</option><option value="disarmed">{t("modeDisarmedNotice")}</option></select></label>}
      </div>
      <div className="automation-row">
        <span className="step">{t("andModeLabel")}</span>
        <label>{t("andModeLabel")}<select value={form.when_mode ?? "any"} onChange={event => setForm({ ...form, when_mode: event.target.value as Automation["when_mode"] })}><option value="any">{t("modeAny")}</option><option value="armed">{t("modeOnlyArmed")}</option><option value="disarmed">{t("modeOnlyDisarmed")}</option></select></label>
      </div>
      {(form.actions ?? []).map((action, index) => <div className="automation-row" key={index}>
        <span className="step">{index === 0 ? t("thenLabel") : "+"}</span>
        <label>{t("thenLabel")}<select value={action.type} onChange={event => setAction(index, event.target.value === "notify" ? { type: "notify" } : { type: "device", device_id: actuators[0]?.id ?? "", command: "on" })}><option value="device">{t("actionDevice")}</option><option value="notify">{t("actionNotify")}</option></select></label>
        {action.type === "device" && <>
          <label>{t("devices")}<select value={action.device_id} onChange={event => setAction(index, { ...action, device_id: event.target.value })}><option value="">{t("chooseDevice")}</option>{actuators.map(device => <option key={device.id} value={device.id}>{device.name}</option>)}</select></label>
          <label>{t("cmdToggle")}<select value={action.command} onChange={event => setAction(index, { ...action, command: event.target.value as "on" | "off" | "toggle", ...(event.target.value === "toggle" ? { for_s: undefined } : {}) })}>
            {(["on", "off", "toggle"] as const).filter(item => item !== "toggle" || !["siren", "lock", "valve"].includes(byId(action.device_id)?.kind ?? "")).map(item => <option key={item} value={item}>{commandWord(byId(action.device_id)?.kind, item, t)}</option>)}</select></label>
          {action.command !== "toggle" && <label>{t("forSeconds")}<input type="number" min={0} max={3600} value={action.for_s ?? 0} onChange={event => setAction(index, { ...action, for_s: Math.max(0, Number(event.target.value) || 0) || undefined })} /></label>}
        </>}
        {(form.actions ?? []).length > 1 && <button type="button" className="danger-button" onClick={() => setForm({ ...form, actions: (form.actions ?? []).filter((_, i) => i !== index) })} title={t("removeAction")}>−</button>}
      </div>)}
      {(form.actions ?? []).length < 6 && <button type="button" className="link-button" onClick={() => setForm({ ...form, actions: [...(form.actions ?? []), { type: "notify" }] })}>+ {t("addAction")}</button>}
      <div className="users-actions"><button className="primary" type="submit" disabled={!(form.name ?? "").trim()}>{t("saveAutomation")}</button><button type="button" onClick={() => setForm(null)}>{t("cancel")}</button></div>
    </form>}

    {automations.length === 0 && !form && <div className="devices-empty"><h3>{t("noAutomations")}</h3><div className="template-row">{(["smoke", "intrusion", "door"] as const).map(item => <button type="button" key={item} onClick={() => template(item)}>{t(`template_${item}`)}</button>)}</div></div>}
    <div className="automation-list">
      {automations.map(automation => <article key={automation.id} className={`automation-card ${automation.enabled ? "" : "off"}`}>
        <h3><button className={`switch ${automation.enabled ? "on" : ""}`} role="switch" aria-checked={automation.enabled} aria-label={automation.enabled ? t("automationEnabled") : t("automationDisabled")} onClick={() => void act(() => updateAutomation(origin, automation.id, { enabled: !automation.enabled }))} />{automation.name}</h3>
        <div className="automation-sentence">
          <span><b>{t("whenLabel")}</b>{describeTrigger(automation.trigger)}</span>
          {automation.when_mode !== "any" && <span><b>{t("andModeLabel")}</b><em>{modeWord(automation.when_mode)}</em></span>}
          {automation.actions.map((action, index) => <span key={index}><b>{index === 0 ? t("thenLabel") : "+"}</b>{describeAction(action)}</span>)}
        </div>
        <div className="automation-meta"><span>{t("lastRun")}: {automation.last_run ? `${Math.max(0, Math.round((now - Date.parse(automation.last_run)) / 1000))} s` : t("neverRun")}</span><span>{automation.runs} {t("runsTotal")}</span></div>
        <div className="automation-actions">
          <button onClick={() => void act(() => runAutomation(origin, automation.id), t("runNowDone"))}>{t("runNow")}</button>
          <button onClick={() => setForm({ id: automation.id, name: automation.name, enabled: automation.enabled, trigger: automation.trigger, when_mode: automation.when_mode, actions: automation.actions })}>{t("editUser")}</button>
          <button className="danger-button" onClick={() => { if (window.confirm(t("confirmDeleteAutomation"))) void act(() => deleteAutomation(origin, automation.id), t("automationDeleted")); }}>{t("deleteUser")}</button>
        </div>
      </article>)}
    </div>
  </section>;
}
