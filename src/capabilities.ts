/**
 * What the signed-in person may do and what the server offers, from one place. A server that announces its capabilities (the `capabilities` field of the session) is believed;
 * an older one does not send the field, and then everything the role allowed before stays allowed (and what needs a feature only the new server has stays hidden).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Role } from "./api/users";

export type CapabilityAction = "arm" | "disarm" | "acknowledge" | "operate" | "camera_control" | "administer" | "manage_users" | "security_settings";
export type SecurityOptions = {
  "alarm.disarm_pin": "never" | "if_set" | "always";
  "voice.silence_confirmation": "off" | "pin" | "double_turn";
  "alarm.config_hash": boolean;
  "server.zone_feed": boolean;
  "server.zone_feed_signature": boolean;
  "media.rtsp_proxy": boolean;
  "network.login_secure_only": boolean;
  "voice.multipart_turn": boolean;
  "panel.live_events": boolean;
  "client.device_lock": "user" | "sensitive" | "always";
  /** The most audio of a spoken turn and the most spoken answer handed back to the wall panel, in bytes. */
  "voice.turn_max_bytes": number;
  "voice.reply_audio_max_bytes": number;
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
