import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locales, text } from "./i18n";

const shared = path.join(process.cwd(), "..", "ARMOR-COMMON", "src", "armor_common", "alarm_codes.json");

describe("the words of the alarm codes", () => {
  it.skipIf(!fs.existsSync(shared))("are the shared table of ARMOR-COMMON, in every language", () => {
    const table = JSON.parse(fs.readFileSync(shared, "utf8")) as { codes: Record<string, Record<string, string>> };
    expect(Object.keys(table.codes).length).toBeGreaterThan(50);
    for (const [code, words] of Object.entries(table.codes)) for (const locale of locales) expect(text(locale, `alarm_${code}`), `${locale} ${code}`).toBe(words[locale]);
  });
});
