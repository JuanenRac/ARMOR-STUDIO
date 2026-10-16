/**
 * The notes of a release (the CHANGELOG section of its version, as the release carries it) turned into lines to show: a "- " line is a point of the list, anything else a paragraph.
 * Nothing in the notes is ever treated as markup or a link: they are text from the internet, shown as text.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export type NoteLine = { kind: "item" | "text"; text: string };

export function parseReleaseNotes(notes: string): NoteLine[] {
  const lines: NoteLine[] = [];
  for (const raw of notes.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line || /^#{1,6}\s/.test(line)) continue;   // blank lines and headings (the version is already in the title)
    const item = /^[-*]\s+(.*)$/.exec(line);
    lines.push({ kind: item ? "item" : "text", text: (item ? item[1]! : line).replace(/[*_`]/g, "").slice(0, 600) });
    if (lines.length >= 60) break;
  }
  return lines;
}
