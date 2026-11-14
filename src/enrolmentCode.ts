/**
 * The text of the QR code that sets up an app on a phone: the address of the installation, the fingerprint (SHA-256) of its local authority and a code of one use that the server made for
 * five minutes. The code holds no password and opens no session: the person still types their user and password. The apps read exactly this text and refuse anything else.
 *   armor-enrol:{"ca":"<64 hex or empty>","code":"<base64url>","origin":"https://host[:port]","v":1}
 * The installation profiles (a name and an https address each, no secret) are kept in this browser only.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import qrcode from "qrcode-generator";

export const ENROL_PREFIX = "armor-enrol";
export const ENROL_VERSION = 1;
const MAX_TEXT = 300;
const CODE = /^[A-Za-z0-9_-]{16,64}$/;
const FINGERPRINT = /^[0-9a-f]{64}$/;
export const PROFILES_KEY = "armor.enrolment.profiles";
export const MAX_PROFILES = 10;

export type Enrolment = { origin: string; code: string; ca: string };
export type InstallationProfile = { name: string; origin: string };

/** The https address of an installation as a phone should use it (scheme, host and port only), or null when it is not one. */
export function cleanOrigin(value: unknown): string | null {
  if (typeof value !== "string" || !value || value.length > 200) return null;
  if ([...value].some(c => c.charCodeAt(0) < 33 || c.charCodeAt(0) === 127)) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || !url.hostname || url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== "/" && url.pathname !== "") return null;
  return url.origin;
}

/** The text to turn into a QR code (keys in alphabetical order); null when the address, the code or the fingerprint are not valid. `ca` is null when the server names no authority. */
export function buildEnrolment(origin: string, code: string, ca: string | null): string | null {
  const clean = cleanOrigin(origin);
  if (clean === null || !CODE.test(code) || (ca !== null && !FINGERPRINT.test(ca))) return null;
  return `${ENROL_PREFIX}:${JSON.stringify({ ca: ca ?? "", code, origin: clean, v: ENROL_VERSION })}`;
}

/** Reads a scanned text; null when it is not exactly what `buildEnrolment` writes. */
export function parseEnrolment(text: unknown): Enrolment | null {
  if (typeof text !== "string" || !text.startsWith(`${ENROL_PREFIX}:`) || text.length > MAX_TEXT) return null;
  let body: unknown;
  try { body = JSON.parse(text.slice(ENROL_PREFIX.length + 1)); } catch { return null; }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const fields = body as Record<string, unknown>;
  if (Object.keys(fields).sort().join(",") !== "ca,code,origin,v" || fields.v !== ENROL_VERSION) return null;
  const origin = cleanOrigin(fields.origin);
  if (origin === null || typeof fields.code !== "string" || !CODE.test(fields.code)) return null;
  if (typeof fields.ca !== "string" || (fields.ca !== "" && !FINGERPRINT.test(fields.ca))) return null;
  return { origin, code: fields.code, ca: fields.ca };
}

/** The code drawn as an SVG text (black on white with the quiet border a scanner needs). */
export function enrolmentSvg(text: string): string {
  const code = qrcode(0, "M");
  code.addData(text);
  code.make();
  return code.createSvgTag({ cellSize: 5, margin: 4, scalable: true });
}

/** The profiles read from what the browser kept; whatever is not a name and an https address is dropped. */
export function parseProfiles(raw: string | null): InstallationProfile[] {
  if (!raw) return [];
  let list: unknown;
  try { list = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(list)) return [];
  const profiles: InstallationProfile[] = [];
  for (const item of list.slice(0, MAX_PROFILES)) {
    const entry = item as { name?: unknown; origin?: unknown };
    const origin = cleanOrigin(entry?.origin);
    if (typeof entry?.name === "string" && entry.name.trim() && origin) profiles.push({ name: entry.name.trim().slice(0, 40), origin });
  }
  return profiles;
}

export function loadProfiles(): InstallationProfile[] {
  try { return parseProfiles(window.localStorage.getItem(PROFILES_KEY)); } catch { return []; }
}

export function saveProfiles(profiles: InstallationProfile[]): void {
  try { window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles.slice(0, MAX_PROFILES))); } catch { /* storage may be blocked */ }
}

/** Adds (or replaces, by name) a profile; null when the name is empty, the address is not https or there are too many. */
export function withProfile(profiles: InstallationProfile[], name: string, origin: string): InstallationProfile[] | null {
  const clean = cleanOrigin(origin.trim());
  const label = name.trim().slice(0, 40);
  if (!label || clean === null) return null;
  const others = profiles.filter(profile => profile.name !== label);
  return others.length >= MAX_PROFILES ? null : [...others, { name: label, origin: clean }];
}
