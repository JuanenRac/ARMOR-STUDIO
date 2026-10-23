/**
 * A.R.M.O.R. Studio local interface catalogue.
 *
 * The phrases are written once, one row per phrase in every language, in the files named *Text.ts, and tools/build_locales.mjs turns them into one file per language in
 * src/locales. English is part of the page (it is what any phrase a language lacks falls back to); every other language is a file of its own that is fetched the first time
 * it is chosen (see ensureLocale), so a person who reads the console in one language never downloads the other six.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D)
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import en from "./locales/en";
import { HINT_PREFIX } from "./locales/keys";

export const locales = ["en", "es", "de", "fr", "it", "ja", "zh", "pt"] as const;
export type Locale = (typeof locales)[number];
type Catalogue = Record<string, string>;

const translations: Record<Locale, Catalogue> = { en, es: {}, de: {}, fr: {}, it: {}, ja: {}, zh: {}, pt: {} };
const loaders: Record<Exclude<Locale, "en">, () => Promise<{ default: Catalogue }>> = {
  es: () => import("./locales/es"), de: () => import("./locales/de"), fr: () => import("./locales/fr"), it: () => import("./locales/it"),
  ja: () => import("./locales/ja"), zh: () => import("./locales/zh"), pt: () => import("./locales/pt"),
};
const loading = new Map<Locale, Promise<void>>();
const loaded = new Set<Locale>(["en"]);

/** Resolves when the phrases of the language are there. English is always there; until another language arrives a phrase is shown in English. */
export function ensureLocale(locale: Locale): Promise<void> {
  if (loaded.has(locale)) return Promise.resolve();
  let pending = loading.get(locale);
  if (!pending) {
    pending = loaders[locale as Exclude<Locale, "en">]().then(module => { Object.assign(translations[locale], module.default); loaded.add(locale); });
    // A failed fetch (the network went away) is tried again the next time the language is asked for.
    pending.catch(() => loading.delete(locale));
    loading.set(locale, pending);
  }
  return pending;
}
export const isLocaleLoaded = (locale: Locale): boolean => loaded.has(locale);
/** The keys every language is expected to have: those of English, without the hover hints (they have their own check). */
export const requiredUiKeys = Object.keys(en).filter(key => !key.startsWith(HINT_PREFIX));
export function text(locale: Locale, key: string): string { return translations[locale][key] ?? en[key] ?? key; }
