import { describe, expect, it } from "vitest";
import { contractState } from "./contractNote";

describe("contractState", () => {
  it("says the same for the same version, and treats a missing fourth number as zero", () => {
    expect(contractState("0.8.0.7", "0.8.0.7")).toBe("same");
    expect(contractState("0.8.0", "0.8.0.0")).toBe("same");
    expect(contractState("0.8.0.0", "0.8.0")).toBe("same");
  });

  it("says different when the numbers differ", () => {
    expect(contractState("0.8.0.6", "0.8.0.7")).toBe("different");
    expect(contractState("0.7.9", "0.8.0.0")).toBe("different");
  });

  it("warns about nothing it does not know", () => {
    for (const bad of [undefined, null, "", "0.8", "v0.8.0.7", "0.8.0.7\n", "latest"]) {
      expect(contractState(bad, "0.8.0.7")).toBe("unknown");
      expect(contractState("0.8.0.7", bad)).toBe("unknown");
    }
  });
});
