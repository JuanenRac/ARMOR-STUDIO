import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { canonical, diffDesigns } from "./designDiff";
import { forgetCleanCopies, readLocalCopy, writeLocalCopy } from "./designLocal";
import { PANIC_MAX_CHARS, normalisePhrase, panicPhraseProblem, panicPhraseReady } from "./panicPhrase";
import { forUser, lastUser, ownKeys, rememberUser, setStorageUser, storageUser } from "./storageScope";

const store = new Map<string, string>();
let writes = 0;
const storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { writes += 1; store.set(key, value); },
  removeItem: (key: string) => void store.delete(key),
  get length() { return store.size; },
  key: (index: number) => [...store.keys()][index] ?? null,
};
const blocked = {
  getItem: () => { throw new Error("blocked"); },
  setItem: () => { throw new Error("blocked"); },
  removeItem: () => { throw new Error("blocked"); },
  get length(): number { throw new Error("blocked"); },
  key: () => { throw new Error("blocked"); },
};
const useStorage = (value: unknown): void => { (globalThis as { window?: unknown }).window = { localStorage: value }; };

describe("the silent panic phrase", () => {
  it("has nothing to say about an empty text, and asks for at least three words", () => {
    expect(panicPhraseProblem("")).toBeUndefined();
    expect(panicPhraseProblem("   \n\t ")).toBeUndefined();
    expect(panicPhraseReady("")).toBe(false);
    expect(panicPhraseReady("   ")).toBe(false);
    expect(panicPhraseProblem("hello")).toBe("phrase_too_short");
    expect(panicPhraseProblem("hello there")).toBe("phrase_too_short");
    expect(panicPhraseProblem("!!! ??? ...")).toBe("phrase_too_short");
    expect(panicPhraseProblem("my cat sleeps")).toBeUndefined();
    expect(panicPhraseProblem("my  cat,   sleeps!")).toBeUndefined();
    expect(panicPhraseReady("my cat sleeps")).toBe(true);
    expect(panicPhraseProblem("supercalifragilisticexpialidocious")).toBe("phrase_too_short");
  });

  it("counts a phrase in a script without spaces by its letters", () => {
    expect(panicPhraseProblem("你好")).toBe("phrase_too_short");
    expect(panicPhraseProblem("我家后院有一棵树")).toBeUndefined();
    expect(panicPhraseProblem("我家后院有一棵")).toBe("phrase_too_short");
    expect(panicPhraseProblem("今日はいい天気ですね")).toBe("phrase_is_example");
  });

  it("refuses the example sentences in any case or punctuation, and the phrases made only of commands", () => {
    expect(panicPhraseProblem("the weather is nice today")).toBe("phrase_is_example");
    expect(panicPhraseProblem("The Weather, is nice TODAY!")).toBe("phrase_is_example");
    expect(panicPhraseProblem("hace buen tiempo hoy")).toBe("phrase_is_example");
    expect(panicPhraseProblem("Hace buen tiempo, hoy.")).toBe("phrase_is_example");
    expect(panicPhraseProblem("arm the system please")).toBe("phrase_too_common");
    expect(panicPhraseProblem("Desarmar, el sistema por favor")).toBeUndefined();   // "el" is not a command word
    expect(panicPhraseProblem("desarmar sistema por favor")).toBe("phrase_too_common");
    expect(panicPhraseProblem("arm the system now")).toBeUndefined();
    expect(panicPhraseReady("the weather is nice today")).toBe(false);
  });

  it("refuses a phrase that is too long, whatever it is made of", () => {
    const longest = "ab ".repeat(PANIC_MAX_CHARS / 3).trim();
    expect(normalisePhrase(longest).length).toBeLessThanOrEqual(PANIC_MAX_CHARS);
    expect(panicPhraseProblem(longest)).toBeUndefined();
    expect(panicPhraseProblem(`${longest} ab`)).toBe("phrase_too_long");
    expect(panicPhraseProblem("x".repeat(PANIC_MAX_CHARS * 2 + 1))).toBe("phrase_too_long");
    expect(panicPhraseProblem("!".repeat(PANIC_MAX_CHARS * 2 + 1))).toBe("phrase_too_long");
    expect(panicPhraseReady("a ".repeat(500))).toBe(false);
  });

  it("brings a phrase to one form: lower case, plain width, no punctuation, single spaces", () => {
    expect(normalisePhrase("  Hello,   WORLD!! ")).toBe("hello world");
    expect(normalisePhrase("ＡＢＣ　ｄｅｆ")).toBe("abc def");
    expect(normalisePhrase("a-b_c")).toBe("a b c");
    expect(normalisePhrase("")).toBe("");
    expect(normalisePhrase("???")).toBe("");
    expect(normalisePhrase("número 42")).toBe("número 42");
    expect(normalisePhrase(normalisePhrase("  Mixed   CASE, text. "))).toBe("mixed case text");
  });
});

