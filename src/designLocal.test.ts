import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readLocalCopy, writeLocalCopy } from "./designLocal";

const store = new Map<string, string>();
const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value), removeItem: (key: string) => void store.delete(key) };

describe("the copy of a drawing that a browser keeps", () => {
  beforeEach(() => { store.clear(); (globalThis as { window?: unknown }).window = { localStorage: storage }; });
  afterEach(() => { delete (globalThis as { window?: unknown }).window; });

  it("belongs to one server: the drawing of the house is never offered to the bench", () => {
    writeLocalCopy("electrical", "http://house:8080", { baseRevision: 4, dirty: true, doc: { elements: ["house"] } });
    expect(readLocalCopy("electrical", "legacy", "http://bench:8080")).toBeNull();
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")).toEqual({ baseRevision: 4, dirty: true, doc: { elements: ["house"] } });
  });

  it("uses the copy of the old single key only for the server the browser signed in to last, and only when the server has no copy of its own", () => {
    store.set("legacy", JSON.stringify({ elements: ["old"] }));
    store.set("armor-studio-origin", "http://house:8080");
    expect(readLocalCopy("electrical", "legacy", "http://bench:8080")).toBeNull();
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")).toEqual({ baseRevision: null, dirty: false, doc: { elements: ["old"] } });
    writeLocalCopy("electrical", "http://house:8080", { baseRevision: 2, dirty: false, doc: { elements: ["new"] } });
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")?.doc).toEqual({ elements: ["new"] });
  });

  it("ignores what is not a copy and survives a storage that is blocked", () => {
    store.set("armor-studio-electrical-copy:http://house:8080", "not json");
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")).toBeNull();
    store.set("armor-studio-electrical-copy:http://house:8080", JSON.stringify({ baseRevision: "x", dirty: "yes", doc: [] }));
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")).toBeNull();
    (globalThis as { window?: unknown }).window = { localStorage: { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } } };
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")).toBeNull();
    expect(() => writeLocalCopy("electrical", "http://house:8080", { baseRevision: null, dirty: false, doc: {} })).not.toThrow();
  });
});
