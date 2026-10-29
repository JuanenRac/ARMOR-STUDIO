import { describe, expect, it } from "vitest";
import { encodeWave16k, mixToMono, prepareSound, resample, samplesFromPcm16, SoundFileError } from "./alarmSoundWav";
import { alarmAudioCatalogues, ALARM_AUDIO_PT } from "./alarmAudioText";

const tone = (seconds: number, rate: number) => Float32Array.from({ length: Math.round(seconds * rate) }, (_, i) => (i % 40 < 20 ? 0.5 : -0.5));

describe("the sound of an alarm is turned into what the server accepts", () => {
  it("writes a 16 kHz, 16-bit, mono WAVE file", () => {
    const wave = encodeWave16k(new Float32Array([0, 0.5, -0.5, 2, -2]));
    const view = new DataView(wave.buffer);
    expect(String.fromCharCode(...wave.slice(0, 4)) + String.fromCharCode(...wave.slice(8, 12))).toBe("RIFFWAVE");
    expect([view.getUint16(20, true), view.getUint16(22, true), view.getUint32(24, true), view.getUint16(34, true), view.getUint32(40, true)]).toEqual([1, 1, 16000, 16, 10]);
    expect(wave.length).toBe(54);
    expect([view.getInt16(44, true), view.getInt16(48, true), view.getInt16(50, true), view.getInt16(52, true)]).toEqual([0, -16384, 32767, -32768]);
    expect(Array.from(samplesFromPcm16(wave.slice(44).buffer))[3]).toBeCloseTo(0.99997, 3);
  });

  it("mixes channels and changes the rate", () => {
    expect(Array.from(mixToMono([new Float32Array([1, 0]), new Float32Array([0, 1])]))).toEqual([0.5, 0.5]);
    expect(resample(new Float32Array(48_000), 48_000).length).toBe(16_000);
    expect(resample(new Float32Array(44_100), 44_100, 16_000).length).toBe(16_000);
    expect(resample(new Float32Array(8_000), 8_000).length).toBe(16_000);
    const same = new Float32Array(3);
    expect(resample(same, 16_000)).toBe(same);
    expect(() => resample(same, 0)).toThrow(RangeError);
  });

  it("prepares a picked file, and refuses one that cannot be read or is too long", async () => {
    const decode = async () => ({ sampleRate: 48_000, channels: [tone(1, 48_000), tone(1, 48_000)] });
    const wave = await prepareSound(new Blob([new Uint8Array(4)]), 128_000, decode);
    expect(wave.length).toBe(44 + 32_000);
    await expect(prepareSound(new Blob([new Uint8Array(4)]), 16_000, decode)).rejects.toMatchObject({ code: "too_long" });
    await expect(prepareSound(new Blob([new Uint8Array(4)]), 128_000, async () => { throw new Error("no"); })).rejects.toBeInstanceOf(SoundFileError);
    await expect(prepareSound(new Blob([new Uint8Array(4)]), 128_000, async () => ({ sampleRate: 16_000, channels: [] }))).rejects.toMatchObject({ code: "unreadable" });
  });

  it("has every phrase in the eight languages", () => {
    const keys = Object.keys(alarmAudioCatalogues.en);
    expect(keys.length).toBeGreaterThan(30);
    for (const code of ["es", "de", "fr", "it", "ja", "zh"] as const) for (const key of keys) expect(alarmAudioCatalogues[code][key]?.trim().length, `${code} ${key}`).toBeGreaterThan(0);
    for (const key of keys) expect(ALARM_AUDIO_PT[key]?.trim().length, `pt ${key}`).toBeGreaterThan(0);
    expect(Object.keys(ALARM_AUDIO_PT).sort()).toEqual([...keys].sort());
  });
});
