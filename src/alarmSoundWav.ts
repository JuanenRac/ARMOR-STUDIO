/**
 * Turns the sound a person picks into what the server accepts for an alarm origin: a WAVE file of 16 kHz, 16-bit, mono PCM. The browser decodes the file (any format it knows);
 * this module mixes the channels to one, brings the rate to 16 kHz and writes the file. Pure functions apart from `prepareSound`, which asks the browser to decode.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export const TARGET_RATE = 16_000;

/** One channel from several: the mean of them. */
export function mixToMono(channels: ReadonlyArray<Float32Array>): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0]!;
  const out = new Float32Array(channels[0]!.length);
  for (const channel of channels) for (let i = 0; i < out.length; i++) out[i]! += (channel[i] ?? 0) / channels.length;
  return out;
}

/** The samples at another rate: the mean of the source samples each new one covers when going down (a crude low-pass, enough against the worst aliasing), a straight line between two when going up. */
export function resample(input: Float32Array, from: number, to: number = TARGET_RATE): Float32Array {
  if (!(from > 0) || !(to > 0)) throw new RangeError("rate");
  if (from === to) return input;
  const length = Math.max(0, Math.floor(input.length * to / from));
  const out = new Float32Array(length);
  const ratio = from / to;
  for (let i = 0; i < length; i++) {
    if (ratio > 1) {
      const start = Math.floor(i * ratio), end = Math.min(input.length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
      let sum = 0;
      for (let j = start; j < end; j++) sum += input[j]!;
      out[i] = end > start ? sum / (end - start) : 0;
    } else {
      const at = i * ratio, left = Math.floor(at), right = Math.min(input.length - 1, left + 1), fraction = at - left;
      out[i] = input[left]! * (1 - fraction) + input[right]! * fraction;
    }
  }
  return out;
}

/** The WAVE file (16 kHz, 16-bit, mono PCM) of samples between -1 and 1. */
export function encodeWave16k(samples: Float32Array): Uint8Array {
  const data = samples.length * 2;
  const bytes = new Uint8Array(44 + data), view = new DataView(bytes.buffer);
  const text = (at: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i)); };
  text(0, "RIFF"); view.setUint32(4, 36 + data, true); text(8, "WAVE"); text(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, TARGET_RATE, true); view.setUint32(28, TARGET_RATE * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, "data"); view.setUint32(40, data, true);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(44 + i * 2, Math.round(value < 0 ? value * 0x8000 : value * 0x7fff), true);
  }
  return bytes;
}

/** The samples of the 16-bit PCM the server serves, as numbers between -1 and 1 (to listen to a stored sound). */
export function samplesFromPcm16(pcm: ArrayBuffer): Float32Array {
  const view = new DataView(pcm, 0, pcm.byteLength - (pcm.byteLength % 2));
  const out = new Float32Array(view.byteLength / 2);
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 0x8000;
  return out;
}

export class SoundFileError extends Error {
  constructor(readonly code: "unreadable" | "too_long") { super(code); }
}

/** The WAVE file to send for a picked file, or a SoundFileError: it cannot be decoded, or it lasts longer than `maxBytes` of 16 kHz 16-bit mono allows. */
export async function prepareSound(file: Blob, maxBytes: number, decode?: (data: ArrayBuffer) => Promise<{ sampleRate: number; channels: Float32Array[] }>): Promise<Uint8Array> {
  const decoder = decode ?? (async (data: ArrayBuffer) => {
    const Context = (globalThis as unknown as { AudioContext?: new () => { decodeAudioData(data: ArrayBuffer): Promise<{ sampleRate: number; numberOfChannels: number; getChannelData(index: number): Float32Array }>; close(): Promise<void> } }).AudioContext;
    if (!Context) throw new Error("no audio");
    const context = new Context();
    try {
      const decoded = await context.decodeAudioData(data);
      return { sampleRate: decoded.sampleRate, channels: Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index)) };
    } finally { void context.close().catch(() => undefined); }
  });
  let decoded: { sampleRate: number; channels: Float32Array[] };
  try { decoded = await decoder(await file.arrayBuffer()); } catch { throw new SoundFileError("unreadable"); }
  if (!decoded.channels.length || !(decoded.sampleRate > 0)) throw new SoundFileError("unreadable");
  // checked before the work of converting: seconds of the original against what the server accepts
  if (decoded.channels[0]!.length / decoded.sampleRate * TARGET_RATE * 2 > maxBytes) throw new SoundFileError("too_long");
  const samples = resample(mixToMono(decoded.channels), decoded.sampleRate);
  if (samples.length * 2 > maxBytes) throw new SoundFileError("too_long");
  return encodeWave16k(samples);
}