describe("what a browser keeps for the person who is signed in", () => {
  beforeEach(() => { store.clear(); writes = 0; useStorage(storage); });
  afterEach(() => { setStorageUser(null); delete (globalThis as { window?: unknown }).window; });

  it("accepts only a plain id for the user, and keeps nobody signed in otherwise", () => {
    setStorageUser("ab12");
    expect(storageUser()).toBe("ab12");
    for (const bad of ["", "bad id", "x/y", "a#b", "ü", "a".repeat(65), "../etc", "a:b", null]) {
      setStorageUser("ab12");
      setStorageUser(bad);
      expect(storageUser(), String(bad)).toBeNull();
    }
    setStorageUser("a".repeat(64));
    expect(storageUser()).toBe("a".repeat(64));
    setStorageUser("A_b.c-1");
    expect(storageUser()).toBe("A_b.c-1");
  });

  it("puts the user into the key, and keeps the old shared key when nobody is signed in", () => {
    expect(forUser("armor-studio-x")).toBe("armor-studio-x");
    setStorageUser("ab12");
    expect(forUser("armor-studio-x")).toBe("armor-studio-x#u:ab12");
    expect(forUser("armor-studio-x", "zz")).toBe("armor-studio-x#u:zz");
    expect(forUser("armor-studio-x", null)).toBe("armor-studio-x");
    expect(forUser("armor-studio-x", "ab12")).not.toBe(forUser("armor-studio-x", "ab13"));
  });

  it("remembers who was signed in to which server, writes only when it changed, and ignores a stored id that is not plain", () => {
    expect(lastUser("http://house:8080")).toBeNull();
    rememberUser("http://house:8080", "ab12");
    expect(lastUser("http://house:8080")).toBe("ab12");
    expect(lastUser("http://bench:8080")).toBeNull();
    const before = writes;
    rememberUser("http://house:8080", "ab12");
    expect(writes).toBe(before);
    rememberUser("http://house:8080", "cd34");
    expect(lastUser("http://house:8080")).toBe("cd34");
    store.set("armor-studio-last-user:http://house:8080", "<script>");
    expect(lastUser("http://house:8080")).toBeNull();
    store.set("armor-studio-last-user:http://house:8080", "");
    expect(lastUser("http://house:8080")).toBeNull();
  });

  it("lists only the keys of the person who is signed in", () => {
    store.set("armor-studio-a#u:ab12", "1");
    store.set("armor-studio-b#u:ab12", "1");
    store.set("armor-studio-c#u:cd34", "1");
    store.set("armor-studio-d", "1");
    store.set("other-e#u:ab12", "1");
    expect(ownKeys("armor-studio-")).toEqual([]);   // nobody is signed in: nothing is anybody's
    setStorageUser("ab12");
    expect(ownKeys("armor-studio-").sort()).toEqual(["armor-studio-a#u:ab12", "armor-studio-b#u:ab12"]);
    expect(ownKeys("nothing-")).toEqual([]);
    setStorageUser("cd34");
    expect(ownKeys("armor-studio-")).toEqual(["armor-studio-c#u:cd34"]);
    setStorageUser("ab1");   // an id that is the end of another is not that person
    expect(ownKeys("armor-studio-")).toEqual([]);
  });

  it("does nothing, and says nothing, when the storage is blocked", () => {
    useStorage(blocked);
    setStorageUser("ab12");
    expect(() => rememberUser("http://house:8080", "ab12")).not.toThrow();
    expect(lastUser("http://house:8080")).toBeNull();
    expect(ownKeys("armor-studio-")).toEqual([]);
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")).toBeNull();
    expect(() => writeLocalCopy("electrical", "http://house:8080", { baseRevision: 1, dirty: true, doc: {} })).not.toThrow();
    expect(() => forgetCleanCopies()).not.toThrow();
  });
});

