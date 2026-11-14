import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

type Handler = (event: Record<string, unknown>) => void;

/** Runs public/sw.js against a small fake of the worker scope and gives the handlers it registered. */
function loadWorker() {
  const handlers: Record<string, Handler> = {};
  const cache = { addAll: vi.fn(async () => undefined), put: vi.fn(async () => undefined) };
  const caches = { open: vi.fn(async () => cache), match: vi.fn(async () => undefined), keys: vi.fn(async () => ["armor-studio-shell-v0", "armor-studio-shell-v1", "other"]), delete: vi.fn(async () => true) };
  const scope = { addEventListener: (type: string, handler: Handler) => { handlers[type] = handler; }, location: { origin: "https://panel.example" }, skipWaiting: vi.fn(async () => undefined), clients: { claim: vi.fn(async () => undefined) } };
  const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");
  new Function("self", "caches", "fetch", source)(scope, caches, vi.fn(async () => new Response("ok")));
  return { handlers, caches, cache };
}
const fetchEvent = (path: string, init: { method?: string; mode?: string; origin?: string } = {}) => {
  const respondWith = vi.fn();
  return { event: { request: { method: init.method ?? "GET", url: `${init.origin ?? "https://panel.example"}${path}`, mode: init.mode ?? "same-origin" }, respondWith }, respondWith };
};

describe("the service worker of the wall panel", () => {
  it("never touches what the server answers: /api/ and the address and health files go to the network", () => {
    const { handlers } = loadWorker();
    for (const path of ["/api/v1/status", "/api/v1/alarms", "/armor-config.json", "/healthz"]) {
      const { event, respondWith } = fetchEvent(path);
      handlers.fetch(event);
      expect(respondWith, path).not.toHaveBeenCalled();
    }
  });
  it("leaves alone what is not a GET or not of this site", () => {
    const { handlers } = loadWorker();
    const post = fetchEvent("/assets/app.js", { method: "POST" });
    handlers.fetch(post.event);
    expect(post.respondWith).not.toHaveBeenCalled();
    const other = fetchEvent("/assets/app.js", { origin: "https://elsewhere.example" });
    handlers.fetch(other.event);
    expect(other.respondWith).not.toHaveBeenCalled();
  });
  it("answers the files of the page and the pages from its copy", () => {
    const { handlers } = loadWorker();
    const asset = fetchEvent("/assets/app-1.js");
    handlers.fetch(asset.event);
    expect(asset.respondWith).toHaveBeenCalledTimes(1);
    const page = fetchEvent("/", { mode: "navigate" });
    handlers.fetch(page.event);
    expect(page.respondWith).toHaveBeenCalledTimes(1);
  });
  it("keeps only the shell when it installs and drops its older copies when it starts", async () => {
    const { handlers, caches, cache } = loadWorker();
    let waited: Promise<unknown> = Promise.resolve();
    handlers.install({ waitUntil: (promise: Promise<unknown>) => { waited = promise; } });
    await waited;
    expect(cache.addAll).toHaveBeenCalledWith(["/", "/manifest.webmanifest", "/icon.svg"]);
    handlers.activate({ waitUntil: (promise: Promise<unknown>) => { waited = promise; } });
    await waited;
    expect(caches.delete).toHaveBeenCalledTimes(1);
    expect(caches.delete).toHaveBeenCalledWith("armor-studio-shell-v0");
  });
});
