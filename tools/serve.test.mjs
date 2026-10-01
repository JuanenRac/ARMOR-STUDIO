import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import https from "node:https";
import os from "node:os";
import path from "node:path";

/** A real, throwaway self-signed certificate - the exact command README.md's own
 * "TLS / HTTPS" section documents for local testing, not a fixture committed to
 * the repo. Mirrors ARMOR-SERVER's own tests/tls.test.ts, including dropping any
 * inherited OPENSSL_CONF (a developer machine can have one pointing at a config
 * file belonging to a completely different OpenSSL install - found for real on
 * Windows with a stray Laragon-set OPENSSL_CONF). */
async function generateSelfSignedCert(dir) {
  const certPath = path.join(dir, "cert.pem");
  const keyPath = path.join(dir, "key.pem");
  const { OPENSSL_CONF: _unused, ...env } = process.env;
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", keyPath, "-out", certPath, "-days", "1", "-subj", "/CN=localhost",
  ], { env });
  return { certPath, keyPath };
}

let server;
let base;

beforeAll(async () => {
  const dist = await mkdtemp(path.join(os.tmpdir(), "armor-studio-"));
  await mkdir(path.join(dist, "assets"));
  await writeFile(path.join(dist, "index.html"), "<!doctype html><title>studio</title>");
  await writeFile(path.join(dist, "assets", "app-abc.js"), "console.log(1)");
  process.env.ARMOR_STUDIO_DIST = dist;
  process.env.ARMOR_SERVER_ORIGIN = "http://10.0.0.5:18080";
  const { createStudioServer } = await import("./serve.mjs");
  server = createStudioServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise(resolve => server.close(resolve)));

describe("Studio static host", () => {
  it("serves the app with security headers", async () => {
    const response = await fetch(`${base}/`);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toContain("connect-src 'self' http://10.0.0.5:18080 ws://10.0.0.5:18080");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });

  it("publishes the server origin the deployment configured", async () => {
    const body = await (await fetch(`${base}/armor-config.json`)).json();
    expect(body).toEqual({ serverOrigin: "http://10.0.0.5:18080" });
  });

  it("falls back to the app for client routes but not for missing files", async () => {
    expect((await fetch(`${base}/site/designer`)).status).toBe(200);
    expect((await fetch(`${base}/assets/missing.js`)).status).toBe(404);
  });

  it("caches hashed assets and never the entry page", async () => {
    expect((await fetch(`${base}/assets/app-abc.js`)).headers.get("cache-control")).toContain("immutable");
    expect((await fetch(`${base}/`)).headers.get("cache-control")).toBe("no-cache");
  });

  it("refuses path traversal and other methods", async () => {
    const traversal = await fetch(`${base}/..%2f..%2fetc%2fpasswd`);
    expect([400, 404, 200]).toContain(traversal.status);
    expect(await traversal.text()).not.toContain("root:");
    expect((await fetch(`${base}/`, { method: "POST" })).status).toBe(405);
  });
});

describe("more than one address for the same Studio", () => {
  const both = "http://192.168.0.180:18080, http://203.0.113.7:2600/";

  // The module reads its environment when it is first loaded, which beforeAll above arranges: it is imported here, not at the top.
  const load = () => import("./serve.mjs");

  it("reads a comma-separated list, normalised, and drops what is not an http origin", async () => {
    const { parseServerOrigins } = await load();
    expect(parseServerOrigins(both)).toEqual(["http://192.168.0.180:18080", "http://203.0.113.7:2600"]);
    expect(parseServerOrigins("javascript:alert(1), ftp://x, nonsense, http://a:1, http://a:1")).toEqual(["http://a:1"]);
    expect(parseServerOrigins(undefined)).toEqual([]);
  });

  it("lets the browser talk to every configured server", async () => {
    const { contentSecurityPolicyFor, parseServerOrigins } = await load();
    const policy = contentSecurityPolicyFor(parseServerOrigins(both));
    expect(policy).toContain("connect-src 'self' http://192.168.0.180:18080 ws://192.168.0.180:18080 http://203.0.113.7:2600 ws://203.0.113.7:2600 ");
    expect(policy).toContain("img-src 'self' data: blob: http://192.168.0.180:18080 http://203.0.113.7:2600 ");
    expect(policy).toContain("default-src 'self'; script-src 'self';");
  });

  it("offers a visitor the server with the host name they used, and the first otherwise", async () => {
    const { parseServerOrigins, pickServerOrigin } = await load();
    const origins = parseServerOrigins(both);
    expect(pickServerOrigin(origins, "203.0.113.7:2601")).toBe("http://203.0.113.7:2600");
    expect(pickServerOrigin(origins, "192.168.0.180:18081")).toBe("http://192.168.0.180:18080");
    expect(pickServerOrigin(origins, "studio.example:80")).toBe("http://192.168.0.180:18080");
    expect(pickServerOrigin([], "x")).toBeNull();
  });
});

describe("wrapWithTls", () => {
  it("returns the same server unchanged when neither TLS var is set", async () => {
    const { createStudioServer, wrapWithTls } = await import("./serve.mjs");
    const plain = createStudioServer();
    expect(wrapWithTls(plain, {})).toBe(plain);
  });

  it("refuses to start with only one of TLS_CERT_PATH/TLS_KEY_PATH set", async () => {
    const { createStudioServer, wrapWithTls } = await import("./serve.mjs");
    expect(() => wrapWithTls(createStudioServer(), { TLS_CERT_PATH: "/x/cert.pem" })).toThrow();
    expect(() => wrapWithTls(createStudioServer(), { TLS_KEY_PATH: "/x/key.pem" })).toThrow();
  });

  it("with both set, really answers over HTTPS with the real handshake", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "armor-studio-tls-"));
    const { certPath, keyPath } = await generateSelfSignedCert(dir);
    const { createStudioServer, wrapWithTls } = await import("./serve.mjs");
    const tlsServer = wrapWithTls(createStudioServer(), { TLS_CERT_PATH: certPath, TLS_KEY_PATH: keyPath });
    await new Promise(resolve => tlsServer.listen(0, "127.0.0.1", resolve));
    const port = tlsServer.address().port;
    try {
      const body = await new Promise((resolve, reject) => {
        // A self-signed cert has no real chain of trust - the point of this test
        // is that the TLS handshake itself succeeds at all (a plain HTTP client
        // against this same port would fail with a protocol error instead, the
        // real SSL_ERROR_RX_RECORD_TOO_LONG this fix exists for).
        const request = https.get(
          { hostname: "127.0.0.1", port, path: "/armor-config.json", rejectUnauthorized: false },
          response => {
            let data = "";
            response.on("data", chunk => { data += chunk; });
            response.on("end", () => resolve(data));
          },
        );
        request.on("error", reject);
      });
      expect(JSON.parse(body)).toEqual({ serverOrigin: "http://10.0.0.5:18080" });
    } finally {
      await new Promise(resolve => tlsServer.close(resolve));
    }
  });
});

describe("readSavedConnection", () => {
  it("takes the ports an administrator saved and ignores a missing or broken file", async () => {
    const { writeFileSync, mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");
    const { readSavedConnection } = await import("./serve.mjs");
    const dir = mkdtempSync(path.join(tmpdir(), "armor-conn-"));
    const file = path.join(dir, "connection.json");
    expect(readSavedConnection(file)).toEqual({});
    writeFileSync(file, JSON.stringify({ host: "0.0.0.0", port: 18080, studio_port: 19000 }));
    expect(readSavedConnection(file)).toEqual({ port: 18080, studioPort: 19000 });
    writeFileSync(file, JSON.stringify({ port: 0, studio_port: "x" }));
    expect(readSavedConnection(file)).toEqual({ port: undefined, studioPort: undefined });
    writeFileSync(file, "{ broken");
    expect(readSavedConnection(file)).toEqual({});
  });
});
