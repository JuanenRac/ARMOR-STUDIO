import { describe, expect, it } from "vitest";
import { loadDeploymentOrigin, parseServerOrigin } from "./config";

describe("parseServerOrigin", () => {
  it("accepts a plain origin and normalizes it", () => {
    expect(parseServerOrigin("http://192.168.0.180:18080")).toBe("http://192.168.0.180:18080");
    expect(parseServerOrigin("https://armor.local/")).toBe("https://armor.local");
  });
  it("refuses anything that is not a bare http(s) origin", () => {
    for (const bad of ["ftp://x", "http://user:pw@x", "http://x/path", "http://x?q=1", "http://x#f", "nonsense", "", 5, null]) {
      expect(parseServerOrigin(bad)).toBeNull();
    }
  });
});

describe("loadDeploymentOrigin", () => {
  const respond = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;
  it("reads the origin the static host publishes", async () => {
    expect(await loadDeploymentOrigin(respond({ serverOrigin: "http://10.0.0.5:18080" }))).toBe("http://10.0.0.5:18080");
  });
  it("returns null when the file is missing, invalid or unreachable", async () => {
    expect(await loadDeploymentOrigin(respond({}, false))).toBeNull();
    expect(await loadDeploymentOrigin(respond({ serverOrigin: "javascript:alert(1)" }))).toBeNull();
    expect(await loadDeploymentOrigin((async () => { throw new Error("offline"); }) as unknown as typeof fetch)).toBeNull();
  });
});
