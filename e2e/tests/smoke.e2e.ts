import { expect, test } from "@playwright/test";
import { signIn } from "./support";

// What a person does in the first minutes, against the real server (the CI starts one): sign in, see the live channel work, save the design of the site and find it again after the
// page is loaded anew. The longer walk through every menu is in studio.e2e.ts.
const user = process.env.ARMOR_STUDIO_USER ?? "";
const password = process.env.ARMOR_STUDIO_PASSWORD ?? "";

test.describe("with the server", () => {
  test.skip(!user || !password, "set ARMOR_STUDIO_USER and ARMOR_STUDIO_PASSWORD");

  test("the live channel of the status works through whatever serves Studio", async ({ page }) => {
    await signIn(page);
    // the channel opens, and a change of the system reaches it as a message (the server pushes the state when it changes, not when the channel opens)
    await page.evaluate(() => {
      const heard: string[] = [];
      (window as unknown as { __heard: string[] }).__heard = heard;
      const socket = new WebSocket(`${location.origin.replace(/^http/, "ws")}/api/v1/events`);
      socket.onmessage = event => { try { const message = JSON.parse(String(event.data)); heard.push(`${message.type}:${message.state?.mode}`); } catch { heard.push("not json"); } };
      socket.onopen = () => heard.push("open");
      (window as unknown as { __socket: WebSocket }).__socket = socket;
    });
    await expect.poll(() => page.evaluate(() => (window as unknown as { __heard: string[] }).__heard.includes("open")), { timeout: 15_000 }).toBe(true);
    try {
      expect((await page.request.post("/api/v1/mode", { data: { mode: "armed" } })).status()).toBe(200);
      await expect.poll(() => page.evaluate(() => (window as unknown as { __heard: string[] }).__heard), { timeout: 15_000 }).toContain("state:armed");
    } finally {
      await page.request.post("/api/v1/mode", { data: { mode: "disarmed" } });
      await page.evaluate(() => (window as unknown as { __socket: WebSocket }).__socket.close());
    }
  });

  test("a design of the site is saved and read again, and an old revision is refused", async ({ page }) => {
    await signIn(page);
    const before = await (await page.request.get("/api/v1/site")).json() as { revision: number };
    const note = `smoke ${Date.now()}`;
    const saved = await page.request.put("/api/v1/site", { data: { revision: before.revision, site: { terrain: { points: [] }, note } } });
    expect(saved.status()).toBe(200);
    const { revision } = await saved.json() as { revision: number };
    expect(revision).toBe(before.revision + 1);
    const stale = await page.request.put("/api/v1/site", { data: { revision: before.revision, site: { note: "from an old copy" } } });
    expect(stale.status(), "a copy that is behind does not overwrite").toBe(409);
    await page.reload();
    await expect(page.locator(".sidebar")).toBeVisible();
    const again = await (await page.request.get("/api/v1/site")).json() as { revision: number; site: { note?: string } };
    expect(again.revision).toBe(revision);
    expect(again.site.note).toBe(note);
  });
});
