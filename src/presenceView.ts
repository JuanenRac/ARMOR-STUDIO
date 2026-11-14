/**
 * What the card "Who is at home" shows, made from the answer of the server: the sum in words, and the people with home first, then by name. Nothing here knows a position, only the word.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { PresenceSummary } from "./api/contract/armor-rest";

export type PresencePerson = { user: string; word: "home" | "away"; since: string };
export type PresenceShown = { stateKey: string; people: PresencePerson[]; homeCount: number };

const SUMS = new Set(["everyone_away", "someone_home", "unknown"]);

/** The card's lines. A sum the app does not know is shown as unknown; a person without a valid word is left out. */
export function presenceShown(summary: PresenceSummary): PresenceShown {
  const people = (Array.isArray(summary.people) ? summary.people : [])
    .filter(person => typeof person.user === "string" && person.user !== "" && (person.state === "home" || person.state === "away"))
    .map(person => ({ user: person.user, word: person.state, since: typeof person.since === "string" ? person.since : "" }))
    .sort((a, b) => (a.word === b.word ? a.user.localeCompare(b.user) : a.word === "home" ? -1 : 1));
  return { stateKey: `prc_state_${SUMS.has(summary.state) ? summary.state : "unknown"}`, people, homeCount: people.filter(person => person.word === "home").length };
}

/** The time of a word as the browser shows it, or the text as it came when it is not a date. */
export function presenceSince(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}
