import { expect, test } from "@playwright/test";

// The tests of the nginx of the container image, with the real server behind it. They run only when Studio is served by that nginx (ARMOR_E2E_NGINX=1), because on the dev server of Vite
// the headers and the proxy are not the same.
const behindNginx = process.env.ARMOR_E2E_NGINX === "1";
const user = process.env.ARMOR_STUDIO_USER ?? "";
const password = process.env.ARMOR_STUDIO_PASSWORD ?? "";

test.describe("the nginx of the image", () => {
  test.skip(!behindNginx, "set ARMOR_E2E_NGINX=1 when Studio is served by the nginx of the image");

  test("answers its own health and tells the client which server to start with", async ({ request }) => {
    const health = await request.get("/healthz");
    expect(health.status()).toBe(200);
    expect(await health.json()).toEqual({ ok: true, service: "armor-studio" });
    const config = await request.get("/armor-config.json");
    expect(config.status()).toBe(200);
    expect(await config.json()).toEqual({ serverOrigin: "same-origin" });
    expect(config.headers()["cache-control"]).toBe("no-store");
    expect(config.headers()["content-security-policy"]).toContain("default-src 'self'");
  });

  test("sends the security headers with the page, with a file of /assets/ and with the fallback to the page", async ({ request }) => {
    const page = await request.get("/");
    expect(page.status()).toBe(200);
    const html = await page.text();
    const asset = /(?:src|href)="(\/assets\/[^"]+\.js)"/.exec(html)?.[1];
    expect(asset, "the page loads a script from /assets/").toBeTruthy();
    const script = await request.get(asset!);
    const unknown = await request.get("/a/page/that/is/only/a/route");
    for (const [name, response] of [["/", page], [asset!, script], ["a route of the page", unknown]] as const) {
      const headers = response.headers();
      expect(response.status(), name).toBe(200);
      expect(headers["content-security-policy"], `${name}: CSP`).toContain("script-src 'self'");
      expect(headers["x-content-type-options"], `${name}: nosniff`).toBe("nosniff");
      expect(headers["referrer-policy"], `${name}: referrer`).toBe("no-referrer");
      expect(headers["cross-origin-opener-policy"], `${name}: opener`).toBe("same-origin");
      expect(headers["permissions-policy"], `${name}: permissions`).toContain("camera=()");
    }
    expect(page.headers()["cache-control"]).toBe("no-cache");
    expect(script.headers()["cache-control"]).toContain("immutable");
    expect(unknown.headers()["content-type"]).toContain("text/html");
  });

  test("hands /api/ to the server and tells it who is really asking and by which protocol", async ({ request }) => {
    test.skip(!user || !password, "set ARMOR_STUDIO_USER and ARMOR_STUDIO_PASSWORD");
    const refused = await request.get("/api/v1/status");
    expect(refused.status(), "the server answers, not nginx").toBe(401);
    const signedIn = await request.post("/api/v1/studio/session", { data: { username: user, password } });
    expect(signedIn.status()).toBe(201);
    const seen = async (headers: Record<string, string>) => (await (await request.get("/api/v1/remote/check", { headers })).json()) as { ip: string; protocol: string; forwarded_for: string | null };
    const plain = await seen({ "X-Forwarded-For": "203.0.113.7" });
    expect(plain.ip, "the address in X-Forwarded-For, believed because nginx is a named proxy").toBe("203.0.113.7");
    expect(plain.protocol, "reached directly, the protocol is the one of the connection").toBe("http");
    expect(plain.forwarded_for).toContain("203.0.113.7");
    expect((await seen({ "X-Forwarded-Proto": "https" })).protocol, "a proxy in front that ended the https says so and nginx passes it on").toBe("https");
  });
});
