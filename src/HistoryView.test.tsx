import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HistoryView } from "./HistoryView";
import { locales, text } from "./i18n";

describe("the History", () => {
  it("has the tabs for all, alarms, connections, devices, system and settings, in every language", () => {
    for (const locale of locales) {
      const html = renderToStaticMarkup(createElement(HistoryView, { origin: "http://x", t: key => text(locale, key) }));
      for (const key of ["his_tab_alarms", "his_tab_connections", "his_tab_devices", "his_tab_system", "his_tab_settings"]) expect(html, `${locale}:${key}`).toContain(`>${text(locale, key)}<`);
      expect(html).toContain('data-tour="his-tabs"');
    }
  });
});
