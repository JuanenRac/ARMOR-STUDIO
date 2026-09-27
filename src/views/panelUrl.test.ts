import { describe, expect, it } from "vitest";
import { panelUrl } from "./RadarView";
import { text } from "../i18n";

describe("the link from a node to its own panel", () => {
  it("leaves the default port out and keeps any other", () => {
    expect(panelUrl({ ip: "192.168.0.181", port: 80 })).toBe("http://192.168.0.181/");
    expect(panelUrl({ ip: "10.0.0.5", port: 8080 })).toBe("http://10.0.0.5:8080/");
  });

  it("has its words in every language", () => {
    for (const locale of ["en", "es", "de", "fr", "it", "ja", "zh"] as const) {
      expect(text(locale, "openNodePanel")).not.toBe("openNodePanel");
      expect(text(locale, "firmwareWord")).not.toBe("firmwareWord");
    }
  });
});
