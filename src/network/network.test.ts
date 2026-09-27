import { describe, expect, it } from "vitest";
import { locales, text } from "../i18n";
import { NETWORK_KEYS } from "../networkText";
import {
  KIND_ICON, NETWORK_KINDS, RISKY_PORTS, deviceName, describeEvent, eventTone, filterDevices, formatBps, formatDuration, internetTone, isKnown, kindOf, lastOf, linePath,
  sortByAddress, type NetworkDevice, type NetworkEvent,
} from "../networkModel";
import { analyse, inNetwork, isCidr, isIp } from "./analysis";
import { KINDS, kindDef, portOf, portPosition, wirePath, type Design } from "./model";
import { addElement, addFrame, canConnect, connect, duplicateElement, elementsInFrame, moveElement, removeElement, removeFrame, setBinding, setProp, updateFrame, updateWire } from "./ops";
import { drawFound, emptyDesign, housePreset, isWireless } from "./presets";
import { applyNetworkDoc, buildNetworkDoc, networkKey, parseNetworkDoc } from "./sync";

const t = (key: string) => text("en", key);
const device = (patch: Partial<NetworkDevice> & { id: string; ip: string }): NetworkDevice => ({ online: true, first_seen_ms: 1, last_seen_ms: 2, ...patch });
const router = device({ id: "14:2e:5e:86:d9:62", ip: "192.168.0.1", mac: "14:2e:5e:86:d9:62", vendor: "Sercomm", kind: "router" });
const phone = device({ id: "96:b3:ed:0b:1c:18", ip: "192.168.0.12", mac: "96:b3:ed:0b:1c:18", randomized_mac: true, kind: "phone" });
const camera = device({ id: "00:bc:99:aa:bb:01", ip: "192.168.0.203", mac: "00:bc:99:aa:bb:01", vendor: "Hikvision", kind: "camera", ports: [{ port: 554, proto: "tcp" }] });
const nas = device({ id: "00:11:32:11:22:33", ip: "192.168.0.60", mac: "00:11:32:11:22:33", vendor: "Synology", kind: "nas" });

