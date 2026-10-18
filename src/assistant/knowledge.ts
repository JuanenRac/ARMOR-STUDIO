/**
 * What the assistant knows how to answer when it is asked in words: one entry per task a person asks for, with the words that say it (`kw`, in every language, separated by "|": a word
 * matches the start of a word of the question, a Japanese or Chinese term matches anywhere), a sample question (`q`, shown as a suggestion and used by the tests) and a short answer with
 * the steps (`a`). Every list is in the order English, Spanish, German, French, Italian, Japanese, Chinese, Portuguese. The Help text of every menu is searched as well (engine.ts), so
 * what is not here is still answered from the Help.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { View } from "../domain";
import { topics_1 } from "./topics/topics1";
import { topics_2 } from "./topics/topics2";
import { topics_3 } from "./topics/topics3";
import { topics_4 } from "./topics/topics4";

export type Eight = readonly [string, string, string, string, string, string, string, string];
export type Topic = { id: string; view: View; tour?: boolean; kw: Eight; q: Eight; a: Eight };

export const TOPICS: readonly Topic[] = [...topics_1, ...topics_2, ...topics_3, ...topics_4];
