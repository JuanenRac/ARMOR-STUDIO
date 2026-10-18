/**
 * The Help window of Studio: one section for every menu, in seven languages (the eighth, Portuguese, is in ptCatalogue.ts), built the same way as the node panels' help (a list of
 * sections on the left, the chosen one on the right). Every section is [en, es, de, fr, it, ja, zh] for its title and for its body; a blank
 * line in a body starts a new paragraph.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D)
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import type { Locale } from "./i18n";
import { HELP_PT_A } from "./helpPtA";
import { HELP_PT_B } from "./helpPtB";
import { sections_1 } from "./help/sections1";
import { sections_2 } from "./help/sections2";
import { sections_3 } from "./help/sections3";

type Seven = readonly [string, string, string, string, string, string, string];
export type HelpSection = { id: string; title: Seven; body: Seven };
const order: readonly Locale[] = ["en", "es", "de", "fr", "it", "ja", "zh"];

export const HELP_SECTIONS: readonly HelpSection[] = [...sections_1, ...sections_2, ...sections_3];

const sectionCatalogue = (index: number): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const section of HELP_SECTIONS) { out[`help_s_${section.id}`] = section.title[index]; out[`help_b_${section.id}`] = section.body[index]; }
  return out;
};

const UI: Record<string, Seven> = {
  helpButton: ["Help", "Ayuda", "Hilfe", "Aide", "Guida", "ヘルプ", "帮助"],
  helpTitle: ["Studio help", "Ayuda de Studio", "Studio-Hilfe", "Aide de Studio", "Guida di Studio", "Studio ヘルプ", "Studio 帮助"],
  helpIntro: ["A guide to every menu of the console.", "Una guía de cada menú de la consola.", "Ein Leitfaden zu jedem Menü der Konsole.", "Un guide de chaque menu de la console.", "Una guida a ogni menu della console.", "コンソールの各メニューのガイド。", "控制台各菜单的使用指南。"],
  helpSections: ["Help sections", "Secciones de la ayuda", "Hilfeabschnitte", "Sections de l'aide", "Sezioni della guida", "ヘルプの項目", "帮助章节"],
};

/** The catalogue of one language: the sections and the few labels of the window. */
export const helpCatalogue = (locale: Locale): Record<string, string> => {
  const index = order.indexOf(locale);
  const out = sectionCatalogue(index);
  for (const [key, value] of Object.entries(UI)) out[key] = value[index];
  return out;
};

/** The Help in Portuguese, one entry per menu: [title, body]. */
export const HELP_PT: Record<string, readonly [string, string]> = { ...HELP_PT_A, ...HELP_PT_B };

/** The sections of the Help in Portuguese, as catalogue entries (the labels of the window come from the Portuguese catalogue). */
export const ptHelpCatalogue = (): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [id, [title, body]] of Object.entries(HELP_PT)) { out[`help_s_${id}`] = title; out[`help_b_${id}`] = body; }
  return out;
};