describe("what a person reads", () => {
  it("names a device the way the operator would", () => {
    expect(deviceName({ ...router, note: { name: "Main router", updated_at: "" } })).toBe("Main router");
    expect(deviceName(router)).toBe("Sercomm");
    expect(deviceName({ ...router, hostname: "wfa", note: undefined })).toBe("wfa");
    expect(deviceName(device({ id: "ip-1-2-3-4", ip: "1.2.3.4" }))).toBe("1.2.3.4");
    expect(kindOf({ ...router, note: { kind: "server", updated_at: "" } })).toBe("server");
    expect(isKnown({ ...router, note: { trusted: true, updated_at: "" } })).toBe(true);
    expect(isKnown(router)).toBe(false);
  });
  it("sorts by address as numbers, not as text, and filters", () => {
    const list = [device({ id: "a", ip: "192.168.0.100" }), device({ id: "b", ip: "192.168.0.20" }), device({ id: "c", ip: "192.168.0.3" })];
    expect(sortByAddress(list).map(item => item.ip)).toEqual(["192.168.0.3", "192.168.0.20", "192.168.0.100"]);
    const all = [router, phone, camera, { ...nas, online: false, note: { trusted: true, updated_at: "" } }];
    const none = { query: "", kind: "", onlyUnknown: false, onlyOffline: false };
    expect(filterDevices(all, none)).toHaveLength(4);
    expect(filterDevices(all, { ...none, query: "hik" }).map(item => item.id)).toEqual([camera.id]);
    expect(filterDevices(all, { ...none, query: "192.168.0.12" }).map(item => item.id)).toEqual([phone.id]);
    expect(filterDevices(all, { ...none, kind: "phone" }).map(item => item.id)).toEqual([phone.id]);
    expect(filterDevices(all, { ...none, onlyUnknown: true }).map(item => item.id)).not.toContain(nas.id);
    expect(filterDevices(all, { ...none, onlyOffline: true }).map(item => item.id)).toEqual([nas.id]);
  });
  it("writes figures short", () => {
    expect(formatBps(undefined)).toBe("—");
    expect([formatBps(800), formatBps(45_000), formatBps(1_200_000), formatBps(93_000_000), formatBps(2_500_000_000)]).toEqual(["800 bit/s", "45 kbit/s", "1.2 Mbit/s", "93 Mbit/s", "2.50 Gbit/s"]);
    expect([formatDuration(45), formatDuration(200), formatDuration(3600), formatDuration(7500), formatDuration(200_000)]).toEqual(["45 s", "3 min", "1 h", "2 h 5 min", "2 d 7 h"]);
    expect([internetTone("up"), internetTone("degraded"), internetTone("down"), internetTone("lan_down"), internetTone("unknown")]).toEqual(["good", "warn", "bad", "bad", "idle"]);
  });
  it("says an event in the language of the menu, naming the device", () => {
    const devices = [{ ...router, note: { name: "Main router", updated_at: "" } }, phone];
    const event = (patch: Partial<NetworkEvent>): NetworkEvent => ({ id: "e1", kind: "new_device", at_ms: 1, node_id: "network-1", ...patch });
    expect(describeEvent(event({ device_id: phone.id }), devices, t)).toBe("A device that was never seen has appeared: 192.168.0.12");                       // nothing better to call it than its address
    expect(describeEvent(event({ kind: "port_opened", device_id: router.id, port: 23 }), devices, t)).toBe("Main router (192.168.0.1) opened port 23");
    expect(describeEvent(event({ kind: "internet_up", outage_s: 200 }), devices, t)).toBe("The internet is back after 3 min");
    expect(describeEvent(event({ kind: "internet_down" }), devices, t)).toBe("The internet went down");
    expect(describeEvent(event({ kind: "device_offline", device_id: "gone" }), devices, t)).toBe("gone stopped answering");
    expect(describeEvent(event({ kind: "arp_conflict", device_id: phone.id, detail: "the router is now answered by de:ad" }), devices, t)).toContain("the router is now answered by de:ad");
    expect(eventTone(event({ kind: "port_opened", port: 23 }))).toBe("bad");
    expect(eventTone(event({ kind: "port_opened", port: 8080 }))).toBe("warn");
    expect(eventTone(event({ kind: "internet_up" }))).toBe("good");
    expect(RISKY_PORTS.has(23) && !RISKY_PORTS.has(80)).toBe(true);
  });
  it("draws a line chart with gaps", () => {
    expect(linePath([], 100, 50).d).toBe("");
    expect(linePath([undefined, undefined], 100, 50).d).toBe("");
    const flat = linePath([5, 5, 5], 100, 50, 0);
    expect(flat.d.startsWith("M0.0")).toBe(true);
    const gap = linePath([1, 2, undefined, 3], 90, 30, 0, 4);
    expect(gap.d.split("M").length - 1).toBe(2);                       // the line is lifted at the gap
    expect(lastOf([1, undefined, 7, undefined])).toBe(7);
    expect(lastOf([undefined])).toBeUndefined();
  });
  it("has an icon and a word for every kind, in every language", () => {
    for (const kind of NETWORK_KINDS) expect(KIND_ICON[kind]).toBeTruthy();
    for (const language of locales) for (const kind of NETWORK_KINDS) expect(text(language, `netkind_${kind}`), `${language}:${kind}`).not.toBe(`netkind_${kind}`);
  });
  it("has every phrase in every language, none left as its key", () => {
    for (const language of locales) for (const key of NETWORK_KEYS) expect(text(language, key), `${language}:${key}`).not.toBe(key);
    // a phrase that takes figures keeps its places in every language
    for (const key of NETWORK_KEYS.filter(item => /^(netev_|ndi_|nd_drawn_found)/.test(item))) {
      const places = (value: string) => [...new Set(value.match(/\{\d\}/g) ?? [])].sort().join("");
      for (const language of locales) expect(places(text(language, key)), `${language}:${key}`).toBe(places(text("en", key)));
    }
  });
});

