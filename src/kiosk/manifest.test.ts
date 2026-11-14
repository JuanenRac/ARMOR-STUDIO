import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8")) as { icons: Array<{ src: string; sizes: string; type: string }>; start_url: string; display: string };

/** The width and height written in the header of a PNG file. */
const pngSize = (file: string) => { const bytes = readFileSync(file); return { signature: bytes.subarray(0, 8).toString("hex"), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }; };

describe("the manifest of the wall panel", () => {
  it("opens the panel mode and covers the screen", () => {
    expect(manifest.start_url).toBe("/?kiosk=1");
    expect(manifest.display).toBe("fullscreen");
  });

  it("lists the PNG icons that a browser asks for before it offers to install, and they are really that size", () => {
    for (const size of [192, 512]) {
      const icon = manifest.icons.find(item => item.sizes === `${size}x${size}`);
      expect(icon, `icon of ${size}`).toBeDefined();
      expect(icon?.type).toBe("image/png");
      const picture = pngSize(`public${icon?.src}`);
      expect(picture).toEqual({ signature: "89504e470d0a1a0a", width: size, height: size });
    }
  });

  it("keeps the vector icon too", () => {
    expect(manifest.icons.some(item => item.type === "image/svg+xml" && item.sizes === "any")).toBe(true);
  });
});
