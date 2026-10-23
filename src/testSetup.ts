import { ensureLocale } from "./i18n";

// The tests read the phrases of every language: Portuguese, which the console fetches when it is first chosen, is loaded before any of them runs.
await ensureLocale("pt");
