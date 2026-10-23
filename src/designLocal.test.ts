import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { forgetCleanCopies, readLocalCopy, writeLocalCopy } from "./designLocal";
import { rememberUser, setStorageUser } from "./storageScope";

const store = new Map<string, string>();
const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value), removeItem: (key: string) => void store.delete(key), get length() { return store.size; }, key: (index: number) => [...store.keys()][index] ?? null };

describe("the copy of a drawing that a browser keeps", () => {
  beforeEach(() => { store.clear(); (globalThis as { window?: unknown }).window = { localStorage: storage }; });
  afterEach(() => { setStorageUser(null); delete (globalThis as { window?: unknown }).window; });

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

  it("belongs to one person: what the first left unsent is not offered to the second who signs in on the same browser", () => {
    setStorageUser("ana");
    writeLocalCopy("electrical", "http://house:8080", { baseRevision: 3, dirty: true, doc: { elements: ["ana's"] } });
    setStorageUser("ben");
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")).toBeNull();
    setStorageUser("ana");
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")?.doc).toEqual({ elements: ["ana's"] });
  });

  it("is taken over by the first person who signs in when it was kept before copies were kept per person, and is not offered to the next", () => {
    writeLocalCopy("network", "http://house:8080", { baseRevision: 1, dirty: false, doc: { nodes: ["old"] } });   // nobody known: the key of old
    setStorageUser("ana");
    expect(readLocalCopy("network", "legacy", "http://house:8080")?.doc).toEqual({ nodes: ["old"] });
    setStorageUser("ben");
    expect(readLocalCopy("network", "legacy", "http://house:8080")).toBeNull();
  });

  it("is there while the server (and so the answer to who is signed in) is not: the copy of the person who was signed in the last time", () => {
    setStorageUser("ana");
    rememberUser("http://house:8080", "ana");
    writeLocalCopy("alarm", "http://house:8080", { baseRevision: 2, dirty: true, doc: { zones: [1] } });
    setStorageUser(null);   // a new page load: nobody is known yet
    expect(readLocalCopy("alarm", "legacy", "http://house:8080")?.doc).toEqual({ zones: [1] });
    expect(readLocalCopy("alarm", "legacy", "http://bench:8080")).toBeNull();
  });

  it("on signing out keeps the copy that has changes the server never got and forgets the one that is in step", () => {
    setStorageUser("ana");
    writeLocalCopy("electrical", "http://house:8080", { baseRevision: 3, dirty: true, doc: { a: 1 } });
    writeLocalCopy("network", "http://house:8080", { baseRevision: 3, dirty: false, doc: { b: 1 } });
    setStorageUser("ben");
    writeLocalCopy("alarm", "http://house:8080", { baseRevision: 3, dirty: false, doc: { c: 1 } });
    setStorageUser("ana");
    forgetCleanCopies();
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")?.dirty).toBe(true);
    expect(readLocalCopy("network", "legacy", "http://house:8080")).toBeNull();
    setStorageUser("ben");
    expect(readLocalCopy("alarm", "legacy", "http://house:8080")?.doc).toEqual({ c: 1 });   // the copy of another person is not touched
  });
});
