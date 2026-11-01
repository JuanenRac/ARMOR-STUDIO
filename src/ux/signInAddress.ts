/**
 * The address of the server typed at the sign-in, checked before anything is sent: an empty or malformed address, a scheme that is not http(s) and an address that carries a user name or a
 * password (they would end up in the history and in the logs) are refused with a reason of their own, and a plain-http address on another network is told apart so the screen can warn
 * that the password would travel in clear (or refuse it, when the person chose so in Preferences).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { UX } from "./config";

export type AddressProblem = "empty" | "invalid" | "scheme" | "credentials" | "plain_remote";
export type AddressCheck = { ok: true; origin: string; plainRemote: boolean } | { ok: false; problem: AddressProblem };

/** Whether a host name is on the house network (or this very machine): a private IPv4 range, a loopback, a single-label name or a local suffix. */
export function isLocalHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host === "::1") return true;
  if (/^fe80:/.test(host) || /^f[cd][0-9a-f]{2}:/.test(host)) return true;
  const four = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (four) {
    const [a, b] = [Number(four[1]), Number(four[2])];
    return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
  }
  if (!host.includes(".") && !host.includes(":")) return true;
  return UX.signIn.localSuffixes.some(suffix => host.endsWith(suffix));
}

export function checkServerAddress(input: string, refusePlainRemote = false): AddressCheck {
  const typed = input.trim();
  if (!typed) return { ok: false, problem: "empty" };
  let url: URL;
  try { url = new URL(typed); } catch { return { ok: false, problem: "invalid" }; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, problem: "scheme" };
  if (url.username || url.password) return { ok: false, problem: "credentials" };
  const plainRemote = url.protocol === "http:" && !isLocalHost(url.hostname);
  if (plainRemote && refusePlainRemote) return { ok: false, problem: "plain_remote" };
  return { ok: true, origin: url.origin, plainRemote };
}

/** The key of the text that tells a problem. */
export const addressProblemKey = (problem: AddressProblem): string => `ux_addr_${problem}`;
