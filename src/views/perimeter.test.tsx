import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { locales, text } from "../i18n";
import type { NodeHealthItem, RadarEvent } from "../api";
import { ALERT_EVENTS, eventDetails, eventLine, isAlertEvent, isBluetoothOpen, newestFirst, RADAR_EVENT_KINDS } from "../perimeterModel";
import { PerimeterEvents, PerimeterNodes } from "./PerimeterCard";
import { panelUrl } from "./RadarView";
import radarSource from "./RadarView.tsx?raw";
import cardSource from "./PerimeterCard.tsx?raw";

const t = (language: Parameters<typeof text>[0] = "en") => (key: string) => text(language, key);
const event = (extra: Partial<RadarEvent> = {}): RadarEvent => ({ kind: "radar_event", node_id: "north-1", timestamp_ms: 1, boot: 1, seq: 1, event: "zone_occupied", received_at: "2026-01-01T10:00:00.000Z", ...extra });
const radar = (extra: Partial<NodeHealthItem["report"]["radar"] & object> = {}, sensors: NodeHealthItem["report"]["sensors"] = []): NodeHealthItem => ({
  node_id: "north-1", family: "radar", firmware: "0.9.1", received_at: new Date().toISOString(), stale: false, status: "ok", restarts_24h: 0, warnings: [],
  report: { kind: "node_health", node_id: "north-1", timestamp_ms: 1, family: "radar", firmware: "0.9.1", uptime_s: 100, reset_reason: "power_on", heap_free: 100_000, heap_min: 90_000, link: "wifi", link_up: true, broker_reconnects: 1,
    sensors, radar: { perimeter_enabled: true, masked: false, wifi_jam: false, bridge_open: false, events_buffered: 2, sensor_bluetooth_off: true, ...extra } },
});

describe("how an event of the perimeter reads", () => {
  it("names every kind of event in every language", () => {
    expect(RADAR_EVENT_KINDS).toHaveLength(13);
    for (const language of locales) for (const kind of RADAR_EVENT_KINDS) {
      expect(text(language, `re_${kind}`), `${language} ${kind}`).not.toBe(`re_${kind}`);
      if (language !== "en" && !["wifi_jam", "masking"].includes(kind)) expect(text(language, `re_${kind}`), `${language} ${kind}`).not.toBe(text("en", `re_${kind}`));
    }
  });
  it("adds the zone, the sensor, the target, the movement, the direction and who did it", () => {
    expect(eventLine(event({ event: "tripwire", name: "Gate", sensor_id: 2, track_id: 5, movement: "walking", direction: "in" }), t())).toBe("Tripwire crossed · zone Gate · sensor 2 · target 5 · walking · entering");
    expect(eventLine(event({ event: "path_violation", name: "Garden", from: "Path" }), t())).toBe("Left the allowed path · zone Garden · from Path");
    expect(eventLine(event({ event: "loiter", count: 3 }), t())).toBe("Loitering · 3 targets");
    expect(eventLine(event({ event: "bridge_opened", by: "ana" }), t())).toBe("Sensor bridge opened · by ana");
    expect(eventDetails(event(), t())).toEqual([]);
  });
  it("marks as alerts the sensors covered, the Wi-Fi jammed, the bridge opened and a sensor's Bluetooth opened", () => {
    expect(ALERT_EVENTS).toEqual(["sensor_bluetooth_open", "masking", "wifi_jam", "bridge_opened"]);
    expect(isAlertEvent(event({ event: "wifi_jam" }))).toBe(true);
    expect(isAlertEvent(event({ event: "zone_clear" }))).toBe(false);
    expect(isBluetoothOpen(event({ event: "sensor_bluetooth_open" }))).toBe(true);
    expect(isBluetoothOpen(event({ event: "sensor_bluetooth_closed" }))).toBe(false);
  });
  it("puts the newest first whatever the order they came in", () => {
    const list = newestFirst([event({ seq: 1, received_at: "2026-01-01T10:00:00.000Z" }), event({ seq: 3, received_at: "2026-01-01T10:02:00.000Z" }), event({ seq: 2, received_at: "2026-01-01T10:01:00.000Z" })]);
    expect(list.map(item => item.seq)).toEqual([3, 2, 1]);
  });
});

