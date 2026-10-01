#!/usr/bin/env node
/**
 * Static host for the A.R.M.O.R. Studio build (dist/).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 *
 * Serves the built single-page application with conservative security headers
 * and publishes /armor-config.json so one build can start against any server.
 * It needs no dependency beyond Node and never proxies or stores anything.
 *
 *   ARMOR_STUDIO_HOST          bind address        (default 127.0.0.1)
 *   ARMOR_STUDIO_PORT          port                (default 5178)
 *   ARMOR_STUDIO_DIST          build directory     (default ./dist)
 *   ARMOR_SERVER_ORIGIN        server Studio should start with, e.g. http://192.168.0.180:18080; a comma-separated list when the
 *                              same Studio is reached by more than one address (the LAN one and a public one): the first is the
 *                              default, and the one that shares its host name with the request is offered to that visitor
 *   ARMOR_CONNECTION_FILE      the connection.json an administrator saves from Studio (in ARMOR-SERVER's data directory): its studio_port wins over
 *                              ARMOR_STUDIO_PORT and its port is the port of the server Studio is offered; a missing or broken file changes nothing
 *   TLS_CERT_PATH/TLS_KEY_PATH set both to serve this static host itself over HTTPS too, same convention as ARMOR-SERVER's own
 *                              (src/app.ts) - off (today's plain HTTP) unless both are set. A browser given an https:// address
 *                              for Studio gets a real TLS handshake instead of feeding it a TLS ClientHello a plain HTTP server
 *                              cannot parse (Firefox's own SSL_ERROR_RX_RECORD_TOO_LONG - found for real trying exactly that).
 */
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { readFile, stat } from "node:fs/promises";
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(process.env.ARMOR_STUDIO_DIST ?? path.join(here, "..", "dist"));
const host = process.env.ARMOR_STUDIO_HOST?.trim() || "127.0.0.1";
/** The saved connection settings: only whole ports from 1 to 65535 are taken, anything else is ignored. */
export function readSavedConnection(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const valid = value => (Number.isInteger(value) && value >= 1 && value <= 65535 ? value : undefined);
    return { port: valid(parsed?.port), studioPort: valid(parsed?.studio_port) };
  } catch { return {}; }
}
const savedConnection = process.env.ARMOR_CONNECTION_FILE ? readSavedConnection(process.env.ARMOR_CONNECTION_FILE) : {};
const port = savedConnection.studioPort ?? Number(process.env.ARMOR_STUDIO_PORT ?? 5178);

/** The server origins of a comma-separated setting, each normalised (scheme, host and port only); anything that is not an http(s) origin is dropped. */
export function parseServerOrigins(value) {
  const origins = [];
  for (const item of (value ?? "").split(",")) {
    const text = item.trim();
    if (!text) continue;
    try {
      const url = new URL(text);
      if ((url.protocol === "http:" || url.protocol === "https:") && !origins.includes(url.origin)) origins.push(url.origin);
    } catch { /* not a URL: ignored */ }
  }
  return origins;
}

/** The origin to offer a visitor: the one whose host name is the one they used to reach Studio, else the first. */
export function pickServerOrigin(origins, hostHeader) {
  if (origins.length === 0) return null;
  const asked = String(hostHeader ?? "").replace(/:\d+$/, "").toLowerCase();
  return origins.find(origin => new URL(origin).hostname.toLowerCase() === asked) ?? origins[0];
}

const serverOrigins = parseServerOrigins(process.env.ARMOR_SERVER_ORIGIN).map(origin => {
  if (savedConnection.port === undefined) return origin;
  const url = new URL(origin);
  url.port = String(savedConnection.port);
  return url.origin;
});

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".map": "application/json", ".txt": "text/plain; charset=utf-8",
};

