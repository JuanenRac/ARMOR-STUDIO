/**
 * The Devices menu: every sensor and actuator besides the cameras and radars. Cards coloured by kind with their live state, commands for
 * the ones that can be switched, a form to add or edit one (with presets for common ecosystems), and a way to try it out by hand.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useMemo, useState, type FormEvent } from "react";
import { ApiError, commandDevice, createDevice, deleteDevice, setDeviceState, updateDevice, type DeviceKind, type DeviceProtocol, type DeviceRisk, type StudioDevice } from "../api";
import {
  ACTUATOR_KINDS, ago, ALARM_KIND, applyPreset, describeState, deviceProblem, KIND_COLOUR, KindIcon, MAIN_FIELD, mapToText, PRESETS, PROTOCOLS, slug, textToMap, SENSOR_KINDS, type PresetId, type PresetResult,
} from "../deviceKinds";
import type { Translate } from "../components/camera";
import "./devices.css";
import { MenuTitle } from "../menuLogos";

type Props = { t: Translate; origin: string; devices: StudioDevice[]; reload: () => void; placedIds: ReadonlySet<string>; onPlace: (id: string) => void; now: number };
type Filter = "all" | "sensor" | "actuator" | "problem";

type Form = {
  id: string; name: string; kind: DeviceKind; protocol: DeviceProtocol; location: string; preset: PresetId; presetName: string; host: string; interval: string; risk: string;
  advanced: boolean; connection: PresetResult | null; mapText: string; urlOn: string; urlOff: string; urlToggle: string; touched: boolean;
};
const emptyForm = (): Form => ({ id: "", name: "", kind: "door", protocol: "zigbee", location: "", preset: "zigbee2mqtt", presetName: "", host: "", interval: "0", risk: "", advanced: false, connection: null, mapText: "", urlOn: "", urlOff: "", urlToggle: "", touched: false });

export function DevicesView({ t, origin, devices, reload, placedIds, onPlace, now }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ text: string; bad: boolean }>({ text: "", bad: false });
  const [form, setForm] = useState<Form | null>(null);
  const say = (text: string, bad = false) => setMessage({ text, bad });
  const explain = (error: unknown) => {
    const code = error instanceof ApiError ? error.code : "generic", key = `deviceErr_${code}`, text = t(key);
    say(text === key ? t("deviceErr_generic") : text, true);
  };

  const shown = useMemo(() => devices.filter(device => {
    if (filter === "sensor" && device.category !== "sensor") return false;
    if (filter === "actuator" && device.category !== "actuator") return false;
    if (filter === "problem" && !deviceProblem(device)) return false;
    const needle = search.trim().toLowerCase();
    return !needle || `${device.name} ${device.location} ${t(`kind_${device.kind}`)} ${device.id}`.toLowerCase().includes(needle);
  }), [devices, filter, search, t]);
  const online = devices.filter(device => device.online).length, problems = devices.filter(device => deviceProblem(device)).length;

  /** Sends a command; a circuit of the board (or a critical one) asks first, and the server insists on it. */
  const switchDevice = (device: StudioDevice, command: "on" | "off" | "toggle") => {
    if (device.risk !== "low" && !window.confirm(t(device.risk === "critical" ? "confirmCritical" : "confirmCircuit"))) return Promise.resolve(undefined);
    return commandDevice(origin, device.id, command, device.risk !== "low");
  };
  const act = async (work: () => Promise<unknown>, done?: string) => { try { await work(); if (done) say(done); reload(); } catch (error) { explain(error); } };

  // ---- the form ----
  const open = (device?: StudioDevice) => {
    if (!device) { setForm(emptyForm()); return; }
    const mqtt = device.source.type === "mqtt" ? device.source : undefined;
    setForm({
      ...emptyForm(), id: device.id, name: device.name, kind: device.kind, protocol: device.protocol, location: device.location, interval: String(device.expected_interval_s), risk: device.risk === defaultRiskOf(device.kind) ? "" : device.risk,
      preset: mqtt ? "native" : "push", presetName: device.id, advanced: false, connection: null, mapText: mapToText(mqtt?.map), touched: false,
    });
  };
  const edit = (patch: Partial<Form>, connection = false) => setForm(current => current ? { ...current, ...patch, ...(connection ? { touched: true, connection: null } : {}) } : current);
  const generated = (f: Form): PresetResult => applyPreset(f.preset, f.kind, f.presetName || slug(f.name), f.host);
  const currentConnection = (f: Form): PresetResult => f.connection ?? generated(f);
  const openAdvanced = () => setForm(current => {
    if (!current) return current;
    const base = currentConnection(current), http = base.commands.http;
    return { ...current, advanced: true, connection: base, mapText: mapToText(base.source.type === "mqtt" ? base.source.map : undefined), urlOn: http?.on ?? "", urlOff: http?.off ?? "", urlToggle: http?.toggle ?? "", touched: true };
  });
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    const interval = Math.max(0, Math.round(Number(form.interval) || 0));
    const input: Parameters<typeof createDevice>[1] = { name: form.name.trim(), kind: form.kind, protocol: form.protocol, location: form.location.trim(), expected_interval_s: interval, ...(form.risk ? { risk: form.risk as DeviceRisk } : {}) };
    if (!form.id || form.touched) {
      const base = currentConnection(form);
      const source = base.source.type === "mqtt" ? { ...base.source, map: form.advanced ? textToMap(form.mapText) : base.source.map } : base.source;
      const commands = { ...base.commands };
      if (form.advanced && (form.urlOn || form.urlOff || form.urlToggle)) commands.http = { ...(form.urlOn ? { on: form.urlOn } : {}), ...(form.urlOff ? { off: form.urlOff } : {}), ...(form.urlToggle ? { toggle: form.urlToggle } : {}) };
      input.source = source; input.commands = commands; if (!form.id) input.protocol = form.protocol;
    }
    try {
      if (form.id) await updateDevice(origin, form.id, input); else await createDevice(origin, input);
      say(t("deviceSaved")); setForm(null); reload();
    } catch (error) { explain(error); }
  };

  const conn = form ? currentConnection(form) : null;
  const mqttConn = conn?.source.type === "mqtt" ? conn.source : undefined;
  const commandLabels = (kind: DeviceKind) => kind === "lock" ? ["cmdLock", "cmdUnlock"] : kind === "valve" ? ["cmdOpen", "cmdClose"] : ["cmdOn", "cmdOff"];

  return <section className="devices-view">
    <header className="devices-head">
      <MenuTitle kind="devices"><p className="eyebrow">{t("devicesTitle")}</p><h2>{t("devices")}</h2><p className="muted">{t("devicesHelp")}</p></MenuTitle>
      <div className="devices-stats">
        <span><b>{devices.length}</b>{t("devices")}</span><span className="ok"><b>{online}</b>{t("deviceOnline")}</span><span className={problems ? "bad" : ""}><b>{problems}</b>{t("filterProblems")}</span>
        <button className="primary" onClick={() => open()}>{t("addDevice")}</button>
      </div>
    </header>
    <div className="devices-filters">
      {(["all", "sensor", "actuator", "problem"] as const).map(item => <button key={item} className={filter === item ? "on" : ""} onClick={() => setFilter(item)}>{t(item === "all" ? "filterAll" : item === "sensor" ? "filterSensors" : item === "actuator" ? "filterActuators" : "filterProblems")}</button>)}
      <input type="search" value={search} placeholder={t("searchDevices")} onChange={event => setSearch(event.target.value)} aria-label={t("searchDevices")} />
    </div>
    {message.text && <p className={`notice devices-notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p>}

    {form && <form className="device-form stack-card" onSubmit={event => void save(event)}>
      <h3>{form.id ? t("editDevice") : t("addDevice")}</h3>
      <div className="device-form-grid">
        <label>{t("deviceName")}<input value={form.name} maxLength={80} required onChange={event => edit({ name: event.target.value })} /></label>
        <label>{t("deviceKind")}<select value={form.kind} onChange={event => edit({ kind: event.target.value as DeviceKind }, true)}>
          <optgroup label={t("filterSensors")}>{SENSOR_KINDS.map(kind => <option key={kind} value={kind}>{t(`kind_${kind}`)}</option>)}</optgroup>
          <optgroup label={t("filterActuators")}>{ACTUATOR_KINDS.map(kind => <option key={kind} value={kind}>{t(`kind_${kind}`)}</option>)}</optgroup></select></label>
        <label>{t("deviceProtocol")}<select value={form.protocol} onChange={event => edit({ protocol: event.target.value as DeviceProtocol })}>{PROTOCOLS.map(item => <option key={item} value={item}>{t(`protocol_${item}`)}</option>)}</select></label>
        <label>{t("deviceLocation")}<input value={form.location} maxLength={80} onChange={event => edit({ location: event.target.value })} /></label>
        <label className="wide">{t("deviceConnection")}<select value={form.preset} onChange={event => edit({ preset: event.target.value as PresetId, advanced: false }, true)}>{PRESETS.map(item => <option key={item} value={item}>{t(`preset_${item}`)}</option>)}</select></label>
        <p className="muted small wide">{t(`presetHelp_${form.preset}`)}</p>
        {(form.preset === "zigbee2mqtt" || form.preset === "tasmota" || form.preset === "shelly" || form.preset === "native") && <label>{t("presetName")}<input value={form.presetName} placeholder={slug(form.name)} onChange={event => edit({ presetName: event.target.value }, true)} /></label>}
        {form.preset === "http" && <label>{t("presetHost")}<input value={form.host} placeholder="192.168.0.50" onChange={event => edit({ host: event.target.value }, true)} /></label>}
        {ACTUATOR_KINDS.includes(form.kind) && <label>{t("riskLabel")}<select value={form.risk} onChange={event => edit({ risk: event.target.value })}>
          <option value="">{t(`risk_${defaultRiskOf(form.kind)}`)} · {t("default")}</option>
          {(["low", "circuit", "critical"] as const).filter(level => level !== defaultRiskOf(form.kind)).map(level => <option key={level} value={level}>{t(`risk_${level}`)}</option>)}
        </select></label>}
        <label>{t("expectedInterval")}<input type="number" min={0} max={604800} value={form.interval} onChange={event => edit({ interval: event.target.value })} /></label>
        <p className="muted small wide">{t("expectedIntervalHelp")}</p>
      </div>
      {!form.advanced
        ? <button type="button" className="link-button" onClick={openAdvanced}>{t("advanced")} ▸</button>
        : <div className="device-form-grid advanced">
            {mqttConn && <>
              <label>{t("stateTopic")}<input value={mqttConn.topic} onChange={event => setForm(current => current && ({ ...current, connection: { ...currentConnection(current), source: { ...mqttConn, topic: event.target.value } } }))} /></label>
              <label>{t("availabilityTopic")}<input value={mqttConn.availability_topic ?? ""} onChange={event => setForm(current => current && ({ ...current, connection: { ...currentConnection(current), source: { ...mqttConn, availability_topic: event.target.value || undefined } } }))} /></label>
              <label className="wide">{t("mappingLabel")}<textarea rows={3} value={form.mapText} onChange={event => edit({ mapText: event.target.value })} /></label>
              <p className="muted small wide">{t("mappingHelp")}</p>
            </>}
            {form.kind && ACTUATOR_KINDS.includes(form.kind) && <>
              <label>{t("commandTopic")}<input value={conn?.commands.mqtt?.topic ?? ""} onChange={event => setForm(current => current && ({ ...current, connection: { ...currentConnection(current), commands: { ...currentConnection(current).commands, mqtt: { ...(currentConnection(current).commands.mqtt ?? { topic: "" }), topic: event.target.value } } } }))} /></label>
              {(["on", "off", "toggle"] as const).map(key => <label key={key}>{t(key === "on" ? "payloadOn" : key === "off" ? "payloadOff" : "payloadToggle")}<input value={conn?.commands.mqtt?.[key] ?? ""} onChange={event => setForm(current => current && ({ ...current, connection: { ...currentConnection(current), commands: { ...currentConnection(current).commands, mqtt: { ...(currentConnection(current).commands.mqtt ?? { topic: "" }), [key]: event.target.value || undefined } } } }))} /></label>)}
              <label className="check wide"><input type="checkbox" checked={conn?.commands.mqtt?.assume_state === true} onChange={event => setForm(current => current && ({ ...current, connection: { ...currentConnection(current), commands: { ...currentConnection(current).commands, mqtt: { ...(currentConnection(current).commands.mqtt ?? { topic: "" }), assume_state: event.target.checked || undefined } } } }))} /> {t("assumeState")}</label>
              <label>{t("urlOn")}<input value={form.urlOn} placeholder="http://192.168.0.50/relay/0?turn=on" onChange={event => edit({ urlOn: event.target.value })} /></label>
              <label>{t("urlOff")}<input value={form.urlOff} onChange={event => edit({ urlOff: event.target.value })} /></label>
              <label>{t("urlToggle")}<input value={form.urlToggle} onChange={event => edit({ urlToggle: event.target.value })} /></label>
            </>}
          </div>}
      <div className="users-actions"><button className="primary" type="submit" disabled={!form.name.trim()}>{t("saveDevice")}</button><button type="button" onClick={() => setForm(null)}>{t("cancel")}</button></div>
    </form>}

    {devices.length === 0 && !form && <div className="devices-empty"><KindIcon kind="smart_plug" size={42} /><h3>{t("noDevices")}</h3><p className="muted">{t("noDevicesHelp")}</p><button className="primary" onClick={() => open()}>{t("addDevice")}</button></div>}

    <div className="device-grid">
      {shown.map(device => {
        const problem = deviceProblem(device), colour = KIND_COLOUR[device.kind], state = describeState(device.kind, device.state, t);
        const [onLabel, offLabel] = commandLabels(device.kind), main = MAIN_FIELD[device.kind];
        const isOn = main ? device.state[main] === true : false;
        return <article key={device.id} className={`device-card ${problem ?? ""} ${device.online ? "" : "offline"}`} style={{ "--kind": colour } as React.CSSProperties}>
          <div className="device-top">
            <span className="device-icon"><KindIcon kind={device.kind} size={22} /></span>
            <div className="device-titles"><strong title={device.name}>{device.name}</strong><small>{t(`kind_${device.kind}`)}{device.location ? ` · ${device.location}` : ""}</small></div>
            <span className={`state-dot ${device.online ? "normal" : "high"}`} title={device.online ? t("deviceOnline") : t("deviceOffline")} />
          </div>
          <div className="device-state">{state.length ? state.map((piece, index) => <span key={index} className={`pill ${index === 0 && problem === "triggered" ? "alarm" : ""} ${index === 0 && isOn && device.category === "actuator" ? "on" : ""}`}>{piece}</span>) : <span className="pill quiet">—</span>}
            {typeof device.state.battery === "number" && <span className={`pill battery ${device.state.battery < 15 ? "low" : ""}`}>🔋 {Math.round(device.state.battery)}%</span>}
            {problem && <span className={`pill problem ${problem}`}>{t(`problem_${problem}`)}</span>}</div>
          <div className="device-meta"><span>{t(`protocol_${device.protocol}`)}</span><span>{t("lastSeen")}: {ago(device.last_seen, now, t)}</span></div>
          {device.category === "actuator" && device.can_command && <div className="device-commands">
            <button onClick={() => void act(() => switchDevice(device, "on"))}>{t(onLabel)}</button>
            <button onClick={() => void act(() => switchDevice(device, "off"))}>{t(offLabel)}</button>
            {device.kind !== "siren" && device.kind !== "lock" && device.kind !== "valve" && <button onClick={() => void act(() => switchDevice(device, "toggle"))}>{t("cmdToggle")}</button>}
          </div>}
          <div className="device-actions">
            {ALARM_KIND[device.kind] && main && <button title={t("testHelp")} onClick={() => void act(() => setDeviceState(origin, device.id, { [main]: !isOn }))}>{isOn ? t("testClear") : t("testTrigger")}</button>}
            <button onClick={() => onPlace(device.id)}>{placedIds.has(device.id) ? t("placedOnDesign") : t("placeOnDesign")}</button>
            <button onClick={() => open(device)}>{t("editUser")}</button>
            <button className="danger-button" onClick={() => { if (window.confirm(t("confirmDeleteDevice"))) void act(() => deleteDevice(origin, device.id), t("deviceDeleted")); }}>{t("deleteUser")}</button>
          </div>
        </article>;
      })}
    </div>
    {devices.length > 0 && shown.length === 0 && <p className="muted">{t("noDevices")}</p>}
  </section>;
}

/** The risk a kind has when nobody says otherwise: a breaker of the board asks first, the rest is a click (the same rule as the server's). */
const defaultRiskOf = (kind: DeviceKind): DeviceRisk => (kind === "smart_breaker" ? "circuit" : "low");
