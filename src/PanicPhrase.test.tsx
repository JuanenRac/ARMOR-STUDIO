import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PanicPhraseCard } from "./PanicPhraseCard";
import { normalisePhrase, panicPhraseProblem, panicPhraseReady } from "./panicPhrase";
import { setMyPanicPhrase } from "./api";
import { VOICE_LIMITS, voiceLimitValue, isLowering } from "./SecurityPanel";
import { locales, text } from "./i18n";

describe("the silent panic phrase", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("holds a phrase to the rules of the server before it asks: three words, eight characters in Japanese or Chinese, not an example, not an ordinary command", () => {
    expect(panicPhraseProblem("")).toBeUndefined();
    expect(panicPhraseReady("")).toBe(false);
    expect(panicPhraseProblem("two words")).toBe("phrase_too_short");
    expect(panicPhraseProblem("  ¡¡ blue !! ")).toBe("phrase_too_short");
    expect(panicPhraseProblem("the green door opens")).toBeUndefined();
    expect(panicPhraseProblem("El Café   Está Cerrado")).toBeUndefined();
    expect(panicPhraseProblem("あいうえお")).toBe("phrase_too_short");
    expect(panicPhraseProblem("あいうえおかきく")).toBeUndefined();
    expect(panicPhraseProblem("今天天气")).toBe("phrase_too_short");
    expect(panicPhraseProblem("The weather is nice today!")).toBe("phrase_is_example");
    expect(panicPhraseProblem("今日はいい天気ですね")).toBe("phrase_is_example");
    expect(panicPhraseProblem("please stop the system")).toBe("phrase_too_common");
    expect(panicPhraseProblem("word ".repeat(30))).toBe("phrase_too_long");
    expect(panicPhraseReady("the green door opens")).toBe(true);
    expect(normalisePhrase("  Ｈello,   WORLD! ")).toBe("hello world");
  });

  it("sends the phrase once to the account route with the password, or asks to clear it, and the answer never carries a phrase back", async () => {
    const seen: Array<{ url: string; method: string; body: unknown }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
      seen.push({ url, method: init.method ?? "GET", body: JSON.parse(init.body as string) });
      return new Response(JSON.stringify({ id: "u", username: "x", role: "viewer", hasPanicPhrase: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }));
    await setMyPanicPhrase("http://armor.local:8080", { currentPassword: "pw", phrase: "the green door opens" });
    await setMyPanicPhrase("http://armor.local:8080", { currentPassword: "pw", clear: true });
    expect(seen.map(call => [call.method, new URL(call.url).pathname])).toEqual([["PUT", "/api/v1/account/panic-phrase"], ["PUT", "/api/v1/account/panic-phrase"]]);
    expect(seen[0]!.body).toEqual({ currentPassword: "pw", phrase: "the green door opens" });
    expect(seen[1]!.body).toEqual({ currentPassword: "pw", clear: true });
  });

  it("draws the card with a hidden phrase field and both actions disabled until the password and a valid phrase are there", () => {
    const html = renderToStaticMarkup(createElement(PanicPhraseCard, { t: key => text("en", key), origin: "http://127.0.0.1:8080" }));
    expect(html).toContain('data-testid="security-panic-phrase"');
    expect(html).toContain("Silent panic phrase");
    expect(html).toContain('type="password"');
    expect(html).toMatch(/<button class="primary" disabled="">Set the phrase<\/button>/);
    expect(html).toMatch(/<button type="button" disabled="">Remove my phrase<\/button>/);
    expect(html).not.toMatch(/value="[^"]+"/);   // nothing is ever pre-filled
    expect(html).not.toContain('role="alert"');   // no complaint before anything is typed
  });

  it("has the cooldown range of the server and treats turning the option off as lowering the safety", () => {
    expect(VOICE_LIMITS["voice.panic_cooldown_s"]).toMatchObject({ min: 10, max: 3600 });
    expect(voiceLimitValue("voice.panic_cooldown_s", "60")).toBe(60);
    expect(voiceLimitValue("voice.panic_cooldown_s", "10")).toBe(10);
    expect(voiceLimitValue("voice.panic_cooldown_s", "3600")).toBe(3600);
    for (const bad of ["9", "3601", "", "abc", "1.5"]) expect(voiceLimitValue("voice.panic_cooldown_s", bad), bad).toBeUndefined();
    expect(isLowering([true, false], true, false)).toBe(true);
    expect(isLowering([true, false], false, true)).toBe(false);
  });

  it("has every phrase of the card, the option and its quiet time in all eight languages, Portuguese from Portugal", () => {
    const ids = ["pp_title", "pp_help", "pp_rules", "pp_password", "pp_phrase", "pp_save", "pp_clear", "pp_clear_confirm", "pp_saved", "pp_cleared", "pp_state_set", "pp_state_none",
      "pp_err_phrase_too_short", "pp_err_phrase_too_long", "pp_err_phrase_too_common", "pp_err_phrase_is_example", "pp_err_invalid_phrase", "pp_err_wrong_password", "pp_err_status_429",
      "pp_err_unreachable", "pp_err_generic", "sec_opt_panic", "sec_opt_panic_help", "sec_opt_panic_warn", "sec_voice_panic"];
    expect(locales.length).toBe(8);
    for (const locale of locales) for (const id of ids) {
      const words = text(locale, id);
      expect(words.trim().length, `${locale} ${id}`).toBeGreaterThan(2);
      expect(words, `${locale} ${id} is not the key`).not.toBe(id);
    }
    expect(text("pt", "pp_password")).toContain("palavra-passe");
    expect(text("pt", "pp_rules")).toContain("carateres");
  });
});
