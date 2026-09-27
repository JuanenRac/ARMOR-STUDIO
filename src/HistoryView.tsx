/**
 * Event history and alert rules: what changed and when, and the two rules an
 * operator can tune (how long a condition must last, and zones to ignore).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { ViewTabs } from "./components/ViewTabs";
import { useCallback, useEffect, useRef, useState } from "react";
import { deleteHistory, listHistory, readHistorySummary, readRules, saveRules, type ArmorEvent, type EventType, type HistorySummary, type Rules, type Zone } from "./api";
import { DEFAULT_FILTERS, DEFAULT_ZONE_VIEW, describeEvent, emptyZoneDraft, eventsToCsv, historyQuery, pixelToMm, rectFromDrag, zoneFromDraft, type HistoryFilters, type ZoneDraft } from "./history";
import "./history.css";
import { MenuTitle } from "./menuLogos";

type Translate = (key: string) => string;

/** Save text as a file through the browser; nothing is uploaded anywhere. */
function downloadText(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const FILTERS: Array<EventType | "all"> = ["all", "alarm", "alert", "device", "node", "camera", "mode"];

type Notice = { kind: "info" | "error"; text: string } | null;
const PAGE = 100;
const RANGES: Array<HistoryFilters["range"]> = ["24h", "7d", "30d", "all", "custom"];
type PendingDelete = { kind: "all" } | { kind: "older-than"; days: number };

function SummaryStrip({ summary, t }: { summary: HistorySummary | null; t: Translate }) {
  const card = (label: string, value: number | string, tone = "") => <article className={`history-stat ${tone}`}><span>{label}</span><strong>{value}</strong></article>;
  const day = summary?.last_24h;
  return <section className="history-stats" aria-label={t("historySummary")}>
    {card(t("statTotal"), summary?.total ?? "-")}
    {card(t("stat24h"), day?.events ?? "-")}
    {card(t("statHigh"), day?.high_alerts ?? "-", day && day.high_alerts > 0 ? "danger" : "")}
    {card(t("statNodes"), day?.node_incidents ?? "-", day && day.node_incidents > 0 ? "warn" : "")}
    {card(t("statCameras"), day?.camera_incidents ?? "-", day && day.camera_incidents > 0 ? "warn" : "")}
    <article className="history-stat span"><span>{t("statSpan")}</span><strong>{summary?.oldest_at ? `${new Date(summary.oldest_at).toLocaleDateString()} → ${new Date(summary.newest_at ?? summary.oldest_at).toLocaleDateString()}` : "-"}</strong></article>
  </section>;
}

function EventPanel({ origin, t }: { origin: string; t: Translate }) {
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_FILTERS);
  const [events, setEvents] = useState<ArmorEvent[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [live, setLive] = useState(true);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(filters.q);

  // The search box waits for a pause in typing before it asks the server.
  useEffect(() => { const id = window.setTimeout(() => setFilters(current => current.q === query ? current : { ...current, q: query }), 350); return () => window.clearTimeout(id); }, [query]);

  const refresh = useCallback(async () => {
    try {
      const [page, stats] = await Promise.all([listHistory(origin, { ...historyQuery(filters), limit: PAGE }), readHistorySummary(origin)]);
      setEvents(page.events); setNext(page.events.length >= PAGE ? page.next_before : null); setSummary(stats); setError(false);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [origin, filters]);
  useEffect(() => { setLoading(true); void refresh(); }, [refresh]);
  // Live refresh keeps the newest events flowing in; it is paused while a page beyond the first is open or a deletion awaits.
  useEffect(() => {
    if (!live || pending) return;
    const timer = window.setInterval(() => { if (next === null || events.length <= PAGE) void refresh(); }, 5_000);
    return () => window.clearInterval(timer);
  }, [live, pending, refresh, next, events.length]);

  const more = async () => {
    if (next === null) return;
    try {
      const page = await listHistory(origin, { ...historyQuery(filters), limit: PAGE, before: next });
      setEvents(current => [...current, ...page.events]); setNext(page.events.length >= PAGE ? page.next_before : null);
    } catch { setError(true); }
  };

  const set = (patch: Partial<HistoryFilters>) => setFilters(current => ({ ...current, ...patch }));
  const anyFilter = filters.type !== "all" || filters.q !== "" || filters.range !== "all" || filters.level !== "any";

  /** Every event that matches the current filters, page by page (at most 5000), for the export. */
  const collect = async (): Promise<ArmorEvent[]> => {
    const all: ArmorEvent[] = [];
    let before: number | undefined;
    while (all.length < 5000) {
      const page = await listHistory(origin, { ...historyQuery(filters), limit: 200, before });
      all.push(...page.events);
      if (page.events.length < 200 || page.next_before === null) break;
      before = page.next_before;
    }
    return all;
  };
  const exportAs = async (format: "csv" | "json") => {
    setBusy(true);
    try {
      const all = await collect();
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      if (format === "csv") downloadText(`armor-history-${stamp}.csv`, eventsToCsv(all), "text/csv;charset=utf-8");
      else downloadText(`armor-history-${stamp}.json`, JSON.stringify(all, null, 2), "application/json");
      setNotice({ kind: "info", text: `${t("exported")} ${all.length}` });
    } catch { setNotice({ kind: "error", text: t("exportFailed") }); }
    finally { setBusy(false); }
  };
  const confirmDelete = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const result = await deleteHistory(origin, pending, filters.type !== "all" && filters.level === "any" ? filters.type : undefined);
      setNotice({ kind: "info", text: `${t("deleted")} ${result.deleted}` });
      setPending(null); setOpenId(null);
      await refresh();
    } catch { setNotice({ kind: "error", text: t("deleteFailed") }); }
    finally { setBusy(false); }
  };
  const scopeText = (choice: PendingDelete): string => choice.kind === "all" ? t("deleteAllScope") : `${t("deleteOlderScope")} ${choice.days} ${t("daysUnit")}`;

  return <div className="history-card history-events">
    <header className="history-head">
      <MenuTitle kind="history"><p className="eyebrow">EVENT LOG</p><h2>{t("history")}</h2><p className="muted">{t("historyHelp")}</p></MenuTitle>
      <div className="history-actions">
        <button className={live ? "active" : ""} aria-pressed={live} onClick={() => setLive(value => !value)} title={t("liveHelp")}>{live ? t("liveOn") : t("livePaused")}</button>
        <button disabled={busy || events.length === 0} onClick={() => void exportAs("csv")}>CSV</button>
        <button disabled={busy || events.length === 0} onClick={() => void exportAs("json")}>JSON</button>
        <span className="history-menu">
          <button className="danger-button" aria-expanded={menu} onClick={() => setMenu(open => !open)}>{t("clearHistory")} ▾</button>
          {menu && <ul role="menu">
            {[7, 30, 90].map(days => <li key={days}><button role="menuitem" onClick={() => { setPending({ kind: "older-than", days }); setMenu(false); }}>{t("deleteOlderScope")} {days} {t("daysUnit")}</button></li>)}
            <li><button role="menuitem" className="danger" onClick={() => { setPending({ kind: "all" }); setMenu(false); }}>{t("deleteAllScope")}</button></li>
          </ul>}
        </span>
      </div>
    </header>

    <SummaryStrip summary={summary} t={t} />

    <div className="history-filters">
      <div className="media-filters" role="tablist" aria-label={t("history")}>
        {FILTERS.map(value => <button key={value} className={filters.type === value && filters.level === "any" ? "active" : ""} onClick={() => set({ type: value, level: "any" })}>{value === "all" ? t("allEvents") : t(`event_${value}`)}</button>)}
      </div>
      <input className="history-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")} maxLength={80} />
      <select value={filters.level} onChange={event => set({ level: event.target.value as HistoryFilters["level"] })} aria-label={t("levelFilter")}>
        <option value="any">{t("anyLevel")}</option>
        {(["high", "review", "normal"] as const).map(level => <option key={level} value={level}>{t(`level_${level}`)}</option>)}
      </select>
      <select value={filters.range} onChange={event => set({ range: event.target.value as HistoryFilters["range"] })} aria-label={t("rangeFilter")}>
        {RANGES.map(range => <option key={range} value={range}>{t(`range_${range}`)}</option>)}
      </select>
      {filters.range === "custom" && <>
        <input type="date" value={filters.from} max={filters.to || undefined} onChange={event => set({ from: event.target.value })} aria-label={t("rangeFrom")} />
        <input type="date" value={filters.to} min={filters.from || undefined} onChange={event => set({ to: event.target.value })} aria-label={t("rangeTo")} />
      </>}
      <button onClick={() => set({ order: filters.order === "desc" ? "asc" : "desc" })} title={t("orderHelp")}>{filters.order === "desc" ? t("newestFirst") : t("oldestFirst")}</button>
      {anyFilter && <button onClick={() => { setFilters(DEFAULT_FILTERS); setQuery(""); }}>{t("clearFilters")}</button>}
    </div>

    {pending && <div className="history-confirm" role="alertdialog" aria-label={t("clearHistory")}>
      <p><strong>{t("confirmDeleteTitle")}</strong> {scopeText(pending)}{filters.type !== "all" && filters.level === "any" ? ` · ${t(`event_${filters.type}`)}` : ""}. {t("confirmDeleteBody")}</p>
      <div>
        <button disabled={busy} onClick={() => void exportAs("json")}>{t("exportFirst")}</button>
        <button className="danger-button" disabled={busy} onClick={() => void confirmDelete()}>{t("deleteNow")}</button>
        <button disabled={busy} onClick={() => setPending(null)}>{t("cancel")}</button>
      </div>
    </div>}
    {notice && <p className={`history-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.text} <button aria-label={t("close")} onClick={() => setNotice(null)}>×</button></p>}
    {error && <p className="history-error" role="alert">{t("historyFailed")}</p>}
    {!loading && !error && events.length === 0 && <p className="media-empty">{anyFilter ? t("noEventsFiltered") : t("noEvents")}</p>}

    <ol className="history-list">
      {events.map(event => {
        const open = openId === event.id;
        return <li key={event.id} className={`history-row kind-${event.type} ${event.type === "alert" && event.to === "high" ? "is-high" : ""} ${open ? "is-open" : ""}`}>
          <button className="history-row-button" aria-expanded={open} onClick={() => setOpenId(open ? null : event.id)}>
            <time dateTime={event.at}>{new Date(event.at).toLocaleString()}</time>
            <span className="history-kind">{t(`event_${event.type}`)}</span>
            <span className="history-text">{describeEvent(event, t)}</span>
          </button>
          {open && <dl className="history-details">
            <div><dt>#</dt><dd>{event.id}</dd></div>
            <div><dt>{t("detailTime")}</dt><dd>{event.at}</dd></div>
            <pre>{JSON.stringify(event, null, 2)}</pre>
          </dl>}
        </li>;
      })}
    </ol>
    <footer className="history-foot"><span>{events.length}{summary ? ` / ${summary.total}` : ""} {t("eventsShown")}</span>{next !== null && <button className="history-more" onClick={() => void more()}>{t("loadMore")}</button>}</footer>
  </div>;
}

/** Draw a rectangle on the sensor plane to fill in the zone form; existing zones are shown for orientation. */
function ZoneCanvas({ zones, onDraw, t }: { zones: Zone[]; onDraw: (fields: NonNullable<ReturnType<typeof rectFromDrag>>) => void; t: Translate }) {
  const view = DEFAULT_ZONE_VIEW;
  const box = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);
  const width = view.xMax - view.xMin, height = view.yMax - view.yMin;
  const at = (event: React.PointerEvent): { x: number; y: number } => {
    const rect = box.current!.getBoundingClientRect();
    return pixelToMm(view, { width: rect.width, height: rect.height }, { x: event.clientX - rect.left, y: event.clientY - rect.top });
  };
  const rectProps = (x0: number, x1: number, y0: number, y1: number) => ({ x: x0 - view.xMin, y: y0 - view.yMin, width: x1 - x0, height: y1 - y0 });
  const finish = () => {
    if (drag) { const fields = rectFromDrag(drag.from, drag.to); if (fields) onDraw(fields); }
    setDrag(null);
  };
  return <figure className="zone-canvas">
    <svg ref={box} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("zoneCanvasHelp")}
      onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); const p = at(event); setDrag({ from: p, to: p }); }}
      onPointerMove={event => { if (drag) setDrag({ ...drag, to: at(event) }); }}
      onPointerUp={finish} onPointerCancel={() => setDrag(null)}>
      {[-4000, -2000, 0, 2000, 4000].map(x => <line key={`x${x}`} className="grid" x1={x - view.xMin} x2={x - view.xMin} y1={0} y2={height} />)}
      {[2000, 4000].map(y => <line key={`y${y}`} className="grid" y1={y - view.yMin} y2={y - view.yMin} x1={0} x2={width} />)}
      <line className="axis" x1={-view.xMin} x2={-view.xMin} y1={0} y2={height} />
      {zones.map(zone => <rect key={zone.id} className="zone" {...rectProps(zone.x_min_mm, zone.x_max_mm, zone.y_min_mm, zone.y_max_mm)}><title>{zone.name}</title></rect>)}
      {drag && <rect className="draft" {...rectProps(Math.min(drag.from.x, drag.to.x), Math.max(drag.from.x, drag.to.x), Math.min(drag.from.y, drag.to.y), Math.max(drag.from.y, drag.to.y))} />}
      <path className="sector" d={`M ${-view.xMin} 0 L ${-view.xMin - 5196} 3000 A 6000 6000 0 0 0 ${-view.xMin + 5196} 3000 Z`} />
      <circle className="sensor" cx={-view.xMin} cy={0} r={160} />
    </svg>
    <figcaption>{t("zoneCanvasHelp")}</figcaption>
  </figure>;
}

function RulesEditor({ origin, t }: { origin: string; t: Translate }) {
  const [rules, setRules] = useState<Rules | null>(null);
  const [draft, setDraft] = useState<ZoneDraft>(emptyZoneDraft());
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => { void readRules(origin).then(setRules).catch(() => setMessage(t("rulesFailed"))); }, [origin, t]);
  if (!rules) return <div className="history-card"><p className="muted">{message || t("loading")}</p></div>;

  const update = (next: Rules) => { setRules(next); setDirty(true); setMessage(""); };
  const addZone = () => {
    const zone = zoneFromDraft(draft, rules.zones);
    if (!zone) { setMessage(t("zoneInvalid")); return; }
    update({ ...rules, zones: [...rules.zones, zone] });
    setDraft(emptyZoneDraft());
  };
  const save = async () => {
    try { setRules(await saveRules(origin, rules)); setDirty(false); setMessage(t("rulesSaved")); }
    catch { setMessage(t("rulesFailed")); }
  };
  const field = (key: keyof ZoneDraft, label: string, width = "") => <label className={`rule-field ${width}`}>{label}
    <input value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} inputMode={key === "name" || key === "node_id" ? "text" : "numeric"} /></label>;

  return <div className="history-card">
    <header className="history-head"><MenuTitle kind="alarms"><p className="eyebrow">ALERT RULES</p><h2>{t("rules")}</h2><p className="muted">{t("rulesHelp")}</p></MenuTitle></header>
    <label className="rule-field dwell">{t("dwellSeconds")}
      <input type="number" min={0} max={60} step={0.5} value={rules.dwell_ms / 1000} onChange={event => update({ ...rules, dwell_ms: Math.max(0, Math.min(60_000, Math.round(Number(event.target.value) * 1000) || 0)) })} />
    </label>
    <h3>{t("zonesTitle")}</h3>
    <p className="muted">{t("zoneIgnoreHelp")}</p>
    {rules.zones.length === 0 && <p className="media-empty">{t("noZones")}</p>}
    <ul className="zone-list">
      {rules.zones.map((zone: Zone) => <li key={zone.id}>
        <span><strong>{zone.name}</strong> <small>{zone.node_id ?? t("anyNode")} · {zone.sensor_id ? `S${zone.sensor_id}` : t("anySensor")} · x {zone.x_min_mm}…{zone.x_max_mm} · y {zone.y_min_mm}…{zone.y_max_mm} mm</small></span>
        <button className="danger-button" onClick={() => update({ ...rules, zones: rules.zones.filter(other => other.id !== zone.id) })}>{t("removeZone")}</button>
      </li>)}
    </ul>
    <ZoneCanvas zones={rules.zones} onDraw={fields => setDraft(current => ({ ...current, ...fields }))} t={t} />
    <div className="zone-form">
      {field("name", t("zoneName"), "wide")}{field("node_id", t("nodeOptional"))}{field("sensor_id", t("sensorOptional"))}
      {field("x_min_mm", "x min")}{field("x_max_mm", "x max")}{field("y_min_mm", "y min")}{field("y_max_mm", "y max")}
      <button onClick={addZone}>{t("addZone")}</button>
    </div>
    <div className="rules-actions">
      <button className="primary" disabled={!dirty} onClick={() => void save()}>{t("saveRules")}</button>
      {message && <span role="status" className="muted">{message}</span>}
    </div>
  </div>;
}

export function HistoryView({ origin, t }: { origin: string; t: Translate }) {
  // The event log and the alert rules are two jobs: one at a time, each with the whole screen.
  const [tab, setTab] = useState<"events" | "rules">("events");
  return <section className="history-workspace">
    <ViewTabs tabs={[["events", t("history")], ["rules", t("rules")]]} active={tab} onChange={setTab} />
    {tab === "events" ? <EventPanel origin={origin} t={t} /> : <RulesEditor origin={origin} t={t} />}
  </section>;
}
