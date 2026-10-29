/**
 * Configuration > Security > the sounds of the alarms on the wall panel: whether the spoken alarm is ready, and, for each origin of alarm, the short sound an administrator uploaded
 * (listen to it, replace it, remove it). The file picked is converted here to the 16 kHz mono WAVE the server accepts (see alarmSoundWav.ts).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { askConfirm } from "./askConfirm";
import { errorText } from "./apiErrorText";
import { ALARM_SOURCES, fetchAlarmSound, readAlarmAudio, removeAlarmSound, uploadAlarmSound, type AlarmAudioSource, type AlarmAudioState } from "./api/alarmAudio";
import { prepareSound, samplesFromPcm16, SoundFileError, TARGET_RATE } from "./alarmSoundWav";

const fill = (text: string, ...values: Array<string | number>) => text.replace(/\{(\d+)\}/g, (_whole, index: string) => String(values[Number(index)] ?? ""));

/** The words for a file that could not be turned into a sound, or for what the server refused. */
export const soundErrorText = (t: (key: string) => string, error: unknown): string =>
  error instanceof SoundFileError ? t(`als_err_${error.code}`) : errorText(t, error, "als_err_");

async function listen(pcm: ArrayBuffer): Promise<void> {
  const Context = (globalThis as unknown as { AudioContext?: new () => AudioContext }).AudioContext;
  if (!Context) return;
  const context = new Context();
  const samples = samplesFromPcm16(pcm);
  const buffer = context.createBuffer(1, Math.max(1, samples.length), TARGET_RATE);
  buffer.copyToChannel(new Float32Array(samples), 0);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.onended = () => { void context.close().catch(() => undefined); };
  source.start();
}

export function AlarmSounds({ t, origin, spokenOn, customOn }: { t: (key: string) => string; origin: string; spokenOn: boolean; customOn: boolean }) {
  const [state, setState] = useState<AlarmAudioState | null>(null);
  const [busy, setBusy] = useState<AlarmAudioSource | null>(null);
  const [message, setMessage] = useState({ text: "", bad: false });
  const picker = useRef<HTMLInputElement | null>(null);
  const target = useRef<AlarmAudioSource>("device");
  const load = useCallback(() => readAlarmAudio(origin).then(setState, error => setMessage({ text: soundErrorText(t, error), bad: true })), [origin, t]);
  useEffect(() => { void load(); }, [load, spokenOn, customOn]);
  if (!state) return message.text ? <p className="notice bad" role="alert">{message.text}</p> : null;

  const run = async (source: AlarmAudioSource, work: () => Promise<string | void>) => {
    setBusy(source);
    setMessage({ text: t("als_working"), bad: false });
    try { const done = await work(); setMessage({ text: done ?? "", bad: false }); await load(); }
    catch (error) { setMessage({ text: soundErrorText(t, error), bad: true }); }
    finally { setBusy(null); }
  };
  const onFile = (file: File | undefined) => {
    if (!file) return;
    const source = target.current;
    void run(source, async () => { await uploadAlarmSound(origin, source, await prepareSound(file, state.custom.max_bytes)); return t("als_saved"); });
  };
  const spokenText = !state.spoken.enabled ? t("als_spoken_off") : state.spoken.available ? t("als_spoken_ready") : t("als_spoken_nogateway");
  const stored = new Map(state.custom.sounds.map(sound => [sound.source, sound]));

  return <fieldset className="sec-option" data-testid="alarm-sounds" disabled={busy !== null}>
    <legend>{t("als_title")}</legend>
    <p className="muted">{t("als_help")}</p>
    <p className="muted" data-testid="alarm-sounds-spoken">{spokenText}</p>
    {!state.custom.enabled ? <p className="muted" data-testid="alarm-sounds-off">{t("als_off")}</p> : <>
      <p className="muted">{fill(t("als_limit"), Math.floor(state.custom.max_bytes / (TARGET_RATE * 2)))}</p>
      <input ref={picker} type="file" accept="audio/*,.wav" hidden data-testid="alarm-sounds-file" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; onFile(file); }} />
      <ul className="plain-list">
        {ALARM_SOURCES.map(source => {
          const sound = stored.get(source);
          return <li key={source} data-testid={`alarm-sound-${source}`}>
            <strong>{t(`als_src_${source}`)}</strong>{" "}
            <span className="muted">{sound ? fill(t("als_info"), (sound.duration_ms / 1000).toFixed(1), sound.uploaded_by) : t("als_none")}</span>{" "}
            <button type="button" onClick={() => { target.current = source; picker.current?.click(); }}>{t("als_choose")}</button>
            {sound && <>
              {" "}<button type="button" onClick={() => void run(source, async () => { await listen(await fetchAlarmSound(origin, source)); })}>{t("als_play")}</button>
              {" "}<button type="button" onClick={() => void (async () => { if (await askConfirm(t("als_remove_confirm"), t)) await run(source, async () => { await removeAlarmSound(origin, source); return t("als_removed"); }); })()}>{t("als_remove")}</button>
            </>}
          </li>;
        })}
      </ul>
    </>}
    {message.text && <p className={message.bad ? "notice bad" : "muted"} role={message.bad ? "alert" : "status"}>{message.text}</p>}
  </fieldset>;
}
