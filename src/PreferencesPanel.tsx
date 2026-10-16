/**
 * Configuration > Preferences: how Studio helps (the guided tours and the hover hints), how it looks and moves (animations, density, size of the text), where it opens and how it announces
 * a new critical alarm. Every change is saved at once in this browser and applied to the page at once.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { askConfirm } from "./askConfirm";
import { ASSISTANT_SIZES, LIMITS, MOTION_MODES, DENSITIES, TOOLTIP_MODES, VIEWS, markTour, resetPrefs, setPrefs, usePrefs, type StartView } from "./prefs";
import { TOURS } from "./tour/tours";
import { startTour } from "./tour/tourStore";
import { AlertSettingsPanel } from "./alerts/AlertSettingsPanel";
import { TourArt } from "./tour/TourArt";
import "./tour/tour.css";
import "./preferences.css";

const format = (template: string, args: ReadonlyArray<string | number>): string => template.replace(/\{(\d+)\}/g, (_match, index: string) => String(args[Number(index)] ?? ""));

export function PreferencesPanel({ t, language = "en" }: { t: (key: string) => string; language?: string }) {
  const prefs = usePrefs();
  const seen = new Set(prefs.toursDone);
  const reset = async () => { if (await askConfirm(t("pf_reset_confirm"), t)) resetPrefs(); };
  const choose = <T extends string>(name: string, key: string, values: readonly T[], value: T, change: (next: T) => void, labelKey: (item: T) => string) =>
    <fieldset className="pf-choice"><legend>{t(key)}</legend>{values.map(item => <label key={item} className={value === item ? "on" : ""}><input type="radio" name={name} checked={value === item} onChange={() => change(item)} />{t(labelKey(item))}</label>)}</fieldset>;
  const toggle = (key: string, hint: string | null, checked: boolean, change: (next: boolean) => void, disabled = false) =>
    <label className="pf-toggle"><input type="checkbox" checked={checked} disabled={disabled} onChange={event => change(event.target.checked)} /><span><strong>{t(key)}</strong>{hint && <small>{t(hint)}</small>}</span></label>;

  return <div className="pf">
    <div className="pf-head"><div><h3>{t("pf_title")}</h3><p className="muted">{t("pf_help")}</p></div><span className="pf-saved" role="status">✓ {t("pf_saved")}</span></div>

    <div className="config-grid">
      <article className="stack-card pf-card">
        <h3>{t("pf_section_help")}</h3>
        {toggle("pf_tutorial", "pf_tutorial_h", prefs.tutorial, tutorial => setPrefs({ tutorial }))}
        {toggle("pf_assistant", "pf_assistant_h", prefs.assistant, assistant => setPrefs({ assistant }))}
        {toggle("pf_asst_autoopen", "pf_asst_autoopen_h", prefs.assistantAutoOpen, assistantAutoOpen => setPrefs({ assistantAutoOpen }), !prefs.assistant)}
        {toggle("pf_asst_speak", "pf_asst_speak_h", prefs.assistantSpeak, assistantSpeak => setPrefs({ assistantSpeak }), !prefs.assistant)}
        {toggle("pf_asst_pinned", "pf_asst_pinned_h", prefs.assistantPinned, assistantPinned => setPrefs({ assistantPinned }), !prefs.assistant)}
        {choose("asstsize", "pf_asst_size", ASSISTANT_SIZES, prefs.assistantSize, assistantSize => setPrefs({ assistantSize }), item => `pf_asst_size_${item}`)}
        <div className="pf-actions"><button type="button" disabled={!prefs.assistant || (prefs.assistantX === null && !prefs.assistantPinned)} onClick={() => setPrefs({ assistantX: null, assistantY: null, assistantPinned: false })}>{t("pf_asst_reset")}</button></div>
        {toggle("pf_autostart", null, prefs.tourAutoStart, tourAutoStart => setPrefs({ tourAutoStart }), !prefs.tutorial)}
        {choose("tooltips", "pf_tooltips", TOOLTIP_MODES, prefs.tooltips, tooltips => setPrefs({ tooltips }), item => `pf_tooltips_${item}`)}
        <p className="muted pf-hint">{t("pf_tooltips_h")}</p>
        <label className="pf-range">{t("pf_delay")}: <b>{prefs.tooltipDelay} ms</b>
          <input type="range" min={LIMITS.tooltipDelay[0]} max={LIMITS.tooltipDelay[1]} step={50} value={prefs.tooltipDelay} disabled={prefs.tooltips === "off"} onChange={event => setPrefs({ tooltipDelay: Number(event.target.value) })} /></label>
        <div className="pf-preview"><strong>{t("pf_preview")}</strong><p className="muted">{t("pf_preview_h")}</p>
          <button type="button" title={t("pf_preview_tip")}>{t("pf_preview_button")}</button></div>
      </article>

      <article className="stack-card pf-card">
        <h3>{t("pf_section_look")}</h3>
        {choose("motion", "pf_motion", MOTION_MODES, prefs.motion, motion => setPrefs({ motion }), item => `pf_motion_${item}`)}
        <p className="muted pf-hint">{t("pf_motion_h")}</p>
        {choose("density", "pf_density", DENSITIES, prefs.density, density => setPrefs({ density }), item => `pf_density_${item}`)}
        <label className="pf-range">{t("pf_scale")}: <b>{prefs.textScale} %</b>
          <input type="range" min={LIMITS.textScale[0]} max={LIMITS.textScale[1]} step={5} value={prefs.textScale} onChange={event => setPrefs({ textScale: Number(event.target.value) })} /></label>
      </article>

      <article className="stack-card pf-card">
        <h3>{t("pf_section_start")}</h3>
        <label>{t("pf_start")}
          <select value={prefs.startView} onChange={event => setPrefs({ startView: event.target.value as StartView })}>
            <option value="last">{t("pf_start_last")}</option>
            {VIEWS.map(view => <option key={view} value={view}>{t(view)}</option>)}
          </select></label>
        <h3 className="pf-sub">{t("pf_section_alerts")}</h3>
        {toggle("pf_sound", null, prefs.alertSound, alertSound => setPrefs({ alertSound }))}
        {toggle("pf_notify", null, prefs.alertNotifications, alertNotifications => setPrefs({ alertNotifications }))}
        <div className="pf-actions"><button className="danger" onClick={() => void reset()}>{t("pf_reset")}</button></div>
      </article>
    </div>

    <AlertSettingsPanel t={t} language={language} />

    <article className="stack-card pf-tours">
      <h3>{t("pf_tours")}</h3>
      <p className="muted">{t("pf_tours_h")}</p>
      <ul className="pf-tour-list">{TOURS.map(tour => <li key={tour.id} className={seen.has(tour.id) ? "seen" : ""}>
        <div className="pf-tour-art"><TourArt art={tour.art} size={96} /></div>
        <div className="pf-tour-text">
          <strong>{t(`tour_${tour.id}`)} {seen.has(tour.id) && <em className="pf-badge">✓ {t("tourDoneBadge")}</em>}</strong>
          <span className="muted">{t(`tour_${tour.id}_s`)}</span>
          <small className="muted">{format(t("tourStepsCount"), [tour.steps.length])} · {format(t("tourMinutes"), [tour.minutes])}</small>
        </div>
        <button className="primary" onClick={() => startTour(tour.id)}>{seen.has(tour.id) ? t("tourReplay") : t("tourStart")}</button>
      </li>)}</ul>
      <div className="pf-actions"><button onClick={() => TOURS.forEach(tour => markTour(tour.id, false))} disabled={prefs.toursDone.length === 0}>{t("pf_forget_tours")}</button></div>
    </article>
  </div>;
}
