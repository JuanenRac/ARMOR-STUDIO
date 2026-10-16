/**
 * What can be read off the public address the network node reports, to show it plainly: the network number and the provider's name apart (`AS12430 VODAFONE ESPANA S.A.U.`), the
 * country by its name in the language of the interface and its flag, the time there, and whether it is an IPv4 or an IPv6 address. Nothing here is asked of the Internet: it is all
 * worked out from the block the node already sent.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { NetworkPublic } from "./networkModel";

export type PublicFacts = { asn?: string; isp?: string; version: 4 | 6; country?: string; flag?: string; localTime?: string };

/** The flag of a two-letter country code, as the two regional-indicator letters; undefined for anything else. */
export function flagOf(code: string | undefined): string | undefined {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return undefined;
  return String.fromCodePoint(...Array.from(code.toUpperCase()).map(letter => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

export function publicFacts(info: NetworkPublic, language: string, now: number): PublicFacts {
  const org = info.org?.trim();
  const match = org ? /^AS(\d{1,10})\s+(.+)$/i.exec(org) : null;
  const facts: PublicFacts = { version: info.ip.includes(":") ? 6 : 4 };
  if (match) { facts.asn = `AS${match[1]}`; facts.isp = match[2]!.trim(); } else if (org) facts.isp = org;
  const code = info.country?.trim();
  if (code) {
    try { facts.country = new Intl.DisplayNames([language], { type: "region" }).of(code.toUpperCase()) ?? code; } catch { facts.country = code; }
    const flag = flagOf(code);
    if (flag) facts.flag = flag;
  }
  if (info.timezone) {
    try { facts.localTime = new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit", timeZone: info.timezone }).format(now); } catch { /* an unknown zone: the time is left out */ }
  }
  return facts;
}
