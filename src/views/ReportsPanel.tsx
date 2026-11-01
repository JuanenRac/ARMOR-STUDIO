/**
 * The reports of the server in History, for administrators and operators only (the console does not even offer them to anybody else, and the server refuses them anyway): the summary of
 * a day, with its counts, its patterns and its text, and the activity heat map of a camera as a picture. Each is off until an administrator turns it on in Configuration > Security, and
 * what the server answers when it is off, not set up, busy or failing is told in words that say what to do. A report is for a person to read: it changes nothing.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useRef, useState } from "react";
import { readDailySummary, readHeatmap, readHeatmapPicture, reportRefusal, SUMMARY_LANGUAGES, type SummaryReport, type HeatmapFormat, type HeatmapMap, type SummaryLanguage } from "../api/reports";
import type { Translate } from "../components/camera";
import "./reports.css";

const today = (): string => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; };
const fill = (text: string, values: Array<string | number>): string => text.replace(/\{(\d+)\}/g, (whole, index: string) => String(values[Number(index)] ?? whole));
const LANGUAGE_NAMES: Record<SummaryLanguage, string> = { en: "English", es: "Español", de: "Deutsch", fr: "Français", it: "Italiano", ja: "日本語", zh: "中文", pt: "Português" };

type Props = { t: Translate; origin: string; language: string; cameras: Array<{ id: string; name: string }> };

export function ReportsPanel({ t, origin, language, cameras }: Props) {
  return <div className="history-card reports-panel" data-testid="reports-panel">
    <h3>{t("rep_title")}</h3>
    <p className="muted">{t("rep_help")}</p>
    <DailySummaryCard t={t} origin={origin} language={language} />
    <HeatmapCard t={t} origin={origin} cameras={cameras} />
  </div>;
}

function DailySummaryCard({ t, origin, language }: { t: Translate; origin: string; language: string }) {
  const [date, setDate] = useState(today());
  const [lang, setLang] = useState<SummaryLanguage>((SUMMARY_LANGUAGES as readonly string[]).includes(language) ? language as SummaryLanguage : "en");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [refusal, setRefusal] = useState("");
  const show = async () => {
    setBusy(true); setRefusal(""); setReport(null);
    try { setReport(await readDailySummary(origin, date, lang)); }
    catch (error) { setRefusal(reportRefusal(error)); }
    finally { setBusy(false); }
  };
  const totals = report?.summary.totals;
  return <section className="rep-card" data-testid="rep-summary">
    <h4>{t("rep_summary_title")}</h4>
    <div className="rep-form">
      <label>{t("rep_date")}<input type="date" value={date} max={today()} data-testid="rep-date" onChange={event => setDate(event.target.value)} /></label>
      <label>{t("rep_language")}<select value={lang} data-testid="rep-language" onChange={event => setLang(event.target.value as SummaryLanguage)}>{SUMMARY_LANGUAGES.map(code => <option key={code} value={code}>{LANGUAGE_NAMES[code]}</option>)}</select></label>
      <button type="button" className="primary" disabled={busy || !date} data-testid="rep-summary-show" onClick={() => void show()}>{busy ? t("loading") : t("rep_show")}</button>
    </div>
    {refusal && <p className="notice bad" role="alert" data-testid="rep-summary-refusal">{t(refusal)}</p>}
    {report && totals && <div data-testid="rep-summary-result">
      <dl className="rep-totals">
        <div><dt>{t("rep_events")}</dt><dd>{totals.events}</dd></div>
        <div><dt>{t("rep_alarms")}</dt><dd>{totals.alarms}</dd></div>
        <div><dt>{t("rep_serious")}</dt><dd>{totals.serious_alarms}</dd></div>
        <div><dt>{t("rep_false")}</dt><dd>{totals.false_alarms}</dd></div>
      </dl>
      <pre className="rep-text" data-testid="rep-summary-text">{report.text}</pre>
      {report.findings.length > 0 && <>
        <h5>{t("rep_patterns")}</h5>
        <ul className="rep-findings">{report.findings.map((finding, index) => <li key={`${finding.kind}:${index}`}>
          <strong>{t(`rep_kind_${finding.kind}`)}</strong> - {Object.values(finding.subject).join(" / ") || "-"} ({fill(t("rep_times"), [finding.count])})
        </li>)}</ul></>}
      {report.ai_note && <p className="muted" data-testid="rep-ai-note"><strong>{t("rep_ai_note")}</strong> {report.ai_note}</p>}
      <p className="muted small">{t("rep_summary_note")}</p>
    </div>}
  </section>;
}

function HeatmapCard({ t, origin, cameras }: { t: Translate; origin: string; cameras: Array<{ id: string; name: string }> }) {
  const [camera, setCamera] = useState("");
  const [scale, setScale] = useState(8);
  const [format, setFormat] = useState<Exclude<HeatmapFormat, "json">>("png");
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState("");
  const [picture, setPicture] = useState<{ url: string; map: HeatmapMap } | null>(null);
  const current = useRef<string | null>(null);
  const release = () => { if (current.current) { URL.revokeObjectURL(current.current); current.current = null; } };
  useEffect(() => release, []);
  const show = async () => {
    setBusy(true); setRefusal(""); release(); setPicture(null);
    try {
      const [map, blob] = await Promise.all([readHeatmap(origin, camera || undefined, scale), readHeatmapPicture(origin, camera || undefined, format, scale)]);
      current.current = URL.createObjectURL(blob);
      setPicture({ url: current.current, map });
    } catch (error) { setRefusal(reportRefusal(error)); }
    finally { setBusy(false); }
  };
  return <section className="rep-card" data-testid="rep-heatmap">
    <h4>{t("rep_heatmap_title")}</h4>
    <p className="muted small">{t("rep_heatmap_help")}</p>
    <div className="rep-form">
      <label>{t("rep_camera")}<select value={camera} data-testid="rep-camera" onChange={event => setCamera(event.target.value)}>
        <option value="">{t("rep_camera_any")}</option>{cameras.map(item => <option key={item.id} value={item.id}>{item.name || item.id}</option>)}</select></label>
      <label>{t("rep_scale")}<select value={scale} data-testid="rep-scale" onChange={event => setScale(Number(event.target.value))}>{[4, 8, 16, 32].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>{t("rep_format")}<select value={format} data-testid="rep-format" onChange={event => setFormat(event.target.value === "svg" ? "svg" : "png")}><option value="png">PNG</option><option value="svg">SVG</option></select></label>
      <button type="button" className="primary" disabled={busy} data-testid="rep-heatmap-show" onClick={() => void show()}>{busy ? t("loading") : t("rep_show")}</button>
    </div>
    {refusal && <p className="notice bad" role="alert" data-testid="rep-heatmap-refusal">{t(refusal)}</p>}
    {picture && <figure data-testid="rep-heatmap-result">
      <img src={picture.url} alt={fill(t("rep_heatmap_alt"), [picture.map.camera_id])} className="rep-heatmap" />
      <figcaption className="muted small">{fill(t("rep_heatmap_caption"), [picture.map.camera_id, picture.map.accepted_positions, picture.map.cols, picture.map.rows])} <a href={picture.url} download={`heatmap-${picture.map.camera_id}.${format}`}>{t("rep_download")}</a></figcaption>
    </figure>}
  </section>;
}
