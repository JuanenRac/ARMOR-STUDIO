import { ensureLocale, locales } from "./i18n";

// The tests read the phrases of every language: the console fetches each one when it is first chosen, so all of them are loaded before any test runs.
await Promise.all(locales.map(locale => ensureLocale(locale)));
