/**
 * The coverage check of the site plan as a card over the plan: the figures, what to look at (each with what to do about it), the safety margin, a switch for the blind spots on the plan,
 * and the report as JSON or CSV. Shown only when the design aids are on; it reads the plan and changes nothing in it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useMemo, useState } from "react";
import type { SiteModel } from "../designer/ops";
import type { Dimensions } from "../domain";
import { LIMITS, setPrefs } from "../prefs";
import { analyseCoverage, type Cell, type CoverageReport } from "./engine";
import { parseSiteTemplate, SITE_TEMPLATES, TEMPLATE_LIMITS, type SiteTemplate } from "./siteTemplates";
import { describeWarning, reportToCsv, reportToJson } from "./report";
import "./coverage.css";

const fill = (template: string, args: ReadonlyArray<string | number>): string => template.replace(/\{(\d+)\}/g, (_match, index: string) => String(args[Number(index)] ?? ""));

function save(name: string, type: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useCoverage(model: SiteModel, dimensions: Dimensions, marginPercent: number, active: boolean, extra: { floors?: boolean; threeD?: boolean; refine?: boolean } = {}): CoverageReport | null {
  const { floors = false, threeD = false, refine = false } = extra;
  return useMemo(() => active ? analyseCoverage(model, dimensions, { marginPercent, floors, threeD, refine }) : null, [active, model, dimensions, marginPercent, floors, threeD, refine]);
}

/** The squares to paint on the plan: of the floor being shown, or (all floors shown) of any floor, which is the cautious reading; whole squares unless the finer drawing is on. */
export function blindToDraw(report: CoverageReport, activeFloor: number): Cell[] {
  const seen = new Set<string>(), squares: Cell[] = [];
  for (const zone of report.zones) {
    if (zone.floor !== undefined && activeFloor >= 0 && zone.floor !== activeFloor) continue;
    for (const cell of zone.blindDraw ?? zone.blindCells) {
      const key = `${cell.x}:${cell.y}:${cell.size}`;
      if (!seen.has(key)) { seen.add(key); squares.push(cell); }
    }
  }
  return squares;
}

