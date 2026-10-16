/**
 * The sounds of the alarms: a few made by Studio itself (no files to download), the ones the person uploads from the browser (kept in this browser's IndexedDB) and the spoken voice
 * of the browser. Nothing here needs the server, and a browser that does not allow a sound before the first click simply stays quiet: the pop-ups and the badge still tell.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { AlertSettings, Age, Gender } from "./settings";
import { speechParts } from "./voiceStyle";

export const MAX_UPLOAD_BYTES = 1_500_000;
export const MAX_SOUNDS = 12;

type Note = { f: number; at: number; len: number; type?: OscillatorType; to?: number };
const SYNTH: Record<string, { notes: Note[]; total: number }> = {
  siren: { notes: [0, 1, 2, 3].flatMap(i => [{ f: 700, to: 1200, at: i * 0.6, len: 0.3, type: "sawtooth" as OscillatorType }, { f: 1200, to: 700, at: i * 0.6 + 0.3, len: 0.3, type: "sawtooth" as OscillatorType }]), total: 2.4 },
  klaxon: { notes: [0, 1, 2].map(i => ({ f: 440, at: i * 0.5, len: 0.38, type: "square" as OscillatorType })), total: 1.5 },
  beep: { notes: [0, 1, 2].map(i => ({ f: 880, at: i * 0.35, len: 0.2, type: "square" as OscillatorType })), total: 1.1 },
  pulse: { notes: [0, 1, 2, 3, 4, 5].map(i => ({ f: 600 + (i % 2) * 200, at: i * 0.15, len: 0.1, type: "sine" as OscillatorType })), total: 0.9 },
  chime: { notes: [{ f: 659, at: 0, len: 0.4, type: "sine" }, { f: 880, at: 0.25, len: 0.6, type: "sine" }], total: 1 },
  bell: { notes: [{ f: 1046, at: 0, len: 1.1, type: "triangle" }, { f: 1568, at: 0, len: 0.8, type: "sine" }], total: 1.2 },
  buzzer: { notes: [{ f: 150, at: 0, len: 0.9, type: "sawtooth" }], total: 1 },
  alert: { notes: [{ f: 988, at: 0, len: 0.15, type: "triangle" }, { f: 784, at: 0.18, len: 0.15, type: "triangle" }, { f: 988, at: 0.36, len: 0.15, type: "triangle" }, { f: 784, at: 0.54, len: 0.25, type: "triangle" }], total: 1 },
};

let player: HTMLAudioElement | null = null;
let stopSynth: (() => void) | null = null;

/** Stop whatever sound is playing (a preview that is played again, an alarm that was acknowledged). */
export function stopSound(): void {
  try { stopSynth?.(); } catch { /* already stopped */ }
  stopSynth = null;
  if (player) { player.pause(); player = null; }
  try { window.speechSynthesis?.cancel(); } catch { /* no speech */ }
}

function synth(name: string, volume: number): void {
  const spec = SYNTH[name];
  if (!spec) return;
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return;
  const audio = new Context();
  const master = audio.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume / 100)) * 0.3;
  master.connect(audio.destination);
  for (const note of spec.notes) {
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = note.type ?? "sine";
    oscillator.frequency.setValueAtTime(note.f, audio.currentTime + note.at);
    if (note.to) oscillator.frequency.linearRampToValueAtTime(note.to, audio.currentTime + note.at + note.len);
    gain.gain.setValueAtTime(0.0001, audio.currentTime + note.at);
    gain.gain.exponentialRampToValueAtTime(1, audio.currentTime + note.at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + note.at + note.len);
    oscillator.connect(gain); gain.connect(master);
    oscillator.start(audio.currentTime + note.at); oscillator.stop(audio.currentTime + note.at + note.len + 0.05);
  }
  const closer = window.setTimeout(() => void audio.close().catch(() => undefined), (spec.total + 0.6) * 1000);
  stopSynth = () => { window.clearTimeout(closer); void audio.close().catch(() => undefined); };
}

/** Play a sound by its choice: a built-in name or `custom:<id>`. Resolves when it was started (not when it ends). */
export async function playSound(choice: string, volume: number): Promise<boolean> {
  if (choice === "none") return false;
  stopSound();
  try {
    if (choice.startsWith("custom:")) {
      const url = await customSoundUrl(choice.slice(7));
      if (!url) return false;
      const element = new Audio(url);
      element.volume = Math.max(0, Math.min(1, volume / 100));
      player = element;
      await element.play();
      return true;
    }
    synth(choice, volume);
    return true;
  } catch { return false; }
}

// ---- the library of uploaded sounds (IndexedDB) ----
export type StoredSound = { id: string; name: string; size: number; type: string };
const DB = "armor-studio-sounds", STORE = "sounds";
let memory = new Map<string, { meta: StoredSound; blob: Blob }>();   // what is used when the browser keeps no database (a private window)

