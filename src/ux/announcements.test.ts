import { describe, expect, it } from "vitest";
import configuration from "../ConfigurationPanel.tsx?raw";
import consolePanel from "../ConsolePanel.tsx?raw";

// A result that appears after pressing a button is only heard by a screen reader when it sits in a live region.
describe("the results of saving are announced", () => {
  it("the answer to saving the server address and ports is a status region", () => {
    expect(configuration).toMatch(/<p className="notice" role="status">\{message\}<\/p>/);
  });
  it("the answer of the root console is a status region", () => {
    expect(consolePanel).toMatch(/<p className="notice" role="status">\{message\}<\/p>/);
  });
});
