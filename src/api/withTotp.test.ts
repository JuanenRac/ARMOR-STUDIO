import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./transport";
import { MAINT_TOTP_HEADER, withTotp } from "./withTotp";
import { ddnsUpdate, vpnAddPeer, vpnRemovePeer, vpnShowPeer } from "./remoteAccess";
import { rollbackUpdate } from "./maintenance";

describe("the code of the authenticator for the changes the maintenance agent guards", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("makes the call once without a code and never asks when the agent does not", async () => {
    const call = vi.fn(async () => "ok"), ask = vi.fn(async () => "123456");
    expect(await withTotp(call, ask)).toBe("ok");
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith();
    expect(ask).not.toHaveBeenCalled();
  });

  it("asks for the code when the agent asks, and repeats the call with the header", async () => {
    const call = vi.fn(async (headers?: Record<string, string>) => { if (!headers) throw new ApiError(403, "totp_required"); return headers[MAINT_TOTP_HEADER]; });
    expect(await withTotp(call, async () => "654321")).toBe("654321");
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("asks again after a refused code, three times at most, and says it was wrong from the second time", async () => {
    const call = vi.fn(async (headers?: Record<string, string>) => { throw new ApiError(403, headers ? "totp_invalid" : "totp_required"); });
    const seen: boolean[] = [];
    await expect(withTotp(call, async wrong => { seen.push(wrong); return "111111"; })).rejects.toMatchObject({ code: "totp_invalid" });
    expect(seen).toEqual([false, true, true]);
    expect(call).toHaveBeenCalledTimes(4);
  });

  it("gives up with the refusal of the agent when the person cancels or types something that is not six digits, and passes every other error through", async () => {
    const needs = vi.fn(async () => { throw new ApiError(403, "totp_required"); });
    await expect(withTotp(needs, async () => null)).rejects.toMatchObject({ code: "totp_required" });
    await expect(withTotp(needs, async () => "12ab")).rejects.toMatchObject({ code: "totp_required" });
    const other = vi.fn(async () => { throw new ApiError(500, "generic"); });
    const ask = vi.fn(async () => "123456");
    await expect(withTotp(other, ask)).rejects.toMatchObject({ code: "generic" });
    expect(ask).not.toHaveBeenCalled();
  });

  it("is sent as X-Armor-Maint-Totp on the VPN peers, the DDNS refresh and the rollback", async () => {
    const seen: Array<{ method: string; url: string; code: string | null }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      seen.push({ method: String(init.method), url, code: new Headers(init.headers).get(MAINT_TOTP_HEADER) });
      return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    const headers = { [MAINT_TOTP_HEADER]: "123456" };
    await vpnAddPeer("http://h", "phone", false, headers);
    await vpnShowPeer("http://h", "phone", headers);
    await vpnRemovePeer("http://h", "phone", headers);
    await ddnsUpdate("http://h", headers);
    await rollbackUpdate("http://h", "server", headers);
    expect(seen.map(item => item.code)).toEqual(["123456", "123456", "123456", "123456", "123456"]);
    expect(seen.map(item => `${item.method} ${item.url.replace("http://h", "")}`)).toEqual([
      "POST /api/v1/admin/remote/wireguard/peers", "GET /api/v1/admin/remote/wireguard/peers/phone", "DELETE /api/v1/admin/remote/wireguard/peers/phone",
      "POST /api/v1/admin/remote/ddns/update", "POST /api/v1/admin/updates/server/rollback",
    ]);
    seen.length = 0;
    await ddnsUpdate("http://h");
    expect(seen[0]!.code).toBeNull();
  });
});
