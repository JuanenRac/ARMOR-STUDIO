import { afterEach, describe, expect, it, vi } from "vitest";
import { nodePanelAddress, nodePanelUrl, openNodePanel } from "./remoteAccess";
import { ApiError } from "./transport";

const O = "http://armor.local:8080";
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const stubFetch = (...answers: Response[]) => vi.stubGlobal("fetch", vi.fn(async () => answers.shift()!));
const tabOf = () => ({ opener: {} as unknown, location: { href: "" }, close: vi.fn() });

afterEach(() => vi.unstubAllGlobals());

describe("opening the panel of a node", () => {
  it("opens the address the server gives, in the tab that was opened inside the click, with no link back to the page", async () => {
    stubFetch(reply(201, { url: "http://armor.local:8081/enter/abc", origin: "http://armor.local:8081", expires_in_s: 30 }));
    const tab = tabOf();
    const open = vi.fn(() => tab as unknown as Window);
    await openNodePanel(O, "radar-1", { open });
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(tab.location.href).toBe("http://armor.local:8081/enter/abc");
    expect(tab.opener).toBeNull();
    expect(tab.close).not.toHaveBeenCalled();
  });

  it("goes through the API as before when the server keeps the panels on its own origin off", async () => {
    stubFetch(reply(409, { error: "the panels are served from the origin of the API", code: "panel_origin_off" }));
    expect(await nodePanelAddress(O, "radar-1")).toBe(nodePanelUrl(O, "radar-1"));
  });

  it("closes the tab and says why when the server refuses, whatever the refusal", async () => {
    for (const [status, code] of [[503, "panel_origin_unavailable"], [403, "panel_http_disabled"], [404, "unknown_panel"]] as const) {
      stubFetch(reply(status, { error: "no", code }));
      const tab = tabOf();
      const failure = await openNodePanel(O, "radar-1", { open: () => tab as unknown as Window }).then(() => undefined, (error: unknown) => error);
      expect(failure).toBeInstanceOf(ApiError);
      expect((failure as ApiError).code).toBe(code);
      expect(tab.close).toHaveBeenCalledTimes(1);
      expect(tab.location.href).toBe("");
    }
  });

  it("opens the address in a new window with no link back when the tab was blocked", async () => {
    stubFetch(reply(201, { url: "http://armor.local:8081/enter/abc", origin: "http://armor.local:8081", expires_in_s: 30 }));
    const open = vi.fn(() => null);
    await openNodePanel(O, "radar-1", { open });
    expect(open).toHaveBeenNthCalledWith(1, "about:blank", "_blank");
    expect(open).toHaveBeenNthCalledWith(2, "http://armor.local:8081/enter/abc", "_blank", "noopener,noreferrer");
  });

  it("does not hide a failure that is not a refusal of the server, such as no answer at all", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const tab = tabOf();
    await expect(openNodePanel(O, "radar-1", { open: () => tab as unknown as Window })).rejects.toBeInstanceOf(TypeError);
    expect(tab.close).toHaveBeenCalledTimes(1);
  });
});
