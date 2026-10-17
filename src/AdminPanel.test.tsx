import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrokerTlsCard, ServiceRow } from "./AdminPanel";
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

describe("the card of the encryption of the link to the broker", () => {
  const escaped = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
  const card = (locale: (typeof locales)[number], state: Parameters<typeof BrokerTlsCard>[0]["state"]) => renderToStaticMarkup(createElement(BrokerTlsCard, { t: key => text(locale, key), state }));
  const authority = { fingerprint256: "AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89", subject: "O=A.R.M.O.R. installation, CN=A.R.M.O.R. MQTT authority (casa)", valid_to: "2036-01-02T03:04:05.000Z" };
  it("shows nothing until the state is known", () => {
    expect(card("en", null)).toBe("");
  });
  it("says plainly, and without alarm, that the default link is not encrypted, and that there is nothing to encrypt without a broker", () => {
    for (const locale of locales) {
      const plain = card(locale, { configured: true, tls: false, pinned_ca: false });
      expect(plain, locale).toContain(text(locale, "adm_tls_title"));
      expect(plain, locale).toContain(escaped(text(locale, "adm_tls_off")));
      expect(plain, locale).not.toContain("bad");
      expect(card(locale, { configured: false, tls: false, pinned_ca: false }), locale).toContain(escaped(text(locale, "adm_tls_none")));
    }
  });
  it("shows that the link is encrypted and the fingerprint of the authority it trusts, in every language, but never a certificate or a path", () => {
    for (const locale of locales) {
      const html = card(locale, { configured: true, tls: true, pinned_ca: true, ca: authority });
      expect(html, locale).toContain(escaped(text(locale, "adm_tls_on")));
      expect(html, locale).toContain(authority.fingerprint256);
      expect(html, locale).toContain("2036-01-02");
      expect(html, locale).toContain(escaped(text(locale, "adm_tls_compare")));
      expect(html).not.toContain("BEGIN");
    }
    expect(card("en", { configured: true, tls: true, pinned_ca: false })).toContain(escaped(text("en", "adm_tls_unpinned")));
  });
  it("has the phrases in all eight languages", () => {
    const wanted = requiredUiKeys.filter(key => key.startsWith("adm_tls_"));
    expect(wanted.length).toBe(10);
    for (const locale of locales) for (const key of wanted) expect(text(locale, key).trim().length, `${locale} ${key}`).toBeGreaterThan(0);
  });
});