function open(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => { request.result.createObjectStore(STORE, { keyPath: "id" }); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

const wrap = <T,>(request: IDBRequest<T>): Promise<T | null> => new Promise(resolve => { request.onsuccess = () => resolve(request.result); request.onerror = () => resolve(null); });

export async function listSounds(): Promise<StoredSound[]> {
  const db = await open();
  if (!db) return [...memory.values()].map(item => item.meta);
  const all = await wrap(db.transaction(STORE).objectStore(STORE).getAll());
  db.close();
  return (all ?? []).map((item: { id: string; name: string; blob: Blob }) => ({ id: item.id, name: item.name, size: item.blob.size, type: item.blob.type }));
}

export type UploadResult = { ok: true; sound: StoredSound } | { ok: false; reason: "type" | "size" | "full" | "failed" };

/** Keep an audio file the person chose. Only audio, of a sensible size, and a bounded number of them. */
export async function addSound(file: File): Promise<UploadResult> {
  if (!/^audio\//.test(file.type)) return { ok: false, reason: "type" };
  if (file.size > MAX_UPLOAD_BYTES || file.size === 0) return { ok: false, reason: "size" };
  if ((await listSounds()).length >= MAX_SOUNDS) return { ok: false, reason: "full" };
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const name = file.name.replace(/\.[a-z0-9]{1,5}$/i, "").replace(/[^\p{L}\p{N} _.-]/gu, "").slice(0, 40) || "sound";
  const meta: StoredSound = { id, name, size: file.size, type: file.type };
  const db = await open();
  if (!db) { memory.set(id, { meta, blob: file }); return { ok: true, sound: meta }; }
  const done = await new Promise<boolean>(resolve => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ id, name, blob: file });
    tx.oncomplete = () => resolve(true); tx.onerror = () => resolve(false); tx.onabort = () => resolve(false);
  });
  db.close();
  return done ? { ok: true, sound: meta } : { ok: false, reason: "failed" };
}

export async function removeSound(id: string): Promise<void> {
  memory.delete(id);
  const db = await open();
  if (!db) return;
  await new Promise<void>(resolve => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).delete(id); tx.oncomplete = () => resolve(); tx.onerror = () => resolve(); });
  db.close();
}

const urls = new Map<string, string>();
async function customSoundUrl(id: string): Promise<string | null> {
  const known = urls.get(id);
  if (known) return known;
  let blob: Blob | undefined = memory.get(id)?.blob;
  if (!blob) {
    const db = await open();
    if (!db) return null;
    const item = await wrap(db.transaction(STORE).objectStore(STORE).get(id)) as { blob: Blob } | null;
    db.close();
    blob = item?.blob;
  }
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

export function forgetSoundUrl(id: string): void { const url = urls.get(id); if (url) URL.revokeObjectURL(url); urls.delete(id); }
export function resetSoundMemory(): void { memory = new Map(); }

// ---- the spoken voice ----
export const speechAvailable = (): boolean => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
export const listVoices = (): SpeechSynthesisVoice[] => { try { return speechAvailable() ? window.speechSynthesis.getVoices() : []; } catch { return []; } };

const FEMALE = /female|woman|femenin|femme|weiblich|femmina|mujer|zira|helena|elena|paulina|sabina|laura|monica|marie|hortense|amelie|katja|hedda|elsa|isabella|francisca|maria|joana|heloisa|kyoko|haruka|nanami|xiaoxiao|huihui|yaoyao|samantha|karen|victoria|susan|hazel/i;
const MALE = /\bmale\b|\bman\b|masculin|homme|männlich|maschio|hombre|david|mark|jorge|pablo|raul|diego|stefan|hans|claude|paul|thomas|cosimo|luca|ichiro|kangkang|yunyang|daniel|george|james|richard|antonio|daniel|felipe|ricardo/i;

/** The voices of a language, the ones of the wanted gender first (a browser does not say the gender of a voice: it is guessed from the name). */
export function pickVoice(voices: readonly SpeechSynthesisVoice[], language: string, gender: Gender): SpeechSynthesisVoice | null {
  const base = language.toLowerCase().split("-")[0];
  const ofLanguage = voices.filter(voice => voice.lang.toLowerCase().split(/[-_]/)[0] === base);
  const pool = ofLanguage.length > 0 ? ofLanguage : voices.filter(voice => voice.default);
  if (pool.length === 0) return null;
  if (gender === "any") return pool.find(voice => voice.lang.toLowerCase() === language.toLowerCase()) ?? pool[0];
  const wanted = gender === "female" ? FEMALE : MALE, other = gender === "female" ? MALE : FEMALE;
  return pool.find(voice => wanted.test(voice.name) && !other.test(voice.name)) ?? pool.find(voice => !other.test(voice.name)) ?? pool[0];
}

/** What the age changes: the pitch and the pace (a browser has no "age" for a voice, so a child is higher and brisker and an old voice lower and slower). */
export const AGE_VOICE: Record<Age, { pitch: number; rate: number }> = { child: { pitch: 1.6, rate: 1.1 }, adult: { pitch: 1, rate: 1 }, senior: { pitch: 0.7, rate: 0.88 } };

const LANGUAGE_TAG: Record<string, string> = { en: "en-GB", es: "es-ES", de: "de-DE", fr: "fr-FR", it: "it-IT", ja: "ja-JP", zh: "zh-CN", pt: "pt-PT" };
export const speechLanguage = (setting: string, interfaceLanguage: string): string => setting || LANGUAGE_TAG[interfaceLanguage] || "en-GB";

export function speak(message: string, settings: AlertSettings, interfaceLanguage: string): boolean {
  if (!speechAvailable() || settings.muted || !settings.voice.enabled || !message.trim()) return false;
  try {
    const language = speechLanguage(settings.voice.language, interfaceLanguage);
    const voice = pickVoice(listVoices(), language, settings.voice.gender);
    const age = AGE_VOICE[settings.voice.age];
    // the style may cut the message in stretches (the theatrical one whispers and then rises): each is spoken in turn
    for (const part of speechParts(message, settings.voice.style, language)) {
      const utterance = new SpeechSynthesisUtterance(part.text.slice(0, 240));
      utterance.lang = language;
      if (voice) utterance.voice = voice;
      utterance.pitch = Math.max(0, Math.min(2, age.pitch * part.pitch));
      utterance.rate = Math.max(0.1, Math.min(4, (settings.voice.rate / 100) * age.rate * part.rate));
      utterance.volume = Math.max(0, Math.min(1, (settings.volume / 100) * part.volume));
      window.speechSynthesis.speak(utterance);
    }
    return true;
  } catch { return false; }
}