export function CoveragePanel({ t, report, margin, modes, showBlind, setShowBlind, onClose, onNotice, onAddTemplate }: {
  t: (key: string) => string; report: CoverageReport; margin: number; /** The way the check looks: the same choices as Preferences > Design aids, here at hand. */ modes?: { floors: boolean; threeD: boolean; refine: boolean; cones: boolean }; showBlind: boolean; setShowBlind: (next: boolean) => void; onClose: () => void; onNotice: (text: string) => void;
  /** Adds a building with its own floor plan (a template of the site plan) to the plan; the card offers the templates only when given. */
  onAddTemplate?: (template: SiteTemplate) => void;
}) {
  const [templateId, setTemplateId] = useState(SITE_TEMPLATES[0].id);
  const area = report.zones.reduce((sum, zone) => sum + zone.areaM2, 0), seen = report.zones.reduce((sum, zone) => sum + zone.coveredM2, 0);
  return <aside className="cov-panel" aria-label={t("cov_title")}>
    <header><h3>{t("cov_title")}</h3><button type="button" onClick={onClose} aria-label={t("close")} title={t("close")}>×</button></header>
    <p className="muted">{t("cov_help")}</p>
    <label className="cov-margin">{fill(t("cov_margin"), [margin])}
      <input type="range" min={LIMITS.coverageMargin[0]} max={LIMITS.coverageMargin[1]} step={1} value={margin} onChange={event => setPrefs({ coverageMargin: Number(event.target.value) })} />
      <small className="muted">{t("cov_margin_h")}</small></label>
    {modes && <fieldset className="cov-modes" data-testid="cov-modes">
      <legend>{t("cov_modes_title")}</legend>
      <label><input type="checkbox" checked={modes.floors} data-testid="cov-mode-floors" onChange={event => setPrefs({ coverageFloors: event.target.checked })} /> {t("pf_cov_floors")}</label>
      <label><input type="checkbox" checked={modes.threeD} data-testid="cov-mode-3d" onChange={event => setPrefs({ coverage3d: event.target.checked })} /> {t("pf_cov_3d")}</label>
      <label><input type="checkbox" checked={modes.refine} data-testid="cov-mode-refine" onChange={event => setPrefs({ coverageRefine: event.target.checked })} /> {t("pf_cov_refine")}</label>
      <label><input type="checkbox" checked={modes.cones} data-testid="cov-mode-cones" onChange={event => setPrefs({ coverageCones: event.target.checked })} /> {t("pf_cov_cones")}</label>
    </fieldset>}
    <label className="cov-layer"><input type="checkbox" checked={showBlind} onChange={event => setShowBlind(event.target.checked)} /> {t("cov_layer")}</label>
    {area > 0 && <p className="cov-summary">{fill(t("cov_summary"), [Math.round(seen * 10) / 10, Math.round(area * 10) / 10])}</p>}
    <ul className="cov-zones">{report.zones.map(zone => <li key={`${zone.buildingId}:${zone.floor ?? ""}`}>{fill(t("cov_zone_line"), [zone.floor === undefined ? zone.name : `${zone.name} (${fill(t("cov_floor_n"), [zone.floor + 1])})`, zone.coveredM2, zone.blindM2])}</li>)}</ul>
    {report.openings.length > 0 && <ul className="cov-openings">{report.openings.map(opening => <li key={opening.id} className={`cov-state-${opening.state}`}>{fill(t("cov_opening_state"), [t(`cov_kind_${opening.kind}`), opening.id, t(`cov_state_${opening.state}`)])}</li>)}</ul>}
    {report.notChecked.openings > 0 && <p className="muted">{fill(t("cov_not_checked"), [report.notChecked.openings])}</p>}
    {report.warnings.length === 0
      ? <p className="cov-ok">{t("cov_none")}</p>
      : <ul className="cov-warnings">{report.warnings.map((warning, index) => {
        const { message, advice } = describeWarning(warning, t);
        return <li key={`${warning.code}:${index}`} className={`cov-${warning.level}`}><strong>{t(`cov_level_${warning.level}`)}</strong> {message}{advice && <small>{advice}</small>}</li>;
      })}</ul>}
    <p className="muted cov-disclaimer">{t("cov_disclaimer")}</p>
    {onAddTemplate && <div className="cov-templates">
      <label>{t("cov_site_tpl_title")}
        <select value={templateId} onChange={event => setTemplateId(event.target.value)} aria-label={t("cov_site_tpl_pick")}>{SITE_TEMPLATES.map(item => <option key={item.id} value={item.id}>{t(item.titleKey)}</option>)}</select></label>
      <button type="button" onClick={() => onAddTemplate(SITE_TEMPLATES.find(item => item.id === templateId) ?? SITE_TEMPLATES[0])}>{t("cov_site_tpl_add")}</button>
      <label className="cov-import" title={t("cov_import_help")}>{t("cov_import")}
        <input type="file" accept="application/json,.json" data-testid="cov-import" onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          if (file.size > TEMPLATE_LIMITS.bytes) { onNotice(t("cov_import_bad_too_big")); return; }
          void file.text().then(text => {
            const read = parseSiteTemplate(text);
            if (read.ok) onAddTemplate(read.template);
            else onNotice(`${t(`cov_import_bad_${read.problem}`)}${read.where ? ` (${read.where})` : ""}`);
          }, () => onNotice(t("cov_import_bad_not_json")));
        }} /></label>
    </div>}
    <div className="cov-actions">
      <button type="button" onClick={() => { save("coverage.json", "application/json", reportToJson(report)); onNotice(t("cov_exported")); }}>{t("cov_export_json")}</button>
      <button type="button" onClick={() => { save("coverage.csv", "text/csv", reportToCsv(report)); onNotice(t("cov_exported")); }}>{t("cov_export_csv")}</button>
    </div>
  </aside>;
}