describe("the Network Designer's model", () => {
  it("has kinds whose ports exist, are of a medium and can be found", () => {
    for (const def of KINDS) {
      expect(def.ports.length, def.kind).toBeGreaterThan(0);
      expect(new Set(def.ports.map(port => port.id)).size, def.kind).toBe(def.ports.length);
      for (const language of locales) expect(text(language, `ndk_${def.kind}`), `${language}:${def.kind}`).not.toBe(`ndk_${def.kind}`);
      for (const prop of def.props) for (const language of locales) expect(text(language, `ndp_${prop.key}`), `${language}:${prop.key}`).not.toBe(`ndp_${prop.key}`);
      for (const value of Object.values(def.defaults)) expect(value).toBeDefined();
    }
    expect(kindDef("nothing")).toBeUndefined();
  });
  it("joins ports of one medium and refuses the rest", () => {
    let design = emptyDesign();
    const add = (kind: string, x = 0) => { const added = addElement(design, kind, x, 0)!; design = added.design; return added.id; };
    const modem = add("modem"), router1 = add("router", 300), phone1 = add("phone", 600), phone2 = add("phone", 900), server1 = add("server", 1200);
    expect(canConnect(design, { element: modem, port: "wan" }, { element: router1, port: "lan1" })).toBe("medium");          // the line is not a cable
    expect(canConnect(design, { element: modem, port: "eth" }, { element: router1, port: "wan" })).toBeUndefined();          // the modem's cable goes into the router's line port
    expect(canConnect(design, { element: modem, port: "wan" }, { element: router1, port: "wan" })).toBe("medium");
    expect(canConnect(design, { element: modem, port: "eth" }, { element: modem, port: "wan" })).toBe("same_element");
    expect(canConnect(design, { element: modem, port: "eth" }, { element: router1, port: "nothing" })).toBe("unknown_port");
    const line = connect(design, { element: router1, port: "lan1" }, { element: server1, port: "eth" });
    expect(line.ok).toBe(true);
    if (line.ok) design = line.design;
    expect(canConnect(design, { element: router1, port: "lan1" }, { element: phone1, port: "wifi" })).toBe("medium");
    expect(canConnect(design, { element: router1, port: "lan1" }, { element: server1, port: "eth" })).toBe("exists");
    expect(canConnect(design, { element: router1, port: "lan1" }, { element: modem, port: "eth" })).toBe("busy");            // a router's cable port takes one cable
    // the air is shared: a router's Wi-Fi takes many, a phone's only one
    for (const phoneId of [phone1, phone2]) { const result = connect(design, { element: router1, port: "wifi" }, { element: phoneId, port: "wifi" }); expect(result.ok).toBe(true); if (result.ok) design = result.design; }
    expect(canConnect(design, { element: server1, port: "wifi" }, { element: phone1, port: "wifi" })).toBe("busy");
    expect(design.wires).toHaveLength(3);
    design = removeElement(design, router1);
    expect(design.wires).toHaveLength(0);
  });
  it("keeps a property inside what it allows, and an address is text", () => {
    let design = addElement(emptyDesign(), "switch", 0, 0)!.design;
    const id = design.elements[0].id;
    design = setProp(design, id, "ports", 9999);
    expect(design.elements[0].props.ports).toBe(48);
    design = setProp(design, id, "managed", "maybe");
    expect(design.elements[0].props.managed).toBe("no");
    design = setProp(design, id, "poe_budget_w", 120);
    expect(design.elements[0].props.poe_budget_w).toBe(120);
    expect(setProp(design, id, "nonsense", 1)).toBe(design);
    expect(setProp(design, "missing", "ports", 8)).toBe(design);
    design = setProp(design, id, "ip", "192.168.0.2");
    expect(design.elements[0].props.ip).toBe("192.168.0.2");
  });
  it("ties an element to one device at most, and duplicates without the address or the tie", () => {
    let design = emptyDesign();
    const a = addElement(design, "camera", 0, 0, "", { ip: "192.168.0.203" }); design = a!.design;
    const b = addElement(design, "camera", 200, 0); design = b!.design;
    design = setBinding(design, a!.id, "00:bc:99:aa:bb:01");
    design = setBinding(design, b!.id, "00:bc:99:aa:bb:01");                   // taken: it moves to the second
    expect(design.elements.map(element => element.bind?.device)).toEqual([undefined, "00:bc:99:aa:bb:01"]);
    expect(setBinding(design, b!.id, "Bad Id").elements[1].bind).toBeUndefined();
    const copy = duplicateElement(design, b!.id)!;
    expect(copy.design.elements.find(element => element.id === copy.id)?.bind).toBeUndefined();
    const copyOfA = duplicateElement(design, a!.id)!;
    expect(copyOfA.design.elements.find(element => element.id === copyOfA.id)?.props.ip).toBe("");
  });
  it("moves, updates links and groups with frames", () => {
    let design = emptyDesign();
    const a = addElement(design, "router", 33, 47)!; design = a.design;
    expect([design.elements[0].x, design.elements[0].y]).toEqual([40, 40]);                         // snapped to the grid
    design = moveElement(design, a.id, 101, 99);
    expect([design.elements[0].x, design.elements[0].y]).toEqual([100, 100]);
    const s = addElement(design, "switch", 400, 100)!; design = s.design;
    const link = connect(design, { element: a.id, port: "lan1" }, { element: s.id, port: "up" });
    if (!link.ok) throw new Error("should join");
    design = updateWire(link.design, link.id, { speed_mbps: 1000.4, vlan: 5000, length_m: 12, label: "x".repeat(60) });
    expect(design.wires[0]).toMatchObject({ speed_mbps: 1000, vlan: 4094, length_m: 12 });
    expect(design.wires[0].label).toHaveLength(40);
    design = updateWire(design, link.id, { speed_mbps: null, vlan: null, label: "" });
    expect(design.wires[0].speed_mbps).toBeUndefined();
    const frame = addFrame(design, 60, 60, 500, 300, "LAN")!;
    expect(elementsInFrame(frame.design, frame.design.frames[0]).sort()).toEqual([a.id, s.id].sort());
    expect(updateFrame(frame.design, frame.id, { w: 10 }).frames[0].w).toBe(80);
    expect(removeFrame(frame.design, frame.id).frames).toEqual([]);
  });
  it("puts links where the ports are", () => {
    let design = emptyDesign();
    const a = addElement(design, "router", 0, 0)!; design = a.design;
    const s = addElement(design, "switch", 400, 0)!; design = s.design;
    const link = connect(design, { element: a.id, port: "lan1" }, { element: s.id, port: "up" });
    if (!link.ok) throw new Error("should join");
    const path = wirePath(link.design, link.design.wires[0]);
    expect(path[0]).toEqual(portPosition(link.design.elements[0], "lan1"));
    expect(path[path.length - 1]).toEqual(portPosition(link.design.elements[1], "up"));
    expect(path.length).toBeGreaterThanOrEqual(4);
    expect(portOf(link.design.elements[0], "lan1")?.medium).toBe("eth");
  });
});

