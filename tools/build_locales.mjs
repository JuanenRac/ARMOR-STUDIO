#!/usr/bin/env node
/**
 * Writes the language tables the console loads.
 *
 * The phrases are written once, one row per phrase in every language, in the files named *Text.ts (and in src/i18nSources.ts, which merges them). Reading them all in the console
 * would put every language in the first page that is downloaded, so this tool reads them once and writes one file per language, src/locales/<language>.ts, plus
 * src/locales/keys.ts with what does not depend on the language (the list of the Help sections, the hover-hint keys, where each step of a menu tour points). The console loads English
 * with the page and every other language the first time it is chosen.
 *
 *   node tools/build_locales.mjs           write the files
 *   node tools/build_locales.mjs --check   change nothing; exit 1 when a file is not what the sources say
 *
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src", "locales");
const check = process.argv.includes("--check");
const HEADER = "// Written by tools/build_locales.mjs from the tables of phrases; do not edit by hand (run `npm run locales`).\n";

const server = await createServer({ root, appType: "custom", logLevel: "error", server: { middlewareMode: true, hmr: false, ws: false } });
let failed = false;
try {
  const { sourceCatalogues, HINT_PREFIX } = await server.ssrLoadModule("/src/i18nSources.ts");
  const { HELP_SECTIONS } = await server.ssrLoadModule("/src/helpText.ts");
  const { MENU_STEPS } = await server.ssrLoadModule("/src/tour/menuToursText.ts");
  const { hintCatalogue } = await server.ssrLoadModule("/src/hintText.ts");

  const files = new Map();
  const english = sourceCatalogues.en;
  for (const [code, catalogue] of Object.entries(sourceCatalogues)) {
    const lines = [];
    for (const [key, value] of Object.entries(catalogue)) {
      // A phrase a language writes as English does is left out: the console falls back to English for a phrase a language does not have.
      if (code !== "en" && english[key] === value) continue;
      lines.push(`${JSON.stringify(key)}: ${JSON.stringify(value)},`);
    }
    files.set(`${code}.ts`, `${HEADER}const catalogue: Record<string, string> = {\n${lines.join("\n")}\n};\nexport default catalogue;\n`);
  }

  const layout = {};
  for (const [view, steps] of Object.entries(MENU_STEPS)) layout[view] = steps.map(step => ({ ...(step.target ? { target: step.target } : {}), ...(step.placement ? { placement: step.placement } : {}) }));
  const keys = [
    HEADER,
    "/** The sections of the Help, in order. */",
    `export const HELP_SECTION_IDS: readonly string[] = ${JSON.stringify(HELP_SECTIONS.map(section => section.id))};`,
    "",
    "/** The keys of the hover hints (the text of each is the phrase of the same key under HINT_PREFIX in the language tables). */",
    `export const HINT_PREFIX = ${JSON.stringify(HINT_PREFIX)};`,
    `export const HINT_KEYS: readonly string[] = ${JSON.stringify(Object.keys(hintCatalogue))};`,
    "",
    "/** Where each detailed step of a menu tour points, by menu: the part of the page it lights up and the side its card goes. */",
    'export type StepLayout = { target?: string; placement?: "right" | "left" | "top" | "bottom" };',
    `export const MENU_STEP_LAYOUT: Readonly<Record<string, readonly StepLayout[]>> = ${JSON.stringify(layout, null, 1)};`,
    "",
  ].join("\n");
  files.set("keys.ts", keys);

  const norm = text => text.replace(/\r\n/g, "\n");
  if (check) {
    const stale = [];
    for (const [name, content] of files) {
      const path = join(outDir, name);
      if (!existsSync(path) || norm(readFileSync(path, "utf8")) !== content) stale.push(name);
    }
    if (existsSync(outDir)) for (const name of readdirSync(outDir)) if (!files.has(name)) stale.push(`${name} (no source writes it)`);
    if (stale.length) { console.error(`src/locales is not what the sources say: ${stale.join(", ")}\nRun: npm run locales`); failed = true; }
    else console.log(`src/locales matches the sources (${files.size} files)`);
  } else {
    mkdirSync(outDir, { recursive: true });
    for (const name of readdirSync(outDir)) if (!files.has(name)) rmSync(join(outDir, name));
    for (const [name, content] of files) {
      const path = join(outDir, name);
      if (existsSync(path) && norm(readFileSync(path, "utf8")) === content) continue;
      writeFileSync(path, content);
      console.log(`wrote src/locales/${name} (${content.length} characters)`);
    }
  }
} finally {
  await server.close();
}
process.exit(failed ? 1 : 0);
