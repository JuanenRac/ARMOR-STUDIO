import { describe, expect, it } from "vitest";
import jsQR from "jsqr";
import { buildProvisioning, cleanServer, parseProvisioning, provisioningSvg } from "./provisioningCode";

describe("provisioning code", () => {
  it("writes the same text as the shared library and reads it back", () => {
    const text = buildProvisioning("radar-1", "https://armor.local:8443/");
    expect(text).toBe('armor-provision:{"node_id":"radar-1","server":"https://armor.local:8443","v":1}');
    expect(parseProvisioning(text)).toEqual({ node_id: "radar-1", server: "https://armor.local:8443" });
    expect(parseProvisioning(buildProvisioning("a1", "http://192.168.0.180:18080"))?.server).toBe("http://192.168.0.180:18080");
  });
  it("refuses ids and addresses that are not valid or could hold a secret", () => {
    for (const id of ["", "-x", "Radar", "a b", "x".repeat(65)]) expect(buildProvisioning(id, "https://armor.local")).toBeNull();
    for (const server of ["https://user:pw@armor.local", "https://user@armor.local", "https://armor.local/?token=x", "https://armor.local/#x", "https://armor.local/api",
      "ftp://armor.local", "armor.local", "https://", "https://armor.local:99999", "https://armor .local", ""]) {
      expect(cleanServer(server), server).toBeNull();
      expect(buildProvisioning("radar-1", server), server).toBeNull();
    }
  });
  it("refuses extra or missing fields, other versions and other text", () => {
    const good = { v: 1, node_id: "radar-1", server: "https://armor.local" };
    const without = { v: 1, node_id: "radar-1" };
    for (const bad of [{ ...good, token: "x" }, without, { ...good, v: 2 }, { ...good, v: true }, { ...good, node_id: 5 }]) expect(parseProvisioning(`armor-provision:${JSON.stringify(bad)}`)).toBeNull();
    for (const bad of [null, 5, "", "armor-provision:", "armor-provision:{", "armor-provision:[]", "other:{}", `armor-provision:${"x".repeat(600)}`]) expect(parseProvisioning(bad)).toBeNull();
  });
  it("draws a code that a reader gives back", () => {
    const text = buildProvisioning("radar-1", "https://armor.local:8443") as string;
    const svg = provisioningSvg(text);
    expect(svg.startsWith("<svg")).toBe(true);
    // Rasterise the module grid out of the rects of the SVG and read it with the same reader the scanner uses.
    const cells = [...svg.matchAll(/M(\d+),(\d+)l6,0/g)];
    expect(cells.length).toBeGreaterThan(50);
    const size = Number(/viewBox="0 0 (\d+) /.exec(svg)?.[1]);
    expect(size).toBeGreaterThan(0);
    const data = new Uint8ClampedArray(size * size * 4).fill(255);
    for (const [, x, y] of cells) {
      for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) {
        const at = ((Number(y) + row) * size + Number(x) + col) * 4;
        data[at] = data[at + 1] = data[at + 2] = 0;
      }
    }
    expect(jsQR(data, size, size)?.data).toBe(text);
  });
});
