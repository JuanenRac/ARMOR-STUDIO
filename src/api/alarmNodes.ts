import { userCall } from "./transport";
// ---- the alarm nodes (ARMOR-NODE-ALARM) -------------------------------------------------------------------------------------------------------
export type AlarmPhase = "disarmed" | "exit_delay" | "armed" | "entry_delay" | "alarm";
export type AlarmZoneReading = { id: string; name?: string; kind: "instant" | "entry" | "interior" | "always"; state: "normal" | "triggered" | "tamper" | "trouble"; bypassed: boolean };
export type AlarmEventReading = { ago_s: number; kind: "armed" | "exit_delay_started" | "entry_delay_started" | "alarm" | "siren_timed_out" | "disarmed" | "bad_pin" | "locked_out" | "zone_bypassed" | "siren_silenced"; zone?: string };
export type AlarmState = {
  kind: "alarm"; node_id: string; timestamp_ms: number; phase: AlarmPhase; mode: "disarmed" | "away" | "stay"; siren: boolean; locked_out: boolean; commands_enabled: boolean;
  zones: AlarmZoneReading[]; open_zones: string[]; events: AlarmEventReading[];
  /** The node understands the arming profiles of the arm command (an older firmware does not say so). */
  arm_profiles?: boolean;
  /** The id of the arming profile the panel is armed (or arming) with. */
  profile?: string;
};
export type AlarmNodeView = { node_id: string; state: AlarmState; received_at: string; stale: boolean };
export type AlarmNodes = { nodes: AlarmNodeView[]; totals: { nodes: number; stale: number; armed: number; sounding: number } };
export const listAlarmNodes = (origin: string) => userCall<AlarmNodes>(origin, "GET", "/api/v1/alarm/nodes");
export type AlarmCommandRecord = { command_id: string; node_id: string; action: "arm" | "disarm" | "silence"; mode?: "away" | "stay"; profile?: string; accepted: boolean; refusal: string; phase?: AlarmPhase; actor: string; at: string };
/** A Zigbee device of the registry tied to a zone of an alarm panel: the server tells the panel how that zone is while it holds the radio. */
export type ZoneLink = { device_id: string; node_id: string; zone_id: string };
export const listZoneLinks = (origin: string) => userCall<{ links: ZoneLink[] }>(origin, "GET", "/api/v1/alarm/zone-links");
export const saveZoneLinks = (origin: string, links: ZoneLink[]) => userCall<{ links: ZoneLink[] }>(origin, "PUT", "/api/v1/alarm/zone-links", { links });
export const alarmCommandsStatus = (origin: string) => userCall<{ enabled: boolean; pending: unknown[]; recent: AlarmCommandRecord[] }>(origin, "GET", "/api/v1/alarm/commands");
/** Arm (away or stay, optionally leaving out the zones that are open), disarm a panel or silence its siren (the system stays armed). Arming needs no PIN, but the server, the node and the broker must all have allowed it; disarming and silencing send the PIN of the person when the panel asks for one. */
export const sendAlarmCommand = (origin: string, node: string, action: "arm" | "disarm" | "silence", mode?: "away" | "stay", force = false, pin?: string, profile?: string) =>
  userCall<{ accepted: boolean; command_id: string }>(origin, "POST", "/api/v1/alarm/command", action === "arm" ? { node, action, ...(profile ? { profile } : { mode }), ...(force ? { force: true } : {}) } : { node, action, ...(pin ? { pin } : {}) });
// ---- the arming profiles: the named ways of arming a panel (Away, Home, Night, the owner's own) -------------------------------------------------
export type ArmProfileZone = { id: string; armed?: boolean; delay?: "instant" | "entry" };
export type ArmProfile = { id: string; name: string; base: "away" | "stay"; exit_delay_s?: number; entry_delay_s?: number; siren?: boolean; notify?: "urgent" | "normal"; zones?: ArmProfileZone[] };
export type ArmProfiles = { revision: number; updated_at: string; updated_by: string; profiles: ArmProfile[]; max: number };
export const listArmProfiles = (origin: string) => userCall<ArmProfiles>(origin, "GET", "/api/v1/alarm/profiles");
/** Replaces the whole list; `revision` is the one that was read, and a change made meanwhile is a 409 (code `conflict`). */
export const saveArmProfiles = (origin: string, profiles: ArmProfile[], revision: number) => userCall<ArmProfiles>(origin, "PUT", "/api/v1/alarm/profiles", { profiles, revision });
