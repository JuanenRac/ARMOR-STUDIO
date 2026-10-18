/**
 * Hover hints for the whole console. Pausing the pointer over a button, a field or a menu entry shows a short explanation in the language
 * of the interface. The hints live in one catalogue (hintText.ts) keyed by the same keys as the labels, and this file finds, for every
 * control on the screen, the key its label belongs to - so a new screen needs no extra code, only a row in the catalogue.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D)
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { locales, text, type Locale } from "./i18n";
import { hintCatalogue } from "./hintText";
import { hintsPt } from "./hintsPt";
import { fallbackHint, fallbackKind, fallbackLabel } from "./hintFallback";

const ACTIVE = "button, a[href], select, input:not([type=hidden]), textarea, summary, [role=tab], [role=button]";   // the controls that always say what they are, even with no row in the catalogue
const CONTROLS = "button, a[href], select, input:not([type=hidden]), textarea, summary, [role=tab], [role=button], label, th, h3";
export const normal = (value: string): string => value.replace(/\s+/g, " ").trim().toLowerCase();

const reverse = new Map<Locale, Map<string, string[]>>();
/** The label of every key that has a hint, in one language, pointing back at the keys. A key written "nav:x" is the hint of the label x when it is a menu entry. */
const labelsOf = (locale: Locale): Map<string, string[]> => {
  let map = reverse.get(locale);
  if (!map) {
    map = new Map();
    for (const key of Object.keys(hintCatalogue)) {
      const label = normal(text(locale, key.replace(/^nav:/, "")));
      if (!label) continue;
      const list = map.get(label);
      if (list) list.push(key); else map.set(label, [key]);
    }
    reverse.set(locale, map);
  }
  return map;
};

const currentLocale = (): Locale => {
  const code = document.documentElement.lang.slice(0, 2) as Locale;
  return (locales as readonly string[]).includes(code) ? code : "en";
};

/** What an element says about itself: its aria-label, its placeholder, the text it holds, and (for a field) the label it sits in. */
const wordsOf = (element: Element): string[] => {
  const found: string[] = [];
  const aria = element.getAttribute("aria-label");
  if (aria) found.push(aria);
  const placeholder = element.getAttribute("placeholder");
  if (placeholder) found.push(placeholder);
  const own = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent ?? "").join(" ");
  if (own.trim()) found.push(own);
  const whole = element.textContent ?? "";
  if (whole.length > 0 && whole.length <= 80) found.push(whole);
  const first = element.firstElementChild;
  if (first && element.tagName === "LABEL" && first.textContent) found.push(first.textContent);
  const label = element.closest("label");
  if (label && label !== element) {
    const labelOwn = Array.from(label.childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent ?? "").join(" ");
    if (labelOwn.trim()) found.push(labelOwn);
    const span = label.querySelector(":scope > span");
    if (span?.textContent) found.push(span.textContent);
  }
  return found.map(normal).filter(word => word !== "");
};

/** The key whose hint explains an element that says these words (already normalised); a menu entry prefers its "nav:" hint. */
export function keyFor(words: readonly string[], locale: Locale, inMenu: boolean): string | undefined {
  const labels = labelsOf(locale);
  for (const word of words) {
    const keys = labels.get(word);
    if (keys) return inMenu ? keys.find(candidate => candidate.startsWith("nav:")) ?? keys[0] : keys.find(candidate => !candidate.startsWith("nav:")) ?? keys[0];
  }
  return undefined;
}

function apply(element: Element, locale: Locale): void {
  const html = element as HTMLElement;
  if (html.dataset.noHint !== undefined || html.dataset.tip !== undefined) return;   // a control whose hint is on show (the rich hints take its title off for a moment)
  const owned = html.dataset.hintKey !== undefined;   // a title this file wrote earlier (the element may now say something else)
  const words = wordsOf(element);
  const key = keyFor(words, locale, element.closest("aside.sidebar nav") !== null);
  if (!key) {
    // no row in the catalogue: a control that can be used still says what it is and what it does (hintFallback.ts); a heading or a label does not need to
    const current = html.getAttribute("title");
    if (element.matches(ACTIVE) && !(current && !owned)) {
      const kind = fallbackKind(element);
      const hint = fallbackHint(kind, fallbackLabel(element, kind), locale);
      if (hint) { if (current !== hint) html.title = hint; html.dataset.hintKey = "fallback"; return; }
    }
    if (owned) { html.removeAttribute("title"); delete html.dataset.hintKey; }
    return;
  }
  const hint = locale === "pt" ? (hintsPt[key] ?? hintCatalogue[key][0]) : hintCatalogue[key][locales.indexOf(locale)];
  const current = html.getAttribute("title");
  // A title the code wrote on purpose stays; one that only repeats the label (or one we wrote earlier) is replaced by the explanation.
  if (current && !owned && !words.includes(normal(current))) return;
  html.title = hint;
  html.dataset.hintKey = key;
}

/** Above this many places to look at, a full pass over the page is cheaper than the list. */
const MANY = 150;

/** Start watching the page; call the returned function to stop. */
export function installHoverHints(): () => void {
  let scheduled = 0;
  let everything = true;
  const pending = new Set<Element>();
  const scanTree = (root: Element, locale: Locale) => { if (root.matches(CONTROLS)) apply(root, locale); root.querySelectorAll(CONTROLS).forEach(element => apply(element, locale)); };
  const scan = () => {
    scheduled = 0;
    const locale = currentLocale();
    if (everything || pending.size > MANY) document.querySelectorAll(CONTROLS).forEach(element => apply(element, locale));
    else for (const root of pending) if (root.isConnected) scanTree(root, locale);
    everything = false; pending.clear();
  };
  const later = () => { if (!scheduled) scheduled = window.setTimeout(scan, 120); };
  // Only what changed is looked at: the clock of the status bar and every other second-by-second redraw must not make a pass over the whole page (every menu kept open, every drawing) each time.
  const watch = (records: MutationRecord[]) => {
    for (const record of records) {
      const target = record.target.nodeType === Node.ELEMENT_NODE ? record.target as Element : record.target.parentElement;
      const control = target?.closest(CONTROLS);   // a control whose words changed says something else now
      if (control) pending.add(control);
      record.addedNodes.forEach(node => { if (node.nodeType === Node.ELEMENT_NODE) pending.add(node as Element); });
    }
    if (pending.size > 0) later();
  };
  scan();
  const observer = new MutationObserver(watch);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  const language = new MutationObserver(() => { everything = true; later(); });
  language.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  return () => { observer.disconnect(); language.disconnect(); if (scheduled) window.clearTimeout(scheduled); };
}