describe("the Network Designer's checks", () => {
  const build = (fn: (add: (kind: string, x: number, props?: Record<string, string | number>, name?: string) => string, join: (a: string, pa: string, b: string, pb: string) => void) => void): Design => {
    let design = emptyDesign();
    const add = (kind: string, x: number, props: Record<string, string | number> = {}, name = ""): string => { const added = addElement(design, kind, x, 0, name, props)!; design = added.design; return added.id; };
    const join = (a: string, pa: string, b: string, pb: string) => { const result = connect(design, { element: a, port: pa }, { element: b, port: pb }); if (result.ok) design = result.design; else throw new Error(result.error); };
    fn(add, join);
    return design;
  };
  const codes = (design: Design, live?: Parameters<typeof analyse>[1]) => analyse(design, live).issues.map(issue => issue.code);

  it("reads addresses and networks", () => {
    expect([isIp("192.168.0.1"), isIp("192.168.0.256"), isIp("192.168.00.1"), isIp("")]).toEqual([true, false, false, false]);
    expect([isCidr("192.168.0.0/24"), isCidr("192.168.0.0/33"), isCidr("192.168.0.0")]).toEqual([true, false, false]);
    expect([inNetwork("192.168.0.77", "192.168.0.0/24"), inNetwork("192.168.1.77", "192.168.0.0/24"), inNetwork("10.9.9.9", "10.0.0.0/8"), inNetwork("1.1.1.1", "0.0.0.0/0"), inNetwork("x", "10.0.0.0/8")]).toEqual([true, false, true, true, false]);
  });
  it("finds nothing wrong with a typical house", () => {
    const design = housePreset(t);
    expect(analyse(design).issues.filter(issue => issue.level !== "info")).toEqual([]);
    expect(analyse(design).totals).toMatchObject({ elements: 11, links: 10, wired: 7, wireless: 2, poe_w: 12 });
  });
  it("finds two elements with one address, and an address that is not one", () => {
    const design = build((add, join) => { const r = add("router", 0, { ip: "192.168.0.1" }, "R"); const a = add("server", 200, { ip: "192.168.0.9" }, "A"); const b = add("nas", 400, { ip: "192.168.0.9" }, "B"); const c = add("phone", 600, { ip: "192.168.0.999" }); join(r, "lan1", a, "eth"); join(r, "lan2", b, "eth"); join(r, "wifi", c, "wifi"); });
    const issues = analyse(design).issues;
    expect(issues.find(issue => issue.code === "ip_duplicate")?.args).toEqual(["192.168.0.9", "A", "B"]);
    expect(issues.find(issue => issue.code === "ip_invalid")?.level).toBe("error");
  });
  it("finds an address outside the network of the router", () => {
    const design = build((add, join) => { const r = add("router", 0, { ip: "192.168.0.1", subnet: "192.168.0.0/24" }); const a = add("server", 200, { ip: "10.0.0.5" }); join(r, "lan1", a, "eth"); });
    expect(codes(design)).toContain("ip_outside");
    const inside = build((add, join) => { const r = add("router", 0, { ip: "192.168.0.1", subnet: "192.168.0.0/24" }); const a = add("server", 200, { ip: "192.168.0.5" }); join(r, "lan1", a, "eth"); });
    expect(codes(inside)).not.toContain("ip_outside");
  });
  it("finds a router with nothing on its line, an element with no link and one with no way out", () => {
    const design = build((add, join) => { const net = add("internet", 0); const r = add("router", 200); add("printer", 400); const island = add("switch", 600); const k = add("computer", 800); join(island, "p1", k, "eth"); void net; void r; });
    const found = codes(design);
    expect(found).toContain("router_no_wan");
    expect(found).toContain("unlinked");
    expect(found.filter(code => code === "no_internet_path")).toHaveLength(2);       // the switch and the computer on their own island
  });
  it("finds a switch with more cables than ports, and PoE the switch cannot give", () => {
    const design = build((add, join) => {
      const s = add("switch", 0, { ports: 4, poe_budget_w: 10 }, "S");
      const cams = [1, 2, 3].map(index => add("camera", 200 * index, { poe_w: 6 }));
      const extra = [add("server", 900), add("nas", 1100)];
      [...cams, ...extra].forEach((id, index) => join(s, `p${index + 1}`, id, "eth"));
    });
    const issues = analyse(design).issues;
    expect(issues.find(issue => issue.code === "switch_full")?.args).toEqual(["S", 5, 4]);
    expect(issues.find(issue => issue.code === "poe_over")?.args).toEqual(["S", 18, 10]);
  });
  it("suggests a cable for a server that is only on Wi-Fi", () => {
    const design = build((add, join) => { const r = add("router", 0); const s = add("server", 300, {}, "S"); join(r, "wifi", s, "wifi"); });
    expect(analyse(design).issues.find(issue => issue.code === "wifi_server")?.level).toBe("info");
  });
  it("compares the drawing with what the nodes report", () => {
    let design = emptyDesign();
    const r = addElement(design, "router", 0, 0, "R", { ip: "192.168.0.1" }); design = setBinding(r!.design, r!.id, router.id);
    const c = addElement(design, "camera", 300, 0, "Cam", { ip: "192.168.0.99" }); design = setBinding(c!.design, c!.id, camera.id);
    const g = addElement(design, "phone", 600, 0, "Gone"); design = setBinding(g!.design, g!.id, "aa:aa:aa:aa:aa:aa");
    const live = { devices: [router, { ...camera, online: false }, phone, nas], cidr: "192.168.0.0/24", gateway: "192.168.0.1" };
    const issues = analyse(design, live).issues;
    expect(issues.map(issue => issue.code)).toEqual(expect.arrayContaining(["bound_missing", "bound_offline", "ip_differs", "undrawn"]));
    expect(issues.find(issue => issue.code === "undrawn")?.args).toEqual([2]);       // the phone and the NAS are on the network and not drawn
    expect(analyse(design, live).totals.bound).toBe(3);
    expect(codes(design)).not.toContain("undrawn");                                  // nothing to compare with when the nodes have not reported
  });
});

