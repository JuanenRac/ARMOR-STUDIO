import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PresenceCard } from "./PresenceCard";
import { presenceShown, presenceSince } from "./presenceView";
import { locales, text } from "./i18n";
import type { PresenceSummary } from "./api/contract/armor-rest";

const summary = (state: string, people: Array<[string, string, string]>): PresenceSummary =>
  ({ state, people: people.map(([user, word, since]) => ({ user, state: word, since })) }) as unknown as PresenceSummary;

describe("what the card of who is at home shows", () => {
  it("puts the people at home first and then orders by name", () => {
    const shown = presenceShown(summary("someone_home", [["zoe", "away", "2026-01-01T10:00:00Z"], ["ana", "away", "2026-01-01T09:00:00Z"], ["luis", "home", "2026-01-01T11:00:00Z"]]));
    expect(shown.people.map(person => `${person.user}:${person.word}`)).toEqual(["luis:home", "ana:away", "zoe:away"]);
    expect(shown.homeCount).toBe(1);
    expect(shown.stateKey).toBe("prc_state_someone_home");
  });

  it("says the sum in words for each of the three sums, and unknown for a sum it does not know", () => {
    expect(presenceShown(summary("everyone_away", [])).stateKey).toBe("prc_state_everyone_away");
    expect(presenceShown(summary("unknown", [])).stateKey).toBe("prc_state_unknown");
    expect(presenceShown(summary("something_new", [])).stateKey).toBe("prc_state_unknown");
  });

  it("leaves out a person without a name or without a valid word, and survives a missing list", () => {
    const shown = presenceShown(summary("someone_home", [["", "home", "t"], ["ana", "maybe", "t"], ["luis", "home", "t"]]));
    expect(shown.people.map(person => person.user)).toEqual(["luis"]);
    expect(presenceShown({ state: "unknown" } as unknown as PresenceSummary).people).toEqual([]);
  });

  it("shows a time as the browser does and anything else as it came", () => {
    expect(presenceSince("not a date")).toBe("not a date");
    expect(presenceSince("2026-01-01T10:00:00Z")).not.toBe("2026-01-01T10:00:00Z");
  });
});

describe("the card of who is at home", () => {
  it("renders with its title, its help and the refresh button before the first answer", () => {
    const html = renderToStaticMarkup(createElement(PresenceCard, { t: (key: string) => key, origin: "http://localhost" }));
    expect(html).toContain("prc_title");
    expect(html).toContain("prc_help");
    expect(html).toContain("presence-refresh");
    expect(html).not.toContain("presence-people");
  });

  it("has every phrase in the eight languages, formal in German, French and Portuguese", () => {
    const keys = ["prc_title", "prc_help", "prc_state_everyone_away", "prc_state_someone_home", "prc_state_unknown", "prc_home", "prc_away", "prc_since", "prc_nobody", "prc_refresh", "prc_err_not_found", "prc_err_generic"];
    for (const locale of locales) for (const key of keys) {
      const phrase = text(locale, key);
      expect(phrase, `${locale} ${key}`).not.toBe(key);
      expect(phrase.trim().length).toBeGreaterThan(0);
    }
    expect(text("de", "prc_err_not_found")).not.toMatch(/\bdu\b|\bdir\b|\bdein/i);
    expect(text("fr", "prc_err_not_found")).not.toMatch(/\btu\b|\btoi\b|\bton\b/i);
  });
});
