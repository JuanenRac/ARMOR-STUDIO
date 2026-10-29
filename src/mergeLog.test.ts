import { describe, expect, it } from "vitest";
import { mergeLog } from "./UpdatesPanel";

describe("the log of an update", () => {
  it("adds the new lines after the ones it has", () => {
    expect(mergeLog(["a", "b"], 2, ["c"])).toEqual(["a", "b", "c"]);
  });
  it("does not print a line twice when two answers to the same question arrive", () => {
    const first = mergeLog(["a", "b"], 2, ["c", "d"]);
    expect(mergeLog(first, 2, ["c", "d"])).toEqual(["a", "b", "c", "d"]);
    expect(mergeLog(first, 2, ["c", "d", "e"])).toEqual(["a", "b", "c", "d", "e"]);
  });
  it("keeps what it has when the answer brings nothing", () => {
    expect(mergeLog(["a"], 1, [])).toEqual(["a"]);
  });
});
