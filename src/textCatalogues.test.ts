/**
 * Characterization of the interface text modules: every catalogue written one row per phrase has the same keys in the seven languages, no empty phrase and the same {n} placeholders in
 * every language; where Portuguese is present it has the same keys as English.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { describe, expect, it } from "vitest";

type Catalogue = Record<string, string>;
const LANGUAGES = ["en", "es", "de", "fr", "it", "ja", "zh"] as const;

const modules = import.meta.glob<Record<string, unknown>>("./*Text.ts", { eager: true });

function isCatalogues(value: unknown): value is Record<string, Catalogue> {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return LANGUAGES.every(code => typeof record[code] === "object" && record[code] !== null);
}

const found: { name: string; catalogues: Record<string, Catalogue> }[] = [];
for (const [path, exported] of Object.entries(modules)) {
  for (const [name, value] of Object.entries(exported)) {
    if (isCatalogues(value)) found.push({ name: `${path.replace("./", "")}:${name}`, catalogues: value });
  }
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

describe("the interface text catalogues", () => {
  it("are found in the text modules", () => {
    expect(found.length).toBeGreaterThan(20);
  });

  it.each(found.map(entry => [entry.name, entry] as const))("%s has the same keys in the seven languages", (_name, entry) => {
    const english = Object.keys(entry.catalogues.en).sort();
    expect(english.length).toBeGreaterThan(0);
    for (const code of LANGUAGES) expect(Object.keys(entry.catalogues[code]).sort(), code).toEqual(english);
  });

  it.each(found.map(entry => [entry.name, entry] as const))("%s has no empty phrase and keeps the placeholders", (_name, entry) => {
    for (const [key, english] of Object.entries(entry.catalogues.en)) {
      for (const code of LANGUAGES) {
        const phrase = entry.catalogues[code][key];
        expect(typeof phrase, `${code}.${key}`).toBe("string");
        expect(phrase.trim().length, `${code}.${key}`).toBeGreaterThan(0);
        expect(placeholders(phrase), `${code}.${key}`).toEqual(placeholders(english));
      }
    }
  });

  it.each(found.filter(entry => entry.catalogues.pt).map(entry => [entry.name, entry] as const))("%s has Portuguese for every English key", (_name, entry) => {
    const portuguese = entry.catalogues.pt as Catalogue;
    const missing = Object.keys(entry.catalogues.en).filter(key => !(key in portuguese));
    expect(missing).toEqual([]);
  });
});
