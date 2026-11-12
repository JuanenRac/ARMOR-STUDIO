/**
 * What the signed-in person may do and what the server offers, from one place. A server that announces its capabilities (the `capabilities` field of the session) is believed;
 * an older one does not send the field, and then everything the role allowed before stays allowed (and what needs a feature only the new server has stays hidden).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Role } from "./api/users";

export type CapabilityAction = "arm" | "disarm" | "acknowledge" | "operate" | "camera_control" | "administer" | "manage_users" | "security_settings";
export type SecurityOptions = {
  "alarm.disarm_pin": "never" | "if_set" | "always";
  "voice.silence_confirmation": "off" | "pin" | "double_turn" | "challenge";
  /** The arming modes Home and Night, the PIN to go to a mode that defends less, and the timetable of the modes (the server announces them only when it has them). */
  "alarm.arming_modes": boolean;
  "alarm.mode_downgrade_pin": "required" | "not_required";
  "alarm.mode_schedule": boolean;
  "alarm.mode_schedule_lowers": boolean;
  /** Choosing a mode also arms the alarm panels with the matching profile (away, stay, night). */
  "alarm.mode_panel_sync": boolean;
  "alarm.config_hash": boolean;
  /** A warning in the alarm centre while the wiring of the siren of a panel is open, shorted or unreadable (on by default). */
  "alarm.siren_fault_notice": boolean;
  "server.zone_feed": boolean;
  "server.zone_feed_signature": boolean;
  "media.rtsp_proxy": boolean;
  "network.login_secure_only": boolean;
  /** An administrator may download the public certificate of the local CA of the LAN (off by default). */
  "network.lan_ca": boolean;
  /** How many days snapshots and recordings are kept, each kind on its own (0 to 3650; 0: the general limit of the server). */
  "media.retention_snapshot_days": number;
  "media.retention_recording_days": number;
  /** The three features of the second phase of ARMOR-VISION that read personal data (all off by default); each can only be on once its acknowledgement of the privacy notice is. */
  "vision.semantic_search": boolean;
  "vision.plates": boolean;
  "vision.faces": boolean;
  "vision.semantic_search_ack": boolean;
  "vision.plates_ack": boolean;
  "vision.faces_ack": boolean;
  /** GET /metrics answers the numbers of the server in the Prometheus text form (needs ARMOR_METRICS_TOKEN). */
  "metrics.prometheus": boolean;
  /** The server pings ARMOR_HEARTBEAT_URL so a service outside the house can tell when it stops. */
  "heartbeat.enabled": boolean;
  /** The server keeps a copy of the node traffic in a file the simulator plays again (off by default); its size limit and rotation are set in the environment of the server. */
  "ingest.recording": boolean;
  "login.country_alert": boolean;
  "electrical.set_aside_old_readings": boolean;
  "voice.multipart_turn": boolean;
  "voice.wake_word": boolean;
  /** The secret panic phrase of each person raises the silent duress alarm (off by default), and the quiet time in seconds after one (10 to 3600, 60). */
  "voice.panic_phrase": boolean;
  "voice.panic_cooldown_s": number;
  "admin.acl_relays": boolean;
  "admin.field_http": boolean;
  "panel.live_events": boolean;
  "client.device_lock": "user" | "sensitive" | "always";
  /** A phone may register a key pair that stays in it and renew its session by signing a challenge (off by default), and how many hours that session lasts (1 to 720, 72). */
  "client.trusted_devices": boolean;
  "client.trusted_session_h": number;
  "nodes.nvs_encryption": "off" | "secrets";
  /** The most audio of a spoken turn and the most spoken answer handed back to the wall panel, in bytes. */
  "voice.turn_max_bytes": number;
  "voice.reply_audio_max_bytes": number;
  /** The alarm said out loud and the sounds of your own for the wall panel (both off by default). */
  "alarm_audio.spoken": boolean;
  "alarm_audio.custom_sounds": boolean;
  /** The summary of a day and the activity heat map for administrators and operators (both off by default). */
  "summary.daily": boolean;
  "vision.heatmap": boolean;
  /** How the two reports are tuned: the seconds one may run, how many may wait, how many requests a minute (an older server does not announce them). */
  /** Where the live ARMOR-VISION service listens (empty: not set up) and whether it may be on another machine (off: only this machine). */
  "vision.service_url": string;
  "vision.service_remote": boolean;
  /** Read only: whether the server holds a token for the vision service (the token itself is never sent). */
  "vision.service_token_set": boolean;
  /** What the summary of a day is made from: the days of readings kept, how often a sensor and the house power are logged, and the seconds within which a disarm makes an intrusion a false alarm. */
  "summary.log_days": number;
  "summary.reading_every_s": number;
  "summary.power_every_s": number;
  "summary.false_alarm_s": number;
  "reports.timeout_s": number;
  "reports.queue_max": number;
  "reports.requests_per_minute": number;
};
/** As the server sends it. */
export type AnnouncedCapabilities = {
  version: number;
  actions: Partial<Record<CapabilityAction, boolean>>;
  features: string[];
  security?: Partial<SecurityOptions> & { locked?: string[] };
};
export type Capabilities = {
  /** True when the server announced them; false when they were worked out from the role (an older server). */
  announced: boolean;
  can: (action: CapabilityAction) => boolean;
  has: (feature: string) => boolean;
  security: (Partial<SecurityOptions> & { locked?: string[] }) | null;
};

/** Reads the field of the session; null when it is missing or not the shape of this version. */
export function parseCapabilities(value: unknown): AnnouncedCapabilities | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || typeof raw.actions !== "object" || raw.actions === null) return null;
  const actions: Partial<Record<CapabilityAction, boolean>> = {};
  for (const [key, flag] of Object.entries(raw.actions)) if (typeof flag === "boolean") actions[key as CapabilityAction] = flag;
  const features = Array.isArray(raw.features) ? raw.features.filter((item): item is string => typeof item === "string") : [];
  const security = typeof raw.security === "object" && raw.security !== null ? raw.security as AnnouncedCapabilities["security"] : undefined;
  return { version: 1, actions, features, security };
}

/** What a role could do before the server announced anything: administrators everything, operators everything but the administration, viewers nothing that changes. */
const BY_ROLE: Record<Role, CapabilityAction[]> = {
  admin: ["arm", "disarm", "acknowledge", "operate", "camera_control", "administer", "manage_users", "security_settings"],
  operator: ["arm", "disarm", "acknowledge", "operate", "camera_control"],
  viewer: [],
  panel: [],
};

export function resolveCapabilities(role: Role | undefined, announced: AnnouncedCapabilities | null | undefined): Capabilities {
  if (announced) {
    return {
      announced: true,
      // an action the server did not name is not allowed: a newer action must not appear on its own
      can: action => announced.actions[action] === true,
      has: feature => announced.features.includes(feature),
      security: announced.security ?? null,
    };
  }
  const allowed = new Set(role ? BY_ROLE[role] : []);
  // `security_settings` needs a route that only the new server has: without the announcement it is not offered, whatever the role.
  allowed.delete("security_settings");
  return { announced: false, can: action => allowed.has(action), has: () => false, security: null };
}
