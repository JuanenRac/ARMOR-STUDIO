import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { isLowering, SecurityPanel } from "./SecurityPanel";
import { locales, text } from "./i18n";

const IDS = ["ingeststrict", "batterywrite", "cm5update"].flatMap(id => [`sec_opt_${id}`, `sec_opt_${id}_help`, `sec_opt_${id}_warn`]).concat("sec_opt_ingeststrict_nodes");

describe("the switches that used to exist only as environment variables of the server", () => {
  it("have their words in the eight languages, translated and not repeated", () => {
    for (const id of IDS) {
      const words = new Set<string>();
      for (const locale of locales) {
        const phrase = text(locale, id);
        expect(phrase.trim().length, `${locale} ${id}`).toBeGreaterThan(2);
        expect(phrase, `${locale} ${id} is not the key`).not.toBe(id);
        words.add(phrase);
      }
      expect(words.size, `${id} is translated, not repeated`).toBe(8);
    }
    for (const locale of locales) expect(text(locale, "sec_opt_ingeststrict_nodes"), locale).toContain("{nodes}");
    expect(text("pt", "sec_opt_cm5update")).toContain("Atualizar");
  });

  it("ask before the strict mode is turned off and before writing to batteries or updating the machine is turned on", () => {
    expect(isLowering([true, false], true, false)).toBe(true);
    expect(isLowering([true, false], false, true)).toBe(false);
    expect(isLowering([false, true], false, true)).toBe(true);
    expect(isLowering([false, true], true, false)).toBe(false);
  });

  it("are not offered to someone who is not an administrator", () => {
    const t = (key: string) => text("en", key);
    const html = renderToStaticMarkup(createElement(SecurityPanel, { t, origin: "http://127.0.0.1:8080", isAdmin: false }));
    expect(html).not.toContain("security-option-ingeststrict");
    expect(html).not.toContain("security-shared-token-nodes");
  });
});