// The console only talks to the configured server(s) and shows camera frames from them.
export function contentSecurityPolicyFor(origins) {
  const connect = ["'self'", ...(origins.length ? origins.flatMap(origin => [origin, origin.replace(/^http/, "ws")]) : ["http:", "ws:"])].join(" ");
  const media = ["'self'", "data:", "blob:", ...(origins.length ? origins : ["http:", "https:"])].join(" ");
  return `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src ${media}; media-src ${media}; connect-src ${connect}; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`;
}

const SECURITY_HEADERS = {
  "Content-Security-Policy": contentSecurityPolicyFor(serverOrigins),
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/** Resolve a request path inside dist, or null when it would leave it. */
export function resolveInside(root, urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath.split("?")[0]); } catch { return null; }
  if (decoded.includes("\0")) return null;
  const target = path.resolve(root, "." + path.posix.normalize("/" + decoded));
  return target === root || target.startsWith(root + path.sep) ? target : null;
}

async function fileOrNull(target) {
  try { return (await stat(target)).isFile() ? target : null; } catch { return null; }
}

export function createStudioServer() {
  return createServer(async (request, response) => {
    const send = (status, body, headers = {}) => {
      response.writeHead(status, { ...SECURITY_HEADERS, ...headers });
      response.end(request.method === "HEAD" ? undefined : body);
    };
    if (request.method !== "GET" && request.method !== "HEAD") return send(405, "method not allowed", { Allow: "GET, HEAD" });
    const urlPath = request.url ?? "/";
    if (urlPath.split("?")[0] === "/armor-config.json") {
      return send(200, JSON.stringify({ serverOrigin: pickServerOrigin(serverOrigins, request.headers.host) }), { "Content-Type": TYPES[".json"], "Cache-Control": "no-store" });
    }
    if (urlPath.split("?")[0] === "/healthz") return send(200, JSON.stringify({ ok: true, service: "armor-studio" }), { "Content-Type": TYPES[".json"] });
    const target = resolveInside(dist, urlPath);
    if (!target) return send(400, "bad request");
    const asked = await fileOrNull(target);
    // A path with an extension that is missing is a real 404; anything else is a client-side route.
    const file = asked ?? (path.extname(target) ? null : await fileOrNull(path.join(dist, "index.html")));
    if (!file) return send(404, "not found");
    const immutable = file.includes(`${path.sep}assets${path.sep}`);
    try {
      return send(200, await readFile(file), {
        "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream",
        "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
      });
    } catch { return send(500, "read failed"); }
  });
}

/** Wraps a plain http.Server's own request listener in an https.Server instead,
 * when both TLS_CERT_PATH and TLS_KEY_PATH are set - same env-var convention
 * and same all-or-nothing check as ARMOR-SERVER's own (src/app.ts), so a
 * typo'd variable name is a loud start-up crash, never a silent fallback to
 * plain HTTP. */
export function wrapWithTls(server, env = process.env) {
  const certPath = env.TLS_CERT_PATH?.trim() || "";
  const keyPath = env.TLS_KEY_PATH?.trim() || "";
  if (!certPath && !keyPath) return server;
  if (!certPath || !keyPath) throw new Error("TLS_CERT_PATH and TLS_KEY_PATH must both be set to enable HTTPS, or both left unset to keep plain HTTP");
  const requestListener = server.listeners("request")[0];
  return createHttpsServer({ cert: readFileSync(certPath), key: readFileSync(keyPath) }, requestListener);
}

// Compare real paths: the service starts this file through a `current` symlink.
const isEntryPoint = () => { try { return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
if (isEntryPoint()) {
  const tlsEnabled = Boolean(process.env.TLS_CERT_PATH?.trim() && process.env.TLS_KEY_PATH?.trim());
  const server = wrapWithTls(createStudioServer());
  if (tlsEnabled) console.log(`ARMOR_STUDIO=TLS_ENABLED cert=${process.env.TLS_CERT_PATH} key=${process.env.TLS_KEY_PATH}`);
  server.listen(port, host, () => console.log(`ARMOR_STUDIO=LISTENING address=${host}:${port} scheme=${tlsEnabled ? "https" : "http"}`));
}
