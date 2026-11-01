import { describe, expect, it } from "vitest";
import { titleFor } from "./pageTitle";

describe("the title of the tab", () => {
  it("names the open menu before the name of the console", () => {
    expect(titleFor("A.R.M.O.R. Studio", "Alarms")).toBe("Alarms · A.R.M.O.R. Studio");
    expect(titleFor("Alarms · A.R.M.O.R. Studio", "History")).toBe("History · A.R.M.O.R. Studio");
    expect(titleFor("anything", "  ")).toBe("A.R.M.O.R. Studio");
  });

  it("keeps the count the alarm announcer blinks in front of the title", () => {
    expect(titleFor("(2) ⚠ Alarms · A.R.M.O.R. Studio", "Cameras")).toBe("(2) ⚠ Cameras · A.R.M.O.R. Studio");
  });
});
