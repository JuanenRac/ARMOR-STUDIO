import { describe, expect, it } from "vitest";
import { errorText } from "./apiErrorText";
import { ApiError } from "./api/transport";
import { text } from "./i18n";

const LANGUAGES = ["en", "es", "de", "fr", "it", "ja", "zh", "pt"] as const;

describe("the words for what the server refused", () => {
  const catalogue: Record<string, string> = { "x_err_bad": "bad one", "x_err_too_large": "too big", "x_err_generic": "generic" };
  const t = (key: string) => catalogue[key] ?? key;

  it("finds the text of the code the server gave", () => {
    expect(errorText(t, new ApiError(400, "bad"), "x_err_")).toBe("bad one");
  });
  it("says the generic text for a code the screen has no words for, and for what is not an answer of the server", () => {
    expect(errorText(t, new ApiError(400, "unheard_of"), "x_err_")).toBe("generic");
    expect(errorText(t, new Error("network"), "x_err_")).toBe("generic");
    expect(errorText(t, "text", "x_err_")).toBe("generic");
  });
  it("tells a body that was too large for the server when the screen has the words, whatever code came with it", () => {
    expect(errorText(t, new ApiError(413, "entity_too_large"), "x_err_")).toBe("too big");
    expect(errorText(t, new ApiError(413, "bad"), "x_err_")).toBe("bad one");
    expect(errorText((key: string) => (key === "y_err_generic" ? "generic" : key), new ApiError(413, "x"), "y_err_")).toBe("generic");
  });
  it("has the words for an installation file that is too large in every language", () => {
    for (const language of LANGUAGES) {
      const t2 = (key: string) => text(language, key);
      const said = errorText(t2, new ApiError(413, "entity_too_large"), "in_err_");
      expect(said, language).not.toBe(text(language, "in_err_generic"));
      expect(said, language).toMatch(/9/);
    }
  });
  it("falls back to the words for the kind of answer when the screen has none for the code", () => {
    const words: Record<string, string> = { "z_err_generic": "generic", "z_err_status_429": "slow down", "z_err_status_5xx": "server failed", "z_err_status_404": "gone", "z_err_unreachable": "no answer" };
    const say = (key: string) => words[key] ?? key;
    expect(errorText(say, new ApiError(429, "x"), "z_err_")).toBe("slow down");
    expect(errorText(say, new ApiError(503, "x"), "z_err_")).toBe("server failed");
    expect(errorText(say, new ApiError(404, "x"), "z_err_")).toBe("gone");
    expect(errorText(say, new ApiError(409, "x"), "z_err_")).toBe("generic");
    expect(errorText(say, new TypeError("Failed to fetch"), "z_err_")).toBe("no answer");
    expect(errorText(say, new Error("other"), "z_err_")).toBe("generic");
  });
  it("tells every kind of refusal of the camera forms and the connection settings in every language", () => {
    const answers: ApiError[] = [new ApiError(403, "forbidden"), new ApiError(400, "x"), new ApiError(404, "x"), new ApiError(429, "x"), new ApiError(500, "x"), new ApiError(502, "x"), new ApiError(409, "x")];
    for (const language of LANGUAGES) {
      const t2 = (key: string) => text(language, key);
      const said = [...answers, new TypeError("Failed to fetch")].map(error => errorText(t2, error, "srv_err_"));
      for (const line of said) expect(line, language).not.toMatch(/^srv_err_/);
      expect(new Set(said).size, language).toBeGreaterThanOrEqual(7);
    }
  });
});
