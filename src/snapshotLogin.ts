/**
 * A snapshot address is loaded by the browser itself, from the page: a login written in it (user:password@camera, or ?pwd=... as many cameras ask) would end up in the browser's storage,
 * in the exported file and in every copy of the plan. The server refuses such an address and shows a stored one with the login hidden ("***"); Studio refuses it before sending it and
 * never keeps one it finds in what it restores.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
const LOGIN_PARAMETER = /[?&](?:user|username|usr|login|pass|passwd|password|pwd|token|key|secret|auth)=([^&\s]*)/gi;

/** Whether the address carries a real login (one already hidden as "***" does not). */
export function snapshotHasLogin(url: string): boolean {
  const userinfo = /:\/\/([^/\s@]*)@/.exec(url);
  if (userinfo && userinfo[1] !== "***") return true;
  for (const match of url.matchAll(LOGIN_PARAMETER)) if (match[1] !== "***" && match[1] !== "") return true;
  return false;
}
