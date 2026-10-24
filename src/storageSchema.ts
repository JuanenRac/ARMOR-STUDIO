/**
 * The version of the way this console lays out what it keeps in the browser.
 *
 * Every key the console writes (the copies of the drawings, the draft of the site, the preferences, the alerts, the camera layout...) has a shape, and a console that changes one has to
 * deal with what the previous console left behind. The layout has a number, kept under `armor-studio-storage-schema`, and each change of layout is a step that takes the browser from one
 * number to the next; at start the steps that are missing are run, once, in order. A browser that has never held anything is simply given the current number; a browser that holds a
 * LATER number (it was used by a newer console and this is an older one) is left exactly as it is, since this console would not know what it is reading.
 *
 * 1  every key as it was before the layout had a number.
 * 2  the copy of a drawing, which belonged to the whole browser, belongs to the person who last signed in to that server.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export const STORAGE_SCHEMA_KEY = "armor-studio-storage-schema";
export const CURRENT_STORAGE_SCHEMA = 2;

export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;
export type StorageStep = (store: KeyValueStore) => void;
export type StorageMigration = { from: number; to: number; ran: number[]; newer: boolean };

const PERSON = /^[A-Za-z0-9_.-]{1,64}$/;
const keysOf = (store: KeyValueStore): string[] => Array.from({ length: store.length }, (_, index) => store.key(index)).filter((key): key is string => key !== null);

/** 1 -> 2: what the browser kept for everybody is given to the person who last signed in to that server, unless that person already has their own. */
export const copiesBelongToAPerson: StorageStep = store => {
  for (const key of keysOf(store)) {
    const copy = /^armor-studio-[a-z]+-copy:(.+)$/.exec(key);
    if (!copy || key.includes("#u:")) continue;
    const person = store.getItem(`armor-studio-last-user:${copy[1]}`);
    if (!person || !PERSON.test(person)) continue;
    const own = `${key}#u:${person}`;
    if (store.getItem(own) === null) { const value = store.getItem(key); if (value !== null) store.setItem(own, value); }
    store.removeItem(key);
  }
};

/** The steps, by the number they start from. */
export const STEPS: Readonly<Record<number, StorageStep>> = { 1: copiesBelongToAPerson };

const holdsSomethingOfTheConsole = (store: KeyValueStore): boolean => keysOf(store).some(key => key.startsWith("armor-studio-") && key !== STORAGE_SCHEMA_KEY);

/** Brings what the browser holds to the current layout. Nothing it cannot do ever stops the console: a step that fails leaves the number where it was, to be tried again at the next start. */
export function migrateStorage(store: KeyValueStore = window.localStorage, steps: Readonly<Record<number, StorageStep>> = STEPS, current: number = CURRENT_STORAGE_SCHEMA): StorageMigration {
  let from = 1;
  try {
    const raw = store.getItem(STORAGE_SCHEMA_KEY);
    if (raw === null && !holdsSomethingOfTheConsole(store)) {   // a browser that has never held anything of the console starts at the current layout
      store.setItem(STORAGE_SCHEMA_KEY, String(current));
      return { from: current, to: current, ran: [], newer: false };
    }
    const stored = raw === null ? 1 : Number(raw);
    from = Number.isInteger(stored) && stored >= 1 ? stored : 1;
    if (from > current) return { from, to: from, ran: [], newer: true };
    const ran: number[] = [];
    let at = from;
    try {
      while (at < current) {
        steps[at]?.(store);
        ran.push(at);
        at += 1;
        store.setItem(STORAGE_SCHEMA_KEY, String(at));   // after every step, so a later failure does not repeat the ones that went through
      }
    } catch { /* the step that failed is tried again at the next start */ }
    return { from, to: at, ran, newer: false };
  } catch {
    return { from, to: from, ran: [], newer: false };   // storage blocked: nothing to migrate
  }
}