describe("drawing what was found", () => {
  const network = { gateway: "192.168.0.1", cidr: "192.168.0.0/24" };
  it("guesses how a device reaches the network", () => {
    expect([isWireless(phone), isWireless(camera), isWireless(nas), isWireless({ ...nas, randomized_mac: true })]).toEqual([true, false, false, true]);
  });
  it("draws the router, the line and every device, tied to what it is", () => {
    const result = drawFound(emptyDesign(), [router, phone, camera, nas], network);
    expect(result.added).toBe(4);
    const kinds = result.design.elements.map(element => element.kind).sort();
    expect(kinds).toEqual(["camera", "internet", "modem", "nas", "phone", "router"]);
    const ties = result.design.elements.map(element => element.bind?.device).filter(Boolean).sort();
    expect(ties).toEqual([camera.id, nas.id, phone.id, router.id].sort());
    expect(result.design.elements.find(element => element.kind === "router")?.props).toMatchObject({ ip: "192.168.0.1", subnet: "192.168.0.0/24" });
    // the phone goes over the air, the camera and the NAS by cable, and every link is between ports that exist
    const media = result.design.wires.map(wire => `${portOf(result.design.elements.find(e => e.id === wire.from.element)!, wire.from.port)?.medium}`).sort();
    expect(media).toEqual(["eth", "eth", "eth", "wan", "wifi"]);          // the line to the modem, the modem to the router, the camera and the NAS by cable, the phone over the air
    expect(analyse(result.design, { devices: [router, phone, camera, nas], ...network }).issues.filter(issue => issue.level === "error")).toEqual([]);
    expect(analyse(result.design, { devices: [router, phone, camera, nas], ...network }).issues.map(issue => issue.code)).not.toContain("undrawn");
  });
  it("adds only what is missing, and says when nothing is", () => {
    const first = drawFound(emptyDesign(), [router, phone], network);
    const second = drawFound(first.design, [router, phone, camera], network);
    expect(second.added).toBe(1);
    expect(second.design.elements).toHaveLength(first.design.elements.length + 1);
    expect(drawFound(second.design, [router, phone, camera], network).added).toBe(0);
  });
  it("adds a switch when there are more cables than the router has ports", () => {
    const many = Array.from({ length: 7 }, (_, index) => device({ id: `00:aa:bb:cc:dd:${String(index).padStart(2, "0")}`, ip: `192.168.0.${100 + index}`, kind: "computer" }));
    const result = drawFound(emptyDesign(), [router, ...many], network);
    expect(result.design.elements.filter(element => element.kind === "switch")).toHaveLength(1);
    expect(result.design.wires.length).toBeGreaterThanOrEqual(8);
    expect(analyse(result.design).issues.filter(issue => issue.level === "error")).toEqual([]);
  });
  it("respects the limit of the drawing", () => {
    const crowd = Array.from({ length: 450 }, (_, index) => device({ id: `ip-10-0-${Math.floor(index / 250)}-${index % 250 + 1}`, ip: `10.0.${Math.floor(index / 250)}.${index % 250 + 2}`, kind: "iot" }));
    expect(() => drawFound(emptyDesign(), crowd, { gateway: "10.0.0.1", cidr: "10.0.0.0/23" })).toThrow();       // a preset stays inside the limits or says so
  });
});

