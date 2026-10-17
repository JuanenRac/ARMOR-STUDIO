/**
 * The shape of the detailed steps of the menu tours: a part of the page to light up (the value of a `data-tour` attribute), where the card goes, and a title and a body in the eight languages
 * of the project, in the order English, Spanish, German, French, Italian, Japanese, Chinese and Portuguese.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
export type Eight = readonly [en: string, es: string, de: string, fr: string, it: string, ja: string, zh: string, pt: string];
export type DetailStep = { target?: string; placement?: "right" | "left" | "top" | "bottom"; t: Eight; b: Eight };
/** The detailed steps of each menu, by menu: they come after the step that lights up the menu in the list. */
export type MenuSteps = Record<string, readonly DetailStep[]>;
