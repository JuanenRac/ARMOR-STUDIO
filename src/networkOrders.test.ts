import { describe, expect, it } from "vitest";
import { servicesOf } from "./networkOrders";

const device = (ports: number[]) => ({ ip: "192.168.0.50", ports: ports.map(port => ({ port, proto: "tcp" as const })) });

describe("what can be used on a device", () => {
  it("opens a web port in the browser, with the port only when it is not the usual one", () => {
    const [web, secure, alt] = servicesOf(device([80, 8080, 443]));   // sorted by port
    expect(web).toMatchObject({ port: 80, labelKey: "no_svc_web", href: "http://192.168.0.50/" });
    expect(alt.href).toBe("http://192.168.0.50:8080/");
    expect(secure).toMatchObject({ port: 443, labelKey: "no_svc_secure_web", href: "https://192.168.0.50/" });
  });

  it("gives the command for a remote shell or desktop and marks the ports a house rarely wants open", () => {
    const services = Object.fromEntries(servicesOf(device([22, 23, 3389, 445, 9100, 49152])).map(service => [service.port, service]));
    expect(services[22]).toMatchObject({ labelKey: "no_svc_ssh", command: "ssh user@192.168.0.50", risky: false });
    expect(services[23]).toMatchObject({ labelKey: "no_svc_telnet", risky: true, href: "telnet://192.168.0.50" });
    expect(services[3389]).toMatchObject({ command: "mstsc /v:192.168.0.50", risky: true });
    expect(services[445].command).toBe(String.raw`\\192.168.0.50`);
    expect(services[9100].href).toBeUndefined();
    expect(services[49152].labelKey).toBe("no_svc_other");
  });

  it("is sorted by port, ignores what is not TCP and handles a device with no ports", () => {
    expect(servicesOf({ ip: "192.168.0.50", ports: [{ port: 443, proto: "tcp" }, { port: 53, proto: "udp" }, { port: 22, proto: "tcp" }] }).map(service => service.port)).toEqual([22, 443]);
    expect(servicesOf({ ip: "192.168.0.50" })).toEqual([]);
  });
});
