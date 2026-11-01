import { describe, expect, it } from "vitest";
import { effectiveMinimum, issueMessage, passwordIssues, pinIssues } from "./credentialRules";

describe("the rules of a new password", () => {
  it("says nothing about an empty field and takes the minimum the server announced, never below the floor", () => {
    expect(passwordIssues("", { minimum: 12 })).toEqual([]);
    expect(passwordIssues("short", { minimum: 12 })).toEqual(["pw_short"]);
    expect(passwordIssues("a-long-password-1", { minimum: 12 })).toEqual([]);
    expect(effectiveMinimum(12)).toBe(12);
    expect(effectiveMinimum(3)).toBe(8);
    expect(effectiveMinimum(undefined)).toBe(12);
    expect(effectiveMinimum(Number.NaN)).toBe(12);
  });

  it("refuses the user name as the password, whatever the case, and a repeat that differs", () => {
    expect(passwordIssues("Night-Guard-01", { minimum: 12, username: " night-guard-01 " })).toEqual(["pw_is_name"]);
    expect(passwordIssues("a-long-password-1", { minimum: 12, repeat: "a-long-password-2" })).toEqual(["pw_mismatch"]);
    expect(passwordIssues("a-long-password-1", { minimum: 12, repeat: "a-long-password-1" })).toEqual([]);
    expect(passwordIssues("x", { minimum: 12, username: "x", repeat: "y" })).toEqual(["pw_short", "pw_is_name", "pw_mismatch"]);
  });
});

describe("the rules of a new PIN", () => {
  it("needs the digits, not more than the limit, and a duress PIN different from the PIN", () => {
    expect(pinIssues("")).toEqual([]);
    expect(pinIssues("123")).toEqual(["pin_short"]);
    expect(pinIssues("1234")).toEqual([]);
    expect(pinIssues("12345678901")).toEqual(["pin_long"]);
    expect(pinIssues("1234", "1234")).toEqual(["pin_same"]);
    expect(pinIssues("1234", "4321")).toEqual([]);
  });

  it("writes the sentence with the limit that applies", () => {
    const phrases: Record<string, string> = { ux_pw_short: "at least {0} characters", ux_pin_short: "{0} digits", ux_pin_long: "at most {0}", ux_pw_mismatch: "no match" };
    const t = (key: string) => phrases[key] ?? key;
    expect(issueMessage(t, "pw_short", 14)).toBe("at least 14 characters");
    expect(issueMessage(t, "pin_short")).toBe("4 digits");
    expect(issueMessage(t, "pin_long")).toBe("at most 10");
    expect(issueMessage(t, "pw_mismatch")).toBe("no match");
  });
});
