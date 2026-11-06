/**
 * The text of the provisioning QR code: the id of a node and the address of the server, nothing else (the same text the shared Python library writes and reads).
 * The code carries no password, no token and no certificate; reading it refuses anything that could hold a secret.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import qrcode from "qrcode-generator";

export const PROVISION_PREFIX = "armor-provision";
export const PROVISION_VERSION = 1;
const MAX_TEXT = 256;
const NODE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export type Provisioning = { node_id: string; server: string };

/** The server address as the code holds it, or null when it is not an address without a secret in it. */
export function cleanServer(server: unknown): string | null {
  if (typeof server !== "string" || !server || server.length > MAX_TEXT) return null;
  if ([...server].some(c => c.charCodeAt(0) < 33 || c.charCodeAt(0) === 127)) return null;
  if (server.includes("?") || server.includes("#") || server.includes("@")) return null;
  let url: URL;
  try { url = new URL(server); } catch { return null; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname || url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== "/" && url.pathname !== "") return null;
  return server.replace(/\/+$/, "");
}

/** Whether the text is a valid node id. */
export function validNodeId(nodeId: unknown): nodeId is string {
  return typeof nodeId === "string" && NODE_ID.test(nodeId);
}

/** The text to turn into a QR code (the keys in alphabetical order, as the shared library writes them); null when the id or the server are not valid. */
export function buildProvisioning(nodeId: string, server: string): string | null {
  const clean = cleanServer(server);
  if (!validNodeId(nodeId) || clean === null) return null;
  return `${PROVISION_PREFIX}:${JSON.stringify({ node_id: nodeId, server: clean, v: PROVISION_VERSION })}`;
}

/** Reads the text of a scanned code; null when it is not exactly what `buildProvisioning` writes. */
export function parseProvisioning(text: unknown): Provisioning | null {
  if (typeof text !== "string" || !text.startsWith(`${PROVISION_PREFIX}:`) || text.length > 2 * MAX_TEXT) return null;
  let body: unknown;
  try { body = JSON.parse(text.slice(PROVISION_PREFIX.length + 1)); } catch { return null; }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const fields = body as Record<string, unknown>;
  const keys = Object.keys(fields).sort();
  if (keys.join(",") !== "node_id,server,v" || fields.v !== PROVISION_VERSION) return null;
  const server = cleanServer(fields.server);
  if (!validNodeId(fields.node_id) || server === null) return null;
  return { node_id: fields.node_id, server };
}

/** The code drawn as an SVG text (black on white with the quiet border a scanner needs). */
export function provisioningSvg(text: string): string {
  const code = qrcode(0, "M");
  code.addData(text);
  code.make();
  return code.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
}
