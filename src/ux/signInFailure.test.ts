import { describe, expect, it } from "vitest";
import { classifySignInFailure, signInFailureKey } from "./signInFailure";

describe("why a sign-in did not open", () => {
  it("tells a refusal, a rate limit, a server fault and an unreachable server apart", () => {
    expect(classifySignInFailure(new Error("Studio login returned 401"))).toBe("refused");
    expect(classifySignInFailure(new Error("Studio login returned 403"))).toBe("refused");
    expect(classifySignInFailure(new Error("Studio login returned 429"))).toBe("rate_limited");
    expect(classifySignInFailure(new Error("Studio login returned 500"))).toBe("server");
    expect(classifySignInFailure(new Error("Studio login returned 503"))).toBe("server");
    expect(classifySignInFailure(new TypeError("Failed to fetch"))).toBe("unreachable");
    expect(classifySignInFailure(new DOMException("The operation was aborted", "AbortError"))).toBe("unreachable");
    expect(classifySignInFailure(undefined)).toBe("unreachable");
  });

  it("has a text key for each", () => {
    expect(signInFailureKey("rate_limited")).toBe("ux_login_rate_limited");
  });
});
