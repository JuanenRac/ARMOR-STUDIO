/**
 * Configuration > Preferences > alarm sounds, voice and pop-ups: a sound for each severity and kind of source (with a play button), sounds uploaded from the browser, the spoken voice
 * (language, male or female, age), the pop-ups and where an alarm takes the person. Every change is saved at once.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useRef, useState } from "react";
import type { AlarmSourceType, Alarm, Severity } from "../api";
import { AGES, BUILT_IN_SOUNDS, GENDERS, LIMITS, REDIRECTS, SEVERITIES, SOURCES, VOICE_STYLES, setAlerts, soundFor, useAlerts, type AlertSettings } from "./settings";
import { addSound, listSounds, listVoices, playSound, removeSound, speak, speechAvailable, stopSound, forgetSoundUrl, type StoredSound } from "./sounds";
import { alarmSentence } from "./route";

type Props = { t: (key: string) => string; language: string };

export function AlertSettingsPanel({ t, language }: Props) {
  const settings = useAlerts();
  const [uploads, setUploads] = useState<StoredSound[]>([]);
  const [problem, setProblem] = useState("");
  const [voices, setVoices] = useState(() => listVoices());
  const file = useRef<HTMLInputElement>(null);
  const refresh = () => void listSounds().then(setUploads);
  useEffect(refresh, []);
  useEffect(() => {
    if (!speechAvailable()) return;
    const update = () => setVoices(listVoices());
    window.speechSynthesis.addEventListener?.("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", update);
  }, []);
  const languages = [...new Set(voices.map(voice => voice.lang.replace("_", "-")))].sort();

  const soundOptions = (withSame: boolean) => <>
    {withSame && <option value="">{t("al_same")}</option>}
    {BUILT_IN_SOUNDS.map(name => <option key={name} value={name}>{t(`snd_${name}`)}</option>)}
    {uploads.length > 0 && <optgroup label={t("al_custom")}>{uploads.map(item => <option key={item.id} value={`custom:${item.id}`}>{item.name}</option>)}</optgroup>}
  </>;
  const play = (choice: string) => { if (choice) void playSound(choice, settings.volume); };
  const toggleIn = <T extends string>(list: readonly T[], item: T): T[] => (list.includes(item) ? list.filter(entry => entry !== item) : [...list, item]);
  const upload = async (files: FileList | null) => {
    setProblem("");
    for (const item of Array.from(files ?? [])) {
      const result = await addSound(item);
      if (!result.ok) { setProblem(t(`al_err_${result.reason}`)); break; }
    }
    if (file.current) file.current.value = "";
    refresh();
  };
  const remove = async (item: StoredSound) => {
    await removeSound(item.id); forgetSoundUrl(item.id);
    const own = `custom:${item.id}`, fix = (value: string, fallback: string) => (value === own ? fallback : value);
    setAlerts({ sounds: { critical: fix(settings.sounds.critical, "siren"), high: fix(settings.sounds.high, "klaxon"), warning: fix(settings.sounds.warning, "chime") },
      sourceSounds: Object.fromEntries(Object.entries(settings.sourceSounds).filter(([, value]) => value !== own)) as AlertSettings["sourceSounds"] });
    refresh();
  };
  const testAlarm = () => {
    const sample: Alarm = { id: "test", key: "test", source: { type: "node", id: "radar-1" }, severity: "critical", code: "intrusion", raised_at: new Date().toISOString() };
    const choice = soundFor({ ...settings, muted: false }, "critical", "node");
    void playSound(choice, settings.volume);
    speak(alarmSentence(sample, t, settings.voice.say), { ...settings, muted: false, voice: { ...settings.voice, enabled: true } }, language);
  };
  const setVoice = (patch: Partial<AlertSettings["voice"]>) => setAlerts({ voice: { ...settings.voice, ...patch } });
  const setPopups = (patch: Partial<AlertSettings["popups"]>) => setAlerts({ popups: { ...settings.popups, ...patch } });
  const check = (label: string, checked: boolean, change: (value: boolean) => void, hint?: string) =>
    <label className="pf-toggle"><input type="checkbox" checked={checked} onChange={event => change(event.target.checked)} /><span><strong>{t(label)}</strong>{hint && <small>{t(hint)}</small>}</span></label>;
  const row = (key: string, label: string, value: string, change: (value: string) => void, muted: boolean, mute: () => void, same: boolean) =>
    <div className="al-row" key={key}>
      <span className="al-row-name">{label}</span>
      <select value={value} onChange={event => change(event.target.value)} aria-label={label}>{soundOptions(same)}</select>
      <button type="button" onClick={() => play(value)} disabled={!value || value === "none"} title={t("al_play")} aria-label={`${t("al_play")}: ${label}`}>▶</button>
      <label className="al-mute"><input type="checkbox" checked={muted} onChange={mute} />{t("al_muted_one")}</label>
    </div>;

  return <section className="al-panel" aria-label={t("al_title")}>
    <div className="al-head"><div><h3>{t("al_title")}</h3><p className="muted">{t("al_help")}</p></div>
      <button type="button" className="primary" onClick={testAlarm}>{t("al_test")}</button></div>
    <div className="config-grid">
      <article className="stack-card pf-card">
        {check("al_mute", settings.muted, muted => setAlerts({ muted }))}
        <label className="pf-range">{t("al_volume")}: <b>{settings.volume} %</b>
          <input type="range" min={LIMITS.volume[0]} max={LIMITS.volume[1]} step={5} value={settings.volume} onChange={event => setAlerts({ volume: Number(event.target.value) })} /></label>
        <h4>{t("al_sev")}</h4>
        {SEVERITIES.map((severity: Severity) => row(severity, t(`severity_${severity}`), settings.sounds[severity], value => setAlerts({ sounds: { ...settings.sounds, [severity]: value || settings.sounds[severity] } }),
          settings.mutedSeverities.includes(severity), () => setAlerts({ mutedSeverities: toggleIn(settings.mutedSeverities, severity) }), false))}
        <h4>{t("al_src")}</h4>
        {SOURCES.map((kind: AlarmSourceType) => row(kind, t(`source_${kind}`), settings.sourceSounds[kind] ?? "", value => { const next = { ...settings.sourceSounds }; if (value) next[kind] = value; else delete next[kind]; setAlerts({ sourceSounds: next }); },
          settings.mutedSources.includes(kind), () => setAlerts({ mutedSources: toggleIn(settings.mutedSources, kind) }), true))}
        <h4>{t("al_uploads")}</h4>
        <p className="muted pf-hint">{t("al_upload_h")}</p>
        <input ref={file} type="file" accept="audio/*" multiple hidden onChange={event => void upload(event.target.files)} />
        <div className="pf-actions"><button type="button" onClick={() => file.current?.click()}>{t("al_upload")}</button><button type="button" onClick={stopSound}>{t("al_stop")}</button></div>
        {problem && <p className="bad" role="alert">{problem}</p>}
        <ul className="al-uploads">{uploads.map(item => <li key={item.id}><span>{item.name}</span><small>{Math.round(item.size / 1024)} KB</small>
          <button type="button" onClick={() => play(`custom:${item.id}`)} aria-label={`${t("al_play")}: ${item.name}`}>▶</button>
          <button type="button" className="danger" onClick={() => void remove(item)}>{t("al_remove")}</button></li>)}</ul>
      </article>

      <article className="stack-card pf-card">
        <h3>{t("al_voice")}</h3>
        {!speechAvailable() ? <p className="muted">{t("al_voice_none")}</p> : <>
          {check("al_voice_on", settings.voice.enabled, enabled => setVoice({ enabled }), "al_voice_h")}
          <label>{t("al_voice_lang")}<select value={settings.voice.language} onChange={event => setVoice({ language: event.target.value })}>
            <option value="">{t("al_voice_iface")}</option>{languages.map(code => <option key={code} value={code}>{code}</option>)}</select></label>
          <label>{t("al_voice_gender")}<select value={settings.voice.gender} onChange={event => setVoice({ gender: event.target.value as typeof GENDERS[number] })}>
            {GENDERS.map(gender => <option key={gender} value={gender}>{t(`al_gender_${gender}`)}</option>)}</select></label>
          <label>{t("al_voice_age")}<select value={settings.voice.age} onChange={event => setVoice({ age: event.target.value as typeof AGES[number] })}>
            {AGES.map(age => <option key={age} value={age}>{t(`al_age_${age}`)}</option>)}</select></label>
          <label>{t("al_voice_style")}<select value={settings.voice.style} onChange={event => setVoice({ style: event.target.value as typeof VOICE_STYLES[number] })}>
            {VOICE_STYLES.map(style => <option key={style} value={style}>{t(`al_style_${style}`)}</option>)}</select></label>
          <label className="pf-range">{t("al_voice_rate")}: <b>{settings.voice.rate} %</b>
            <input type="range" min={LIMITS.rate[0]} max={LIMITS.rate[1]} step={5} value={settings.voice.rate} onChange={event => setVoice({ rate: Number(event.target.value) })} /></label>
          <h4>{t("al_voice_say")}</h4>
          {check("al_say_severity", settings.voice.say.severity, severity => setVoice({ say: { ...settings.voice.say, severity } }))}
          {check("al_say_type", settings.voice.say.type, type => setVoice({ say: { ...settings.voice.say, type } }))}
          {check("al_say_source", settings.voice.say.source, source => setVoice({ say: { ...settings.voice.say, source } }))}
          <div className="pf-actions"><button type="button" onClick={() => speak(t("al_voice_test"), { ...settings, muted: false, voice: { ...settings.voice, enabled: true } }, language)}>{t("al_voice_test")}</button></div>
        </>}
      </article>

      <article className="stack-card pf-card">
        <h3>{t("al_popups")}</h3>
        {check("al_popup_on", settings.popups.enabled, enabled => setPopups({ enabled }), "al_popup_h")}
        <label className="pf-range">{t("al_popup_secs")}: <b>{settings.popups.seconds}</b>
          <input type="range" min={LIMITS.seconds[0]} max={LIMITS.seconds[1]} step={5} value={settings.popups.seconds} disabled={!settings.popups.enabled} onChange={event => setPopups({ seconds: Number(event.target.value) })} /></label>
        <label className="pf-range">{t("al_popup_max")}: <b>{settings.popups.maxOnScreen}</b>
          <input type="range" min={LIMITS.onScreen[0]} max={LIMITS.onScreen[1]} step={1} value={settings.popups.maxOnScreen} disabled={!settings.popups.enabled} onChange={event => setPopups({ maxOnScreen: Number(event.target.value) })} /></label>
        {check("al_popup_blink", settings.popups.blink, blink => setPopups({ blink }))}
        {check("al_popup_armed", settings.popups.onlyWhileArmed, onlyWhileArmed => setPopups({ onlyWhileArmed }))}
        {check("al_blink_title", settings.blinkTitle, blinkTitle => setAlerts({ blinkTitle }))}
        <label>{t("al_redirect")}<select value={settings.redirect} onChange={event => setAlerts({ redirect: event.target.value as typeof REDIRECTS[number] })}>
          {REDIRECTS.map(item => <option key={item} value={item}>{t(`al_redirect_${item}`)}</option>)}</select></label>
        <p className="muted pf-hint">{t("al_redirect_h")}</p>
      </article>
    </div>
  </section>;
}
