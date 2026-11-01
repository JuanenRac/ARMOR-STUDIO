/**
 * The labels of the facts an alarm carries (`fact_<fact>`) and what an alarm code means and what to check (`alarmhelp_<code>`), in the eight languages: they are read from the table every
 * client shares, a copy of `alarm_facts.json` of ARMOR-COMMON (src/api/contract/alarm_facts.json, which a test compares with the original). A new fact or help text is added there first;
 * nothing of it is written again in this repository.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import table from "./api/contract/alarm_facts.json";

type Words = Record<string, string>;
const LANGUAGES = ["en", "es", "de", "fr", "it", "ja", "zh", "pt"] as const;
export type FactsLanguage = (typeof LANGUAGES)[number];

/** Per language: `fact_<key>` and `alarmhelp_<code>` -> the words. A language that lacks a text is left out (the console falls back to English). */
export const alarmFactsCatalogues: Record<FactsLanguage, Words> = Object.fromEntries(LANGUAGES.map(language => {
  const words: Words = {};
  for (const [key, labels] of Object.entries(table.facts as Record<string, Words>)) if (labels[language]) words[`fact_${key}`] = labels[language]!;
  for (const [code, texts] of Object.entries((table as { help?: Record<string, Words> }).help ?? {})) if (texts[language]) words[`alarmhelp_${code}`] = texts[language]!;
  return [language, words];
})) as Record<FactsLanguage, Words>;
