#!/usr/bin/env node
/**
 * Prints the completeness of the language tables (see src/i18nReport.ts): per language, the phrases it lacks, the long ones it leaves as English, and the short labels whose
 * translation is much longer than the English one. Read only: it writes nothing.
 *
 *   node tools/i18n_report.mjs                   print the table
 *   node tools/i18n_report.mjs --json            print it as JSON
 *   node tools/i18n_report.mjs --max-missing 0   exit 1 when a language lacks more phrases than that
 *   node tools/i18n_report.mjs --limits          judge the report by src/i18nReport.config.json: warnings never fail, only "failMissing" does (very permissive by default)
 *   add --github to write each warning as a workflow annotation (::warning::) for the log of the CI
 *
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { readFileSync } from "node:fs";
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
  const { reportLanguages, renderReport, readLimits, judgeReport } = await server.ssrLoadModule("/src/i18nReport.ts");
  const reports = reportLanguages(sourceCatalogues);
  console.log(args.includes("--json") ? JSON.stringify(reports, null, 2) : renderReport(reports));
  if (maxMissing !== null) failed = reports.some(item => item.missing > maxMissing);
  if (args.includes("--limits")) {
    const raw = JSON.parse(readFileSync(join(root, "src", "i18nReport.config.json"), "utf8"));
    const verdict = judgeReport(reports, readLimits(raw));
    for (const line of verdict.warnings) console.log(args.includes("--github") ? `::warning title=Language tables::${line}` : `warning: ${line}`);
    for (const line of verdict.failures) console.log(args.includes("--github") ? `::error title=Language tables::${line}` : `failure: ${line}`);
    if (verdict.failures.length > 0) failed = true;
  }
} finally { await server.close(); }
process.exit(failed ? 1 : 0);
