import { describe, expect, it } from "vitest";
import { parseReleaseNotes } from "./releaseNotes";

describe("the notes of a release", () => {
  it("become the points of a list and plain paragraphs, with no markup", () => {
    const lines = parseReleaseNotes("## Title\r\n\r\n- First **point**.\n- Second `point`.\nA closing line.\n\n* Third");
    expect(lines).toEqual([
      { kind: "item", text: "First point." }, { kind: "item", text: "Second point." }, { kind: "text", text: "A closing line." }, { kind: "item", text: "Third" },
    ]);
  });
  it("are bounded, and an empty release has no lines", () => {
    expect(parseReleaseNotes("")).toEqual([]);
    expect(parseReleaseNotes(Array.from({ length: 200 }, (_, i) => `- point ${i}`).join("\n"))).toHaveLength(60);
    expect(parseReleaseNotes(`- ${"x".repeat(5000)}`)[0]!.text).toHaveLength(600);
  });
  it("never keep a link or an html tag as something to follow", () => {
    const [line] = parseReleaseNotes("- <script>alert(1)</script> [site](http://x)");
    expect(line!.kind).toBe("item");
    expect(typeof line!.text).toBe("string");   // it is rendered as text by React, never as html
  });
});
