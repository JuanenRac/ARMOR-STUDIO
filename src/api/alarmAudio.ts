import { ApiError, askElevation, endpoint, localSession, timedFetch, userCall } from "./transport";
import type { AlarmAudioRemoved, AlarmAudioSound, AlarmAudioState, AlarmAudioSource } from "./contract/armor-rest";

export type { AlarmAudioSound, AlarmAudioState, AlarmAudioSource };
export const ALARM_SOURCES: readonly AlarmAudioSource[] = ["device", "solar", "electrical", "network", "alarm", "other"];

// ---- the sound of the alarms on the wall panel (see the server's docs/INTEGRATION.md, "The sound of an alarm") ---------------------------------------------------
export const readAlarmAudio = (origin: string) => userCall<AlarmAudioState>(origin, "GET", "/api/v1/alarm-audio");
export const removeAlarmSound = (origin: string, source: AlarmAudioSource) => userCall<AlarmAudioRemoved>(origin, "DELETE", `/api/v1/alarm-audio/sounds/${source}`);

/** Stores the WAVE file (16 kHz, 16-bit, mono PCM) as the sound of an origin; from outside the house the server asks for the proof of identity again, once. */
export async function uploadAlarmSound(origin: string, source: AlarmAudioSource, wave: Uint8Array): Promise<AlarmAudioSound> {
  const send = (): Promise<Response> => timedFetch(endpoint(origin, `/api/v1/alarm-audio/sounds/${source}`), {
    method: "PUT", headers: { Accept: "application/json", "Content-Type": "audio/wav" }, ...localSession, body: new Blob([wave as BlobPart], { type: "audio/wav" }),
  });
  let response = await send();
  let parsed = await response.json().catch(() => ({})) as AlarmAudioSound & { code?: string; error?: string };
  if (response.status === 403 && parsed.code === "elevation_required" && await askElevation(origin)) {
    response = await send();
    parsed = await response.json().catch(() => ({})) as AlarmAudioSound & { code?: string; error?: string };
  }
  if (!response.ok) throw new ApiError(response.status, typeof parsed.error === "string" && /^[a-z_]+$/.test(parsed.error) ? parsed.error : typeof parsed.code === "string" ? parsed.code : "generic");
  return parsed;
}

/** The samples stored for an origin (16 kHz, 16-bit, mono PCM), to listen to them. */
export async function fetchAlarmSound(origin: string, source: AlarmAudioSource): Promise<ArrayBuffer> {
  const response = await timedFetch(endpoint(origin, `/api/v1/alarm-audio/sounds/${source}`), { headers: { Accept: "audio/L16" }, ...localSession });
  if (!response.ok) throw new ApiError(response.status, "generic");
  return response.arrayBuffer();
}
