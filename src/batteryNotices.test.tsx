// @vitest-environment jsdom
// Battery alarms that are told once and discreetly: nothing is announced for them, and the card shows and lifts the silences.
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { freshAlarms } from "./alerts/useAlarmAnnouncer";
import type { Alarm } from "./api";
import { BatteryNoticesCard, DayCellsNote, SilenceButton, useBatteryNotices } from "./BatteryNotices";
import { text } from "./i18n";
import { alarmsToShow } from "./kiosk/kioskModel";
import { fakeServer, mount, pokeAll } from "./testLive";

const O = "http://armor.local:18080/";
const t = (key: string) => text("en", key);
const alarm = (id: string, quiet?: Alarm["quiet"]): Alarm => ({ id, key: id, source: { type: "solar", id: "solar-1/bank-1" }, severity: "high", code: "solar_battery_alarm", raised_at: "2030-01-01T10:00:00.000Z", ...(quiet ? { quiet } : {}) });
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ""; });

describe("discreet battery alarms", () => {
  it("are not announced and not on the wall screen's list", () => {
    const list = [alarm("a", "new"), alarm("b", "known"), alarm("c", "silenced"), alarm("d")];
    expect(freshAlarms(new Set(), list).fresh.map(item => item.id)).toEqual(["d"]);
    expect(alarmsToShow(list).map(item => item.id)).toEqual(["d"]);
  });

  it("the card, the silence button and the note of the day talk to the server", async () => {
    const calls = fakeServer({ "GET /api/v1/solar/battery-notices": { settings: { mode: "once" }, defaults: {}, silenced: [{ id: "solar-1/bank-1", since: "2030-01-01T10:00:00.000Z", by: "admin" }] } });
    const Screen = () => {
      const notices = useBatteryNotices(O);
      return createElement("div", null,
        createElement(BatteryNoticesCard, { t, notices }),
        createElement(SilenceButton, { t, notices, id: "solar-1/bank-1/2" }),
        createElement(DayCellsNote, { t, origin: O, node: "solar-1", device: "bank-1", day: { date: "2030-01-01", modules: [], bank_delta_v: 0.2, bank: { at: 1, low: { module: 1, cell: 2, v: 3.3 }, high: { module: 3, cell: 4, v: 3.5 } }, discarded: [{ at: 1, module: 2, delta_v: 1.851, reason: "unconfirmed" }] } }));
    };
    const view = await mount(createElement(Screen));
    await view.settle();
    expect(view.host.textContent).toContain(t("batn_once"));
    expect(view.host.textContent).toContain("solar-1/bank-1");
    expect(view.host.textContent).toContain("1851 mV");
    await pokeAll(view.host);
    await view.settle();
    expect(calls.some(call => call.path === "/api/v1/solar/battery-notices/silence")).toBe(true);
    await view.unmount();
  });
});
