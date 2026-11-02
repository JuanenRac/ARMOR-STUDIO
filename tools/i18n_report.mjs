#!/usr/bin/env node
/**
 * Prints the completeness of the language tables (see src/i18nReport.ts): per language, the phrases it lacks, the long ones it leaves as English, and the short labels whose
 * translation is much longer than the English one. Read only: it writes nothing.
 *
 *   node tools/i18n_report.mjs                   print the table
 *   node tools/i18n_report.mjs --json            print it as JSON
 *   node tools/i18n_report.mjs --max-missing 0   exit 1 when a language lacks more phrases than that
 *
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const maxIndex = args.indexOf("--max-missing");
const maxMissing = maxIndex >= 0 ? Number(args[maxIndex + 1]) : null;
if (maxMissing !== null && (!Number.isInteger(maxMissing) || maxMissing < 0)) { console.error("--max-missing needs a whole number"); process.exit(2); }

const server = await createServer({ root, appType: "custom", logLevel: "error", server: { middlewareMode: true, hmr: false, ws: false } });
let failed = false;
try {
  const { sourceCatalogues } = await server.ssrLoadModule("/src/i18nSources.ts");
  const { reportLanguages, renderReport } = await server.ssrLoadModule("/src/i18nReport.ts");
  const reports = reportLanguages(sourceCatalogues);
  console.log(args.includes("--json") ? JSON.stringify(reports, null, 2) : renderReport(reports));
  if (maxMissing !== null) failed = reports.some(item => item.missing > maxMissing);
} finally { await server.close(); }
process.exit(failed ? 1 : 0);