describe("the copy of a drawing, when what is stored is not what was written", () => {
  beforeEach(() => { store.clear(); writes = 0; useStorage(storage); });
  afterEach(() => { setStorageUser(null); delete (globalThis as { window?: unknown }).window; });
  const key = "armor-studio-electrical-copy:http://house:8080";

  it("reads nothing from text that is not JSON, from null, or from a document that is not an object", () => {
    for (const stored of ["{bad", "null", "0", "\"x\"", "[]", "{\"doc\":[]}", "{\"doc\":null}", "{\"doc\":7}", "{}"]) {
      store.set(key, stored);
      expect(readLocalCopy("electrical", "legacy", "http://house:8080"), stored).toBeNull();
    }
  });

  it("takes a revision only if it is a number and a copy as unsent only if it says so", () => {
    store.set(key, JSON.stringify({ baseRevision: "7", dirty: "yes", doc: { a: 1 } }));
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")).toEqual({ baseRevision: null, dirty: false, doc: { a: 1 } });
    store.set(key, JSON.stringify({ baseRevision: 7, dirty: true, doc: { a: 1 } }));
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")).toEqual({ baseRevision: 7, dirty: true, doc: { a: 1 } });
  });

  it("does not use the old single key for another server, and refuses an old copy that is not an object", () => {
    store.set("legacy", "{\"elements\":[]}");
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")).toBeNull();   // the browser never said which server it was for
    store.set("armor-studio-origin", "http://house:8080");
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")).toEqual({ baseRevision: null, dirty: false, doc: { elements: [] } });
    store.set("legacy", "[1,2]");
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")).toBeNull();
    store.set("legacy", "{bad");
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")).toBeNull();
  });

  it("keeps the unsent copies of the person when signing out, drops the ones in step, and leaves alone what it cannot read", () => {
    setStorageUser("ab12");
    store.set("armor-studio-electrical-copy:http://house:8080#u:ab12", JSON.stringify({ baseRevision: 1, dirty: false, doc: {} }));
    store.set("armor-studio-network-copy:http://house:8080#u:ab12", JSON.stringify({ baseRevision: 1, dirty: true, doc: {} }));
    store.set("armor-studio-alarm-copy:http://house:8080#u:ab12", "{bad");
    store.set("armor-studio-electrical-copy:http://house:8080#u:cd34", JSON.stringify({ baseRevision: 1, dirty: false, doc: {} }));
    store.set("armor-studio-other#u:ab12", "{}");
    forgetCleanCopies();
    expect([...store.keys()].sort()).toEqual([
      "armor-studio-alarm-copy:http://house:8080#u:ab12",
      "armor-studio-electrical-copy:http://house:8080#u:cd34",
      "armor-studio-network-copy:http://house:8080#u:ab12",
      "armor-studio-other#u:ab12",
    ]);
  });

  it("keeps the copy of one person away from the next who signs in on the same browser", () => {
    setStorageUser("ab12");
    writeLocalCopy("electrical", "http://house:8080", { baseRevision: 3, dirty: true, doc: { mine: true } });
    setStorageUser("cd34");
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")).toBeNull();
    writeLocalCopy("electrical", "http://house:8080", { baseRevision: 9, dirty: false, doc: { theirs: true } });
    setStorageUser("ab12");
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")?.doc).toEqual({ mine: true });
    setStorageUser("cd34");
    expect(readLocalCopy("electrical", "legacy", "http://house:8080")?.doc).toEqual({ theirs: true });
  });
});

describe("what taking back a kept version would change", () => {
  const unit = (id: string | number, extra: Record<string, unknown> = {}) => ({ id, ...extra });

  it("tells the same design from a different one whatever the order of the keys", () => {
    expect(diffDesigns({ a: 1, b: { x: 1, y: 2 } }, { b: { y: 2, x: 1 }, a: 1 })).toEqual({ parts: [], same: true });
    expect(diffDesigns({}, {})).toEqual({ parts: [], same: true });
    expect(canonical({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe("{\"a\":[2,{\"c\":2,\"d\":1}],\"b\":1}");
    expect(canonical(undefined)).toBe("null");
    expect(canonical(null)).toBe("null");
    expect(canonical([undefined, "x"])).toBe("[null,\"x\"]");
  });

  it("lists the items that come back, the ones that go and the ones that change", () => {
    const version = { sensors: [unit("a"), unit("b", { x: 1 }), unit("c")] };
    const current = { sensors: [unit("b", { x: 2 }), unit("c"), unit("d")] };
    expect(diffDesigns(version, current)).toEqual({ parts: [{ name: "sensors", back: ["a"], gone: ["d"], changed: ["b"] }], same: false });
    expect(diffDesigns(current, version).parts[0]).toEqual({ name: "sensors", back: ["d"], gone: ["a"], changed: ["b"] });
  });

  it("counts a move as a change, reads numbers as ids and gives the parts in order of name", () => {
    const diff = diffDesigns({ nodes: [unit(1, { at: [0, 0] })], zones: [unit("z")] }, { zones: [], nodes: [unit(1, { at: [0, 5] })] });
    expect(diff.parts.map(part => part.name)).toEqual(["nodes", "zones"]);
    expect(diff.parts[0]).toEqual({ name: "nodes", back: [], gone: [], changed: ["1"] });
    expect(diff.parts[1]).toEqual({ name: "zones", back: ["z"], gone: [], changed: [] });
  });

  it("names a part whose items carry no id, or that is not a list, as a whole", () => {
    expect(diffDesigns({ notes: ["a", "b"] }, { notes: ["a", "c"] }).parts).toEqual([{ name: "notes", back: [], gone: [], changed: ["notes"] }]);
    expect(diffDesigns({ title: "one" }, { title: "two" }).parts).toEqual([{ name: "title", back: [], gone: [], changed: ["title"] }]);
    expect(diffDesigns({ list: [unit("a")] }, { list: { a: 1 } }).parts).toEqual([{ name: "list", back: [], gone: [], changed: ["list"] }]);
    expect(diffDesigns({ list: [unit("a"), 5] }, { list: [unit("a")] }).parts[0].changed).toEqual(["list"]);
  });

  it("treats a part missing on one side as an empty list", () => {
    expect(diffDesigns({ cams: [unit("a"), unit("b")] }, {}).parts).toEqual([{ name: "cams", back: ["a", "b"], gone: [], changed: [] }]);
    expect(diffDesigns({}, { cams: [unit("a")] }).parts).toEqual([{ name: "cams", back: [], gone: ["a"], changed: [] }]);
  });
});