describe("the list of events", () => {
  it("highlights a sensor whose Bluetooth opened", () => {
    const html = renderToStaticMarkup(createElement(PerimeterEvents, { t: t(), events: [event({ seq: 1 }), event({ seq: 2, event: "sensor_bluetooth_open", sensor_id: 1 })] }));
    expect(html).toContain("Sensor Bluetooth opened");
    expect(html).toContain("bluetooth");
    expect(html.match(/Bluetooth open</g)).toHaveLength(1);
    expect(html).toContain('data-testid="pm-events"');
  });
  it("says there is none, in every language", () => {
    for (const language of locales) expect(renderToStaticMarkup(createElement(PerimeterEvents, { t: t(language), events: [] }))).toContain(text(language, "pm_events_none").replace(/'/g, "&#x27;"));
  });
});

describe("the state of the engine of each radar node, and the link to its panel", () => {
  const panels = { "north-1": { ip: "192.168.0.181", port: 80 } };
  it("shows the engine, the buffered events and the rule of the sensor Bluetooth, and opens the panel of the node", () => {
    const html = renderToStaticMarkup(createElement(PerimeterNodes, { t: t(), items: [radar()], panels }));
    expect(html).toContain("Perimeter: on");
    expect(html).toContain("Events waiting in the node: 2");
    expect(html).toContain("keep it closed");
    expect(html).toContain('href="http://192.168.0.181/"');
    expect(html).toContain("Open the panel of the node to edit its zones");
    expect(panelUrl(panels["north-1"])).toBe("http://192.168.0.181/");
  });
  it("does not invent a route when the panel of the node is not known", () => {
    const html = renderToStaticMarkup(createElement(PerimeterNodes, { t: t(), items: [radar()], panels: {} }));
    expect(html).not.toContain("href=");
    expect(html).toContain("has not been found on the network yet");
  });
  it("raises the card when the sensors are covered, the Wi-Fi is jammed or a sensor's Bluetooth is open", () => {
    const bluetooth = renderToStaticMarkup(createElement(PerimeterNodes, { t: t(), panels, items: [radar({}, [{ sensor_id: 1, model: "ld2450", state: "reporting", firmware_known: false, bluetooth: "open", bluetooth_alert: true }])] }));
    expect(bluetooth).toContain("pm-bt-north-1");
    expect(bluetooth).toContain("danger");
    expect(renderToStaticMarkup(createElement(PerimeterNodes, { t: t(), panels, items: [radar({ masked: true })] }))).toContain("Sensors covered");
    expect(renderToStaticMarkup(createElement(PerimeterNodes, { t: t(), panels, items: [radar({ wifi_jam: true })] }))).toContain("Wi-Fi jamming suspected");
  });
  it("says there is no radar node that told its perimeter, in every language, and has no phrase left untranslated", () => {
    for (const language of locales) {
      expect(renderToStaticMarkup(createElement(PerimeterNodes, { t: t(language), items: [], panels }))).toContain(text(language, "pm_none_nodes").replace(/'/g, "&#x27;"));
      const html = renderToStaticMarkup(createElement(PerimeterNodes, { t: t(language), items: [radar()], panels }));
      for (const marker of ["pm_", "nh_", "nc_"]) expect(html, `${language} ${marker}`).not.toContain(marker);
    }
  });
});

describe("the tab of the radar menu", () => {
  it("is a tab beside the radar nodes, with the words in every language, and does not repeat the editor of zones", () => {
    expect(radarSource).toContain('["perimeter", t("pm_tab")]');
    expect(radarSource).toContain("<PerimeterCard");
    for (const language of locales) for (const key of ["pm_tab", "pm_help", "pm_open", "pm_events"]) expect(text(language, key), `${language} ${key}`).not.toBe(key);
    // the zones are edited in the panel of the node: the card explains it and links to it, it has no editor of its own
    expect(cardSource).not.toMatch(/saveRules|<textarea|exclusion zone editor/i);
    expect(text("en", "pm_help")).toContain("edited in the panel of the node, not here");
  });
});
