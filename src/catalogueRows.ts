/**
 * Interface phrases written one row per phrase in the seven languages (English, Spanish, German, French, Italian, Japanese, Chinese),
 * so a phrase cannot be added in one language and forgotten in another.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export type Row = readonly [en: string, es: string, de: string, fr: string, it: string, ja: string, zh: string];
export const LANGUAGE_ORDER = ["en", "es", "de", "fr", "it", "ja", "zh"] as const;
export type RowCatalogues = Record<(typeof LANGUAGE_ORDER)[number], Record<string, string>>;

export function cataloguesFromRows(rows: Record<string, Row>): RowCatalogues {
  const result = Object.fromEntries(LANGUAGE_ORDER.map(code => [code, {} as Record<string, string>])) as RowCatalogues;
  for (const [key, row] of Object.entries(rows)) LANGUAGE_ORDER.forEach((code, index) => { result[code][key] = row[index]; });
  return result;
}
