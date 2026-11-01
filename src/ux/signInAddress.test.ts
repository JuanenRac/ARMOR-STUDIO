import { describe, expect, it } from "vitest";
import { addressProblemKey, checkServerAddress, isLocalHost } from "./signInAddress";

describe("the address typed at the sign-in", () => {
  it("refuses an empty, a malformed, a non-http and a credentialed address, each with its own reason", () => {
    expect(checkServerAddress("   ")).toEqual({ ok: false, problem: "empty" });
    expect(checkServerAddress("not an address")).toEqual({ ok: false, problem: "invalid" });
    expect(checkServerAddress("ftp://armor.local")).toEqual({ ok: false, problem: "scheme" });
    expect(checkServerAddress("javascript:alert(1)")).toEqual({ ok: false, problem: "scheme" });
    expect(checkServerAddress("http://ana:secret@192.168.0.180:18080")).toEqual({ ok: false, problem: "credentials" });
    expect(checkServerAddress("https://ana@armor.example")).toEqual({ ok: false, problem: "credentials" });
  });

  it("returns the origin without the path, the query or a trailing slash", () => {
    expect(checkServerAddress(" http://192.168.0.180:18080/some/path?x=1 ")).toEqual({ ok: true, origin: "http://192.168.0.180:18080", plainRemote: false });
    expect(checkServerAddress("https://armor.example/")).toEqual({ ok: true, origin: "https://armor.example", plainRemote: false });
  });

  it("tells plain http outside the house network, and only warns unless the person chose to refuse", () => {
    expect(checkServerAddress("http://armor.example.org:18080")).toEqual({ ok: true, origin: "http://armor.example.org:18080", plainRemote: true });
    expect(checkServerAddress("http://203.0.113.9")).toMatchObject({ ok: true, plainRemote: true });
    expect(checkServerAddress("http://203.0.113.9", true)).toEqual({ ok: false, problem: "plain_remote" });
    expect(checkServerAddress("https://203.0.113.9", true)).toMatchObject({ ok: true, plainRemote: false });
    expect(checkServerAddress("http://192.168.0.180:18080", true)).toMatchObject({ ok: true, plainRemote: false });
  });

  it("knows the local hosts: loopback, private ranges, single-label and local names", () => {
    for (const host of ["localhost", "127.0.0.1", "10.1.2.3", "192.168.0.180", "172.16.0.1", "172.31.255.1", "169.254.1.1", "armor", "hydra.local", "[::1]", "fd00::1", "fe80::1"]) expect(isLocalHost(host), host).toBe(true);
    for (const host of ["172.32.0.1", "172.15.0.1", "8.8.8.8", "armor.example.org", "192.169.0.1"]) expect(isLocalHost(host), host).toBe(false);
  });

  it("every problem has its text key", () => {
    expect(addressProblemKey("scheme")).toBe("ux_addr_scheme");
  });
});
