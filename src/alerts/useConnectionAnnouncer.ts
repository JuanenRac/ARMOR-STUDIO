/**
 * Says aloud when something connects: a field node, a device, a camera, an alarm panel, a solar or an electrical node. It only speaks about what CHANGED while Studio was open - the first
 * look just learns what is there - and only when it went from not answering to answering (or appeared for the first time). A source that could not be read (the server did not answer)
 * says nothing about anything: it is not taken as "everything went offline" and then "everything came back".
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useRef } from "react";
import { speak } from "./sounds";
import { getAlerts } from "./settings";

export const CONNECTION_KINDS = ["node", "device", "camera", "alarm", "solar", "electrical"] as const;
export type ConnectionKind = (typeof CONNECTION_KINDS)[number];
export type Connectable = { id: string; name: string; online: boolean };
export type Sources = Partial<Record<ConnectionKind, readonly Connectable[] | null | undefined>>;
export type Connected = { kind: ConnectionKind; id: string; name: string };

/** What came online since the last look. `known` maps "kind:id" to whether it answered; null on the very first look. */
export function connectedSince(known: Map<string, boolean> | null, sources: Sources): { connected: Connected[]; known: Map<string, boolean> } {
  const next = new Map(known ?? []);
  const connected: Connected[] = [];
  for (const kind of CONNECTION_KINDS) {
    const list = sources[kind];
    if (!list) continue;   // not read this time: nothing is said about it
    for (const item of list) {
      const key = `${kind}:${item.id}`;
      const before = next.get(key);
      if (known !== null && item.online && before !== true) connected.push({ kind, id: item.id, name: item.name || item.id });
      next.set(key, item.online);
    }
  }
  return { connected, known: next };
}

/** The sentence for a batch: the first thing connected, and how many more. */
export function connectionSentence(connected: readonly Connected[], t: (key: string) => string): string {
  const first = connected[0];
  if (!first) return "";
  const sentence = t(`conn_${first.kind}`).replace("{name}", first.name);
  return connected.length > 1 ? `${sentence}. +${connected.length - 1}` : sentence;
}

export function useConnectionAnnouncer(options: { sources: Sources; t: (key: string) => string; language: string; enabled: boolean }): void {
  const { sources, t, language, enabled } = options;
  const known = useRef<Map<string, boolean> | null>(null);
  const latest = useRef({ t, language });
  latest.current = { t, language };
  useEffect(() => {
    const { connected, known: next } = connectedSince(known.current, sources);
    known.current = next;
    if (!enabled || connected.length === 0) return;
    const settings = getAlerts();
    if (!settings.voice.sayConnections) return;
    speak(connectionSentence(connected, latest.current.t), settings, latest.current.language);
  }, [sources, enabled]);
}
