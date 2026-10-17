import { describe, expect, it } from "vitest";
import { WEATHER_ORIGINS } from "./api";
import headers from "../../nginx/security_headers.conf?raw";
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
  it("lets a Studio served without a configured server reach an https one as well as a plain http one", () => {
    const connect = (contentSecurityPolicyFor([]) as string).split("connect-src ")[1].split(";")[0];
    for (const scheme of ["http:", "https:", "ws:", "wss:"]) expect(connect.split(" ")).toContain(scheme);
  });
  it("is the same in the security headers of the container", () => {
    for (const origin of [...WEATHER_ORIGINS.connect, ...WEATHER_ORIGINS.img]) expect(headers as string).toContain(origin);
  });
});
