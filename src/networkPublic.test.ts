import { describe, expect, it } from "vitest";
import { flagOf, publicFacts } from "./networkPublic";

const info = { ip: "203.0.113.9", city: "Exampleville", region: "Examplestate", country: "ES", org: "AS64500 EXAMPLE NETWORK", timezone: "Europe/Madrid", checked_ms: 0 };

describe("the public connection", () => {
  it("splits the network number from the provider's name", () => {
    const facts = publicFacts(info, "en", Date.UTC(2026, 9, 16, 12, 0));
    expect(facts.asn).toBe("AS64500");
    expect(facts.isp).toBe("EXAMPLE NETWORK");
    expect(facts.version).toBe(4);
  });
  it("keeps an organisation that has no network number as the provider", () => {
    expect(publicFacts({ ...info, org: "Some Provider" }, "en", 0)).toMatchObject({ isp: "Some Provider" });
    expect(publicFacts({ ...info, org: "Some Provider" }, "en", 0).asn).toBeUndefined();
  });
  it("names the country in the language of the interface and draws its flag", () => {
    expect(publicFacts(info, "en", 0).country).toBe("Spain");
    expect(publicFacts(info, "es", 0).country).toBe("España");
    expect(publicFacts(info, "ja", 0).country).toBe("スペイン");
    expect(publicFacts(info, "en", 0).flag).toBe(flagOf("ES"));
    expect(flagOf("ES")).toBe("🇪🇸");
    expect(flagOf("Spain")).toBeUndefined();
  });
  it("tells the time at the place, and an IPv6 address", () => {
    expect(publicFacts(info, "en", Date.UTC(2026, 9, 16, 12, 0)).localTime).toMatch(/2:00|14:00/);
    expect(publicFacts({ ...info, ip: "2a02:9000::1" }, "en", 0).version).toBe(6);
    expect(publicFacts({ ...info, timezone: "Nowhere/Land" }, "en", 0).localTime).toBeUndefined();
  });
});
