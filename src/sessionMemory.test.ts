import { describe, expect, it, vi } from "vitest";
import { clearSessionMemory, onSessionCleared } from "./sessionMemory";

describe("what a menu keeps in memory for the person who is signed in", () => {
  it("is forgotten when the session ends, and a memory that fails does not keep the others", () => {
    const first = vi.fn(), second = vi.fn(() => { throw new Error("broken"); }), third = vi.fn();
    onSessionCleared(first); onSessionCleared(second); onSessionCleared(third);
    expect(() => clearSessionMemory()).not.toThrow();
    expect([first, second, third].map(fn => fn.mock.calls.length)).toEqual([1, 1, 1]);
    clearSessionMemory();
    expect([first, third].map(fn => fn.mock.calls.length)).toEqual([2, 2]);
  });

  it("registering the same memory twice forgets it once", () => {
    const forget = vi.fn();
    onSessionCleared(forget); onSessionCleared(forget);
    clearSessionMemory();
    expect(forget).toHaveBeenCalledTimes(1);
  });
});
