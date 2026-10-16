import { describe, expect, it } from "vitest";
import { parseAlerts } from "./settings";
import { connectedSince, connectionSentence, type Sources } from "./useConnectionAnnouncer";
import { locales, text } from "../i18n";

const node = (id: string, online: boolean) => ({ id, name: id, online });
const look = (known: Map<string, boolean> | null, sources: Sources) => connectedSince(known, sources);

describe("saying aloud what connects", () => {
  it("learns the first look in silence", () => {
    const first = look(null, { node: [node("radar-1", true), node("radar-2", false)] });
    expect(first.connected).toEqual([]);
    expect(first.known.get("node:radar-1")).toBe(true);
  });

  it("says a node that goes from not answering to answering, once", () => {
    let state = look(null, { node: [node("radar-1", false)] }).known;
    const back = look(state, { node: [node("radar-1", true)] });
    expect(back.connected).toEqual([{ kind: "node", id: "radar-1", name: "radar-1" }]);
    state = back.known;
    expect(look(state, { node: [node("radar-1", true)] }).connected).toEqual([]);   // already connected: nothing more
    const gone = look(state, { node: [node("radar-1", false)] });
    expect(gone.connected).toEqual([]);                                                // losing it is the alarms' to say
    expect(look(gone.known, { node: [node("radar-1", true)] }).connected).toHaveLength(1);
  });

  it("says something that appears for the first time while Studio is open, but not what was there at the start", () => {
    const state = look(null, { device: [{ id: "lamp", name: "Garden lamp", online: true }] }).known;
    const next = look(state, { device: [{ id: "lamp", name: "Garden lamp", online: true }, { id: "door", name: "Door sensor", online: true }, { id: "off", name: "Off", online: false }] });
    expect(next.connected.map(item => item.name)).toEqual(["Door sensor"]);
  });

  it("says nothing about a source that could not be read, and does not take it for everything gone and back", () => {
    let state = look(null, { node: [node("a", true)], camera: [{ id: "c", name: "Gate", online: true }] }).known;
    const failed = look(state, { node: [node("a", true)], camera: null });
    expect(failed.connected).toEqual([]);
    state = failed.known;
    expect(look(state, { node: [node("a", true)], camera: [{ id: "c", name: "Gate", online: true }] }).connected).toEqual([]);
  });

  it("makes one sentence for a batch, in every language, with the name in it", () => {
    const batch = [{ kind: "node" as const, id: "radar-1", name: "radar-1" }, { kind: "camera" as const, id: "c", name: "Gate" }];
    for (const language of locales) {
      const sentence = connectionSentence(batch, key => text(language, key));
      expect(sentence, language).toContain("radar-1");
      expect(sentence, language).toContain("+1");
      expect(sentence, language).not.toContain("conn_");
      expect(sentence, language).not.toContain("{name}");
    }
    expect(connectionSentence([], key => key)).toBe("");
  });

  it("is on by default and can be switched off", () => {
    expect(parseAlerts(null).voice.sayConnections).toBe(true);
    expect(parseAlerts(JSON.stringify({ voice: { sayConnections: false } })).voice.sayConnections).toBe(false);
  });
});
