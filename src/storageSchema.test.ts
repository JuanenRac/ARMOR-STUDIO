import { describe, expect, it } from "vitest";
import { CURRENT_STORAGE_SCHEMA, STEPS, STORAGE_SCHEMA_KEY, migrateStorage, type KeyValueStore } from "./storageSchema";

function memory(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value), removeItem: key => void data.delete(key), key: index => [...data.keys()][index] ?? null, get length() { return data.size; } };
}

describe("the version of the layout of what the browser keeps", () => {
  it("gives a browser that holds nothing of the console the current number and runs nothing", () => {
    const store = memory();
    expect(migrateStorage(store)).toEqual({ from: CURRENT_STORAGE_SCHEMA, to: CURRENT_STORAGE_SCHEMA, ran: [], newer: false });
    expect(store.getItem(STORAGE_SCHEMA_KEY)).toBe(String(CURRENT_STORAGE_SCHEMA));
  });

  it("takes a browser from before the layout had a number to the current one, once", () => {
    const store = memory({ "armor-studio-settings-v1": "{}", "armor-studio-last-user:http://house:8080": "ana", "armor-studio-electrical-copy:http://house:8080": "{\"doc\":{}}" });
    const result = migrateStorage(store);
    expect(result).toEqual({ from: 1, to: CURRENT_STORAGE_SCHEMA, ran: [1], newer: false });
    expect(store.getItem("armor-studio-electrical-copy:http://house:8080")).toBeNull();
    expect(store.getItem("armor-studio-electrical-copy:http://house:8080#u:ana")).toBe("{\"doc\":{}}");
    expect(store.getItem(STORAGE_SCHEMA_KEY)).toBe(String(CURRENT_STORAGE_SCHEMA));
    expect(migrateStorage(store)).toEqual({ from: CURRENT_STORAGE_SCHEMA, to: CURRENT_STORAGE_SCHEMA, ran: [], newer: false });
  });

  it("never replaces the copy a person already has with the old one, and leaves a copy alone when nobody is known to own it", () => {
    const store = memory({
      "armor-studio-last-user:http://house:8080": "ana", "armor-studio-network-copy:http://house:8080": "old", "armor-studio-network-copy:http://house:8080#u:ana": "own",
      "armor-studio-alarm-copy:http://bench:8080": "orphan",
    });
    migrateStorage(store);
    expect(store.getItem("armor-studio-network-copy:http://house:8080#u:ana")).toBe("own");
    expect(store.getItem("armor-studio-network-copy:http://house:8080")).toBeNull();
    expect(store.getItem("armor-studio-alarm-copy:http://bench:8080")).toBe("orphan");
  });

  it("leaves a browser that a newer console used exactly as it is", () => {
    const store = memory({ [STORAGE_SCHEMA_KEY]: String(CURRENT_STORAGE_SCHEMA + 3), "armor-studio-electrical-copy:http://house:8080": "x", "armor-studio-last-user:http://house:8080": "ana" });
    const before = JSON.stringify([...store.data]);
    expect(migrateStorage(store)).toEqual({ from: CURRENT_STORAGE_SCHEMA + 3, to: CURRENT_STORAGE_SCHEMA + 3, ran: [], newer: true });
    expect(JSON.stringify([...store.data])).toBe(before);
  });

  it("treats a number it cannot read as the oldest layout", () => {
    const store = memory({ [STORAGE_SCHEMA_KEY]: "banana", "armor-studio-prefs-v1": "{}" });
    expect(migrateStorage(store).from).toBe(1);
    expect(store.getItem(STORAGE_SCHEMA_KEY)).toBe(String(CURRENT_STORAGE_SCHEMA));
  });

  it("runs the steps in order, keeps the number of the last one that went through and tries the failed one again at the next start", () => {
    const order: number[] = [];
    let fail = true;
    const steps = { 1: () => void order.push(1), 2: () => { if (fail) throw new Error("full"); order.push(2); }, 3: () => void order.push(3) };
    const store = memory({ "armor-studio-prefs-v1": "{}" });
    expect(migrateStorage(store, steps, 4)).toEqual({ from: 1, to: 2, ran: [1], newer: false });
    expect(store.getItem(STORAGE_SCHEMA_KEY)).toBe("2");
    fail = false;
    expect(migrateStorage(store, steps, 4)).toEqual({ from: 2, to: 4, ran: [2, 3], newer: false });
    expect(order).toEqual([1, 2, 3]);
  });

  it("does not stop the console when the browser does not let it keep anything", () => {
    const blocked: KeyValueStore = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); }, key: () => null, length: 0 };
    expect(() => migrateStorage(blocked)).not.toThrow();
  });

  it("has a step for every number below the current one", () => {
    for (let from = 1; from < CURRENT_STORAGE_SCHEMA; from += 1) expect(typeof STEPS[from], `step ${from}`).toBe("function");
  });
});
