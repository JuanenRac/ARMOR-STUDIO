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
  it("offer stop, restart and pause for a running service, start for a stopped one and resume for a paused one, as pictures with a name, in every language", () => {
    for (const locale of locales) {
      const running = render(locale, service({}));
      expect(running, locale).toContain(text(locale, "adm_state_active"));
      for (const action of ["stop", "restart", "pause"]) expect(running).toContain(`class="svc-act ${action}" title="${text(locale, `svcBtn_${action}`)}"`);
      expect(running).not.toContain('class="svc-act start"');
      const stopped = render(locale, service({ active: "inactive", pid: 0 }));
      expect(stopped).toContain(text(locale, "adm_state_inactive"));
      expect(stopped).toContain('class="svc-act start"');
      expect(stopped).not.toContain('class="svc-act stop"');
      const paused = render(locale, service({ paused: true }));
      expect(paused).toContain(text(locale, "svcState_paused"));
      expect(paused).toContain('class="svc-act resume"');
      expect(paused).not.toContain('class="svc-act pause"');
    }
  });
  it("never offers to pause the server or Studio themselves", () => {
    expect(render("en", service({ id: "server", unit: "armor-server" }))).not.toContain('class="svc-act pause"');
    expect(render("en", service({ id: "studio", unit: "armor-studio" }))).not.toContain('class="svc-act pause"');
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
