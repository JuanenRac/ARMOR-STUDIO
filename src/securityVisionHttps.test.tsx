import { describe, expect, it } from "vitest";
import { locales, text } from "./i18n";
import { visionTokenInClear } from "./SecurityPanel";

describe("the token for the vision service and plain http", () => {
  it("is in clear only for a remote service, with a token held, at http on a host that is not this machine", () => {
    expect(visionTokenInClear(true, true, "http://192.168.0.50:8765")).toBe(true);
    expect(visionTokenInClear(true, true, "http://vision.example.org")).toBe(true);
    for (const [remote, held, url] of [[true, true, "https://192.168.0.50:8765"], [true, true, "http://127.0.0.1:8765"], [true, true, "http://localhost:9000"], [true, true, "http://[::1]:8765"],
      [true, false, "http://192.168.0.50:8765"], [false, true, "http://192.168.0.50:8765"], [true, true, ""], [true, true, "not an address"]] as const) {
      expect(visionTokenInClear(remote, held, url), `${remote} ${held} ${url}`).toBe(false);
    }
  });

  it("is warned about in the eight languages", () => {
    for (const locale of locales) {
      expect(text(locale, "sec_vis_https").length, locale).toBeGreaterThan(30);
      expect(text(locale, "sec_vis_https"), locale).not.toBe("sec_vis_https");
    }
    expect(text("pt", "sec_vis_https")).toContain("tem de ser https");
  });
});
