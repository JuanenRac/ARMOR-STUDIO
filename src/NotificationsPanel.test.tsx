import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NotificationsPanel } from "./NotificationsPanel";
import { locales, requiredUiKeys, text } from "./i18n";

describe("the notifications screen", () => {
  it("is for administrators only", () => {
    const html = renderToStaticMarkup(createElement(NotificationsPanel, { t: key => text("es", key), origin: "http://x", isAdmin: false }));
    expect(html).toContain(text("es", "cs_admin_only"));
  });

  it("explains how to set up Telegram and Home Assistant, with the keys of the settings file, in every language", () => {
    for (const locale of locales) {
      const html = renderToStaticMarkup(createElement(NotificationsPanel, { t: key => text(locale, key), origin: "http://x", isAdmin: true }));
      expect(html, locale).toContain("ARMOR_TELEGRAM_BOT_TOKEN");
      expect(html, locale).toContain("ARMOR_TELEGRAM_CHAT_IDS");
      expect(html, locale).toContain("ARMOR_HOMEASSISTANT_URL");
      expect(html, locale).toContain("ARMOR_HOMEASSISTANT_WEBHOOK_ID");
      expect(html, locale).toContain("BotFather");
    }
  });

  it("has every phrase in all seven languages", () => {
    const wanted = requiredUiKeys.filter(key => key.startsWith("nt_") || key === "tabNotifications");
    expect(wanted.length).toBeGreaterThan(20);
    for (const locale of locales) for (const key of wanted) expect(text(locale, key).trim().length, `${locale} ${key}`).toBeGreaterThan(0);
  });
});
