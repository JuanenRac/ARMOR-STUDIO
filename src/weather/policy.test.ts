import { describe, expect, it } from "vitest";
import { WEATHER_ORIGINS } from "./api";
import template from "../../nginx/default.conf.template?raw";
// @ts-expect-error the static host is plain JavaScript
import { contentSecurityPolicyFor, WEATHER_CONNECT, WEATHER_IMAGES } from "../../tools/serve.mjs";

describe("the security policy of the page and the Weather menu", () => {
  it("lets the page talk to exactly the services the menu asks, and no others", () => {
    expect([...WEATHER_CONNECT].sort()).toEqual([...WEATHER_ORIGINS.connect].sort());
    expect([...WEATHER_IMAGES].sort()).toEqual([...WEATHER_ORIGINS.img].sort());
    const policy: string = contentSecurityPolicyFor(["http://192.168.0.180:18080"]);
    for (const origin of WEATHER_ORIGINS.connect) expect(policy.split("connect-src ")[1].split(";")[0]).toContain(origin);
    for (const origin of WEATHER_ORIGINS.img) expect(policy.split("img-src ")[1].split(";")[0]).toContain(origin);
    expect(policy).not.toContain("*.rainviewer");
  });
  it("is the same in the nginx template of the container", () => {
    for (const origin of [...WEATHER_ORIGINS.connect, ...WEATHER_ORIGINS.img]) expect(template as string).toContain(origin);
  });
});
