/**
 * The rules of the silent panic phrase, as the server holds them (a phrase is checked here only to say what is wrong before asking; the server decides). The phrase is typed, sent
 * once over the account route and forgotten: this file never stores it and nothing here writes it anywhere.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export const PANIC_MIN_WORDS = 3;
export const PANIC_MIN_CHARS_UNSPACED = 8;
export const PANIC_MAX_CHARS = 120;
export type PanicProblem = "phrase_too_short" | "phrase_too_long" | "phrase_too_common" | "phrase_is_example";

/** The sentences the server refuses because everybody would pick them. */
const EXAMPLES = ["the weather is nice today", "hace buen tiempo hoy", "heute ist das wetter schon", "il fait beau aujourdhui", "oggi fa bel tempo", "今日はいい天気ですね", "今天天气很好啊今天", "hoje esta bom tempo"];
/** Words of the closed commands of the assistant: a phrase made only of them is an ordinary command. */
const COMMON = new Set(["arm", "disarm", "status", "silence", "stop", "help", "armar", "desarmar", "estado", "silenciar", "ayuda", "socorro", "alarm", "alarma", "alarme", "the", "system", "sistema", "please", "por", "favor"]);

/** Lower case, punctuation out, spaces collapsed; letters and digits of every script stay. */
export const normalisePhrase = (text: string): string => text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/gu, " ").trim();

/** What is wrong with a phrase, or undefined when the server would take it. An empty text has no problem to report yet (it is just not offered for saving). */
export function panicPhraseProblem(text: string): PanicProblem | undefined {
  if (text.trim() === "") return undefined;
  if (text.length > PANIC_MAX_CHARS * 2) return "phrase_too_long";
  const normal = normalisePhrase(text);
  if (normal.length > PANIC_MAX_CHARS) return "phrase_too_long";
  const words = normal === "" ? [] : normal.split(" ");
  const unspaced = words.length === 1 && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(normal);
  if (unspaced ? [...normal].length < PANIC_MIN_CHARS_UNSPACED : words.length < PANIC_MIN_WORDS) return "phrase_too_short";
  if (EXAMPLES.some(example => normalisePhrase(example) === normal)) return "phrase_is_example";
  if (words.every(word => COMMON.has(word))) return "phrase_too_common";
  return undefined;
}
/** Whether the text can be offered for saving. */
export const panicPhraseReady = (text: string): boolean => text.trim() !== "" && panicPhraseProblem(text) === undefined;
