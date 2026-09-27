/**
 * Runtime configuration for A.R.M.O.R. Studio.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export const DEFAULT_SERVER_ORIGIN = "http://127.0.0.1:8080";

/** Accept only a plain http(s) origin: no credentials, path, query or fragment. */
export function parseServerOrigin(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) return null;
    return url.origin;
  } catch { return null; }
}

/**
 * The server origin a deployment wants Studio to start with. The static host
 * serves it as /armor-config.json, so one build can run on any test bench or
 * installation. Returns null when the file is absent or invalid.
 */
export async function loadDeploymentOrigin(fetcher: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetcher("/armor-config.json", { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) return null;
    return parseServerOrigin((await response.json() as { serverOrigin?: unknown }).serverOrigin);
  } catch { return null; }
}
