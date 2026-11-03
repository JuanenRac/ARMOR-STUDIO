/**
 * The completeness of the language tables, one line per language: how many phrases English has, how many the language lacks, how many it leaves as English (a phrase that is the same as
 * English is often a name, but a long one is usually a phrase nobody translated), and the short labels (buttons, tabs) whose translation is much longer than the English one and may
 * not fit where the English did. Pure: it reads catalogues and writes nothing; tools/i18n_report.mjs prints it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export type LanguageReport = { code: string; total: number; missing: number; sameAsEnglish: number; longLabels: Array<{ key: string; english: string; text: string }> };

/** English labels this short are the ones that sit in buttons and tabs. */
export const LABEL_MAX = 24;
/** A translation this many times longer than a short English label is listed. */
export const LONG_FACTOR = 2.2;
/** A phrase the same as English counts as untranslated only from this length (shorter ones are names, units and loan words). */
export const SAME_MIN = 18;

export function reportLanguages(catalogues: Record<string, Record<string, string>>): LanguageReport[] {
  const english = catalogues.en ?? {};
  const keys = Object.keys(english);
  return Object.keys(catalogues).filter(code => code !== "en").sort().map(code => {
    const table = catalogues[code] ?? {};
    let missing = 0, sameAsEnglish = 0;
    const longLabels: LanguageReport["longLabels"] = [];
    for (const key of keys) {
      const text = table[key], base = english[key]!;
      if (text === undefined || text === "") { missing += 1; continue; }
      if (text === base && base.length >= SAME_MIN) sameAsEnglish += 1;
      // Japanese and Chinese are written with far fewer characters, so only the alphabets are held to the factor
      if (base.length > 0 && base.length <= LABEL_MAX && !["ja", "zh"].includes(code) && text.length > Math.max(LABEL_MAX, base.length * LONG_FACTOR)) longLabels.push({ key, english: base, text });
    }
    return { code, total: keys.length, missing, sameAsEnglish, longLabels };
  });
}

/**
 * The limits the check of the language tables is held to (src/i18nReport.config.json). A language over a "warn" limit is reported as a warning and never stops anything; only
 * "failMissing" can fail a run, and it is set so high that nothing fails until the limit is lowered on purpose. A value that is not a whole number of at least 0 is read as "never".
 */
export type ReportLimits = { warnMissing: number; failMissing: number; warnSameAsEnglish: number; warnLongLabels: number };
const NEVER = Number.MAX_SAFE_INTEGER;
const limit = (value: unknown): number => (typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : NEVER);
export function readLimits(raw: Record<string, unknown>): ReportLimits {
  return { warnMissing: limit(raw.warnMissing), failMissing: limit(raw.failMissing), warnSameAsEnglish: limit(raw.warnSameAsEnglish), warnLongLabels: limit(raw.warnLongLabels) };
}
/** What the limits say about a report: lines to warn about, and lines that fail the run. */
export function judgeReport(reports: LanguageReport[], limits: ReportLimits): { warnings: string[]; failures: string[] } {
  const warnings: string[] = [], failures: string[] = [];
  for (const item of reports) {
    if (item.missing > limits.failMissing) failures.push(`${item.code} lacks ${item.missing} phrases (the limit is ${limits.failMissing})`);
    else if (item.missing > limits.warnMissing) warnings.push(`${item.code} lacks ${item.missing} phrases`);
    if (item.sameAsEnglish > limits.warnSameAsEnglish) warnings.push(`${item.code} leaves ${item.sameAsEnglish} long phrases in English`);
    if (item.longLabels.length > limits.warnLongLabels) warnings.push(`${item.code} has ${item.longLabels.length} labels much longer than English`);
  }
  return { warnings, failures };
}

/** The report as lines of text for a person (or a CI log). */
export function renderReport(reports: LanguageReport[], listLongest = 5): string {
  const lines = ["language  phrases  missing  same-as-English  long-labels"];
  for (const item of reports) lines.push(`${item.code.padEnd(8)}  ${String(item.total).padStart(7)}  ${String(item.missing).padStart(7)}  ${String(item.sameAsEnglish).padStart(15)}  ${String(item.longLabels.length).padStart(11)}`);
  for (const item of reports) {
    const worst = [...item.longLabels].sort((a, b) => b.text.length / b.english.length - a.text.length / a.english.length).slice(0, listLongest);
    if (worst.length > 0) lines.push("", `${item.code}: labels much longer than English`, ...worst.map(label => `  ${label.key}: "${label.english}" -> "${label.text}"`));
  }
  return lines.join("\n");
}