describe("the drawing as a document", () => {
  it("survives a round trip, in a stable form", () => {
    const design = housePreset(t);
    const again = parseNetworkDoc(JSON.parse(JSON.stringify(buildNetworkDoc(design))))!;
    expect(again).toEqual(design);
    expect(networkKey(again)).toBe(networkKey(design));
    expect(networkKey(design)).toBe(networkKey(JSON.parse(JSON.stringify(design))));
  });
  it("cleans what it is given", () => {
    const dirty = {
      elements: [
        { id: "router-01", kind: "router", x: 0, y: 0, name: "R", props: { ip: "192.168.0.1", dhcp: "sometimes", subnet: "x".repeat(50), extra: 1 }, bind: { device: "aa:bb:cc:00:00:01" } },
        { id: "nas-01", kind: "nas", x: 100, y: 0, name: 1, props: {}, bind: { device: "aa:bb:cc:00:00:01" } },       // the same device: only the first keeps it
        { id: "toaster-01", kind: "toaster", x: 0, y: 0 }, { id: "Bad Id", kind: "nas", x: 0, y: 0 }, { id: "router-01", kind: "nas", x: 0, y: 0 }, { id: "phone-01", kind: "phone", x: "far", y: 0 },
        { id: "server-01", kind: "server", x: 1e9, y: -1e9, props: { ip: "192.168.0.9" }, bind: { device: "Bad Id" } },
      ],
      wires: [
        { id: "link-01", from: { element: "router-01", port: "lan1" }, to: { element: "nas-01", port: "eth" }, speed_mbps: 1000, vlan: 9999, length_m: -5, label: "x".repeat(99) },
        { id: "link-02", from: { element: "router-01", port: "wifi" }, to: { element: "nas-01", port: "eth" } },         // different media
        { id: "link-03", from: { element: "router-01", port: "lan9" }, to: { element: "nas-01", port: "eth" } },         // no such port
        { id: "link-04", from: { element: "router-01", port: "lan2" }, to: { element: "router-01", port: "lan3" } },     // to itself
        { id: "link-05", from: { element: "ghost", port: "eth" }, to: { element: "nas-01", port: "eth" } },
      ],
      frames: [{ id: "frame-01", name: "F", x: 0, y: 0, w: 200, h: 100, colour: "pink" }, { id: "frame-02", x: 0, y: 0, w: 5, h: 5 }],
    };
    const design = parseNetworkDoc(dirty)!;
    expect(design.elements.map(element => element.id)).toEqual(["router-01", "nas-01", "server-01"]);
    expect(design.elements[0].props.dhcp).toBe("on");                       // a choice that is not one falls back to the default
    expect(design.elements[0].props.subnet).toHaveLength(18);
    expect("extra" in design.elements[0].props).toBe(false);
    expect(design.elements[0].bind).toEqual({ device: "aa:bb:cc:00:00:01" });
    expect(design.elements[1].bind).toBeUndefined();
    expect(design.elements[2].bind).toBeUndefined();
    expect(design.elements[2].x).toBe(100000);
    expect(design.wires).toHaveLength(1);
    expect(design.wires[0]).toMatchObject({ id: "link-01", speed_mbps: 1000 });
    expect(design.wires[0].vlan).toBeUndefined();
    expect(design.wires[0].length_m).toBeUndefined();
    expect(design.wires[0].label).toHaveLength(40);
    expect(design.frames).toEqual([{ id: "frame-01", name: "F", x: 0, y: 0, w: 200, h: 100, colour: "cyan" }]);
    expect([parseNetworkDoc(null), parseNetworkDoc("x"), parseNetworkDoc({}), parseNetworkDoc({ elements: [], wires: 1 })]).toEqual([undefined, undefined, undefined, undefined]);
    expect(applyNetworkDoc("nonsense", housePreset(t))).toEqual(housePreset(t));
  });
});
