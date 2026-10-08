import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ServiceRow } from "./AdminPanel";
import type { AdminService } from "./api";
import { locales, requiredUiKeys, text } from "./i18n";

const service = (patch: Partial<AdminService>): AdminService => ({ id: "mosquitto", unit: "armor-mosquitto", description: "The MQTT broker", installed: true, active: "active", sub: "running", enabled: "enabled", pid: 42, since: "", ...patch });
const render = (locale: (typeof locales)[number], item: AdminService, busy = false) =>
  renderToStaticMarkup(createElement(ServiceRow, { t: key => text(locale, key), service: item, busy, ask: () => undefined }));

describe("the administration screens", () => {
  it("offer stop and restart for a running service and start for a stopped one, in every language", () => {
    for (const locale of locales) {
      const running = render(locale, service({}));
      expect(running, locale).toContain(text(locale, "adm_state_active"));
      expect(running).toMatch(new RegExp(`<button disabled="">${text(locale, "adm_start")}</button>`));
      expect(running).not.toMatch(new RegExp(`<button disabled="">${text(locale, "adm_stop")}</button>`));
      const stopped = render(locale, service({ active: "inactive", pid: 0 }));
      expect(stopped).toContain(text(locale, "adm_state_inactive"));
      expect(stopped).toMatch(new RegExp(`<button disabled="">${text(locale, "adm_restart")}</button>`));
    }
  });
  it("a service that is not installed shows no controls, and nothing is clickable while one is busy", () => {
    const missing = render("en", service({ installed: false, active: "inactive" }));
    expect(missing).toContain(text("en", "adm_not_installed"));
    expect(missing).not.toContain("<button");
    expect((render("en", service({}), true).match(/disabled=""/g) ?? []).length).toBe(3);
  });
  it("has every phrase the screens use in all seven languages", () => {
    const wanted = requiredUiKeys.filter(key => key.startsWith("adm_") || /^tab(Services|Broker|Files)$/.test(key));
    expect(wanted.length).toBeGreaterThan(60);
    for (const locale of locales) for (const key of wanted) expect(text(locale, key).trim().length, `${locale} ${key}`).toBeGreaterThan(0);
  });
});
