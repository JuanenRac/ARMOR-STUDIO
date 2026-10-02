/**
 * The Weather menu: the weather of the place where the installation is - now, the rain of the next hour, the warnings the forecast implies, a live radar of rain and clouds, the next 48 hours
 * and ten days, the air and the pollen, the sun and the moon. It asks the Internet (see weather/api.ts) only after the person turns it on, and only while it is open.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Translate } from "../components/camera";
import { MenuTitle } from "../menuLogos";
import { getPreferences, savePreferences, type WeatherPlace } from "../api";
import { loadAirQuality, loadForecast, searchPlaces } from "../weather/api";
import { BarChart, CloudChart, LineChart, WindArrow } from "../weather/charts";
import { RadarMap } from "../weather/RadarMap";
import { aqiBand, clock, compass, dewPoint, hourIndex, localIso, moonPhase, nextHourRain, parsePlace, POLLEN_KINDS, pollenBand, pressureTrend, uvBand, warnings, weatherCode, windBand, type AirQuality, type Forecast, type Place } from "../weather/model";
import "./weather.css";

const KEY = "armor-studio-weather-v1";
type Saved = { enabled: boolean; place: Place | null };

/** What was saved, read value by value: only a real place and an explicit yes count. */
export function readSaved(text: string | null): Saved {
  try {
    const value = JSON.parse(text ?? "null") as { enabled?: unknown; place?: unknown } | null;
    const place = parsePlace(value?.place);
    return { enabled: value?.enabled === true && place !== null, place };
  } catch { return { enabled: false, place: null }; }
}
const load = (): Saved => { try { return readSaved(window.localStorage.getItem(KEY)); } catch { return { enabled: false, place: null }; } };
const store = (saved: Saved | null) => { try { if (saved) window.localStorage.setItem(KEY, JSON.stringify(saved)); else window.localStorage.removeItem(KEY); } catch { /* the choice is not kept */ } };
// The server keeps the place under lat/lon/region/country (always strings); the client's own Place keeps latitude/longitude and leaves region/country out when unknown.
const toWeatherPlace = (place: Place): WeatherPlace => ({ name: place.name, region: place.region ?? "", country: place.country ?? "", lat: place.latitude, lon: place.longitude });
const fromWeatherPlace = (place: WeatherPlace): Place => ({ name: place.name, region: place.region || undefined, country: place.country || undefined, latitude: place.lat, longitude: place.lon });

const fixed = (value: number | null | undefined, digits = 0): string => value === null || value === undefined ? "–" : value.toFixed(digits);
const timeOf = (iso: string | undefined): string => iso ? iso.slice(11, 16) : "–";
const placeTitle = (place: Place): string => [place.name, place.region, place.country].filter(Boolean).join(", ");
const AQI_COLOURS = ["#35d6a6", "#9be564", "#ffd166", "#ff9f4a", "#ff6f79", "#b26cff"];
const POLLEN_COLOURS = ["#35d6a6", "#9be564", "#ffd166", "#ff9f4a", "#ff6f79"];

function useWeather(place: Place | null, enabled: boolean) {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [air, setAir] = useState<AirQuality | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!place || !enabled) return;
    const control = new AbortController();
    setLoading(true);
    Promise.allSettled([loadForecast(place, control.signal), loadAirQuality(place, control.signal)]).then(([weather, quality]) => {
      if (control.signal.aborted) return;
      if (weather.status === "fulfilled") { setForecast(weather.value); setFailed(false); setUpdated(Date.now()); } else setFailed(true);
      setAir(quality.status === "fulfilled" ? quality.value : null);
      setLoading(false);
    });
    const again = window.setInterval(() => setTick(value => value + 1), 10 * 60 * 1000);
    return () => { control.abort(); window.clearInterval(again); };
  }, [place, enabled, tick]);
  return { forecast: place ? forecast : null, air: place ? air : null, failed, loading, updated, refresh: () => setTick(value => value + 1) };
}

function Detail({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <div className="wx-detail" title={hint}><small>{label}</small><strong>{children}</strong></div>;
}

export function WeatherView({ t, locale, origin }: { t: Translate; locale: string; origin: string }) {
  const [saved, setSaved] = useState<Saved>(load);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const weather = useWeather(saved.place, saved.enabled);
  const { forecast, air } = weather;

  // The account's own choice, kept on the server, wins over whatever this browser remembers locally - so it travels with
  // the person rather than staying behind at whichever address they used before. A place never set server-side (not even
  // explicitly cleared) leaves the local fallback alone, so a first sync does not erase a choice nobody migrated yet.
  useEffect(() => {
    let cancelled = false;
    getPreferences(origin).then(prefs => {
      if (cancelled || prefs.weatherPlace === undefined) return;
      const next: Saved = prefs.weatherPlace ? { enabled: true, place: fromWeatherPlace(prefs.weatherPlace) } : { enabled: false, place: null };
      setSaved(next); store(next);
    }).catch(() => { /* the local fallback stands when the server cannot be asked */ });
    return () => { cancelled = true; };
  }, [origin]);

  const update = (next: Saved | null) => {
    setSaved(next ?? { enabled: false, place: null }); store(next);
    savePreferences(origin, { weatherPlace: next?.place ? toWeatherPlace(next.place) : null }).catch(() => { /* kept locally at least */ });
  };
  const search = useCallback(async () => {
    setSearching(true); setResults(null);
    try { setResults(await searchPlaces(query, locale)); } catch { setResults([]); }
    setSearching(false);
  }, [query, locale]);

  const model = useMemo(() => {
    if (!forecast) return null;
    const now = localIso(Date.now(), forecast.utcOffsetSeconds), at = hourIndex(forecast.hourly.time, now);
    return { now, at, rain: nextHourRain(forecast.minutely, now), found: warnings(forecast, at), moon: moonPhase(new Date()) };
  }, [forecast]);

  const title = <header className="devices-head"><MenuTitle kind="weather"><p className="eyebrow">{t("weatherTitle")}</p><h2>{t("weather")}</h2><p className="muted">{t("weatherHelp")}</p></MenuTitle></header>;

  if (!saved.enabled) {
    return <section className="weather-view">{title}
      <div className="wx-consent">
        <h3>{t("wxConsentTitle")}</h3>
        <p>{t("wxConsentBody")}</p>
        <PlaceSearch t={t} query={query} setQuery={setQuery} search={search} searching={searching} results={results} onPick={place => { update({ enabled: true, place }); setResults(null); setQuery(""); }} />
        <small className="wx-sources">{t("wxSources")}</small>
      </div>
    </section>;
  }

  const place = saved.place!;
  const h = forecast?.hourly, d = forecast?.daily, c = forecast?.current ?? null, at = model?.at ?? 0;
  const code = c ? weatherCode(c.code, c.isDay) : null;
  const dew = c ? dewPoint(c.temperature, c.humidity) ?? h?.dewPoint[at] ?? null : null;
  const trend = h ? pressureTrend(h.pressure, at) : null;
  const dir = c ? compass(c.windDir) : null, band = c ? windBand(c.windSpeed) : null, uv = h?.uv[at] ?? null, uvKind = uvBand(uv);
  const slice = <T,>(values: readonly T[], from = at, count = 48): T[] => values.slice(from, from + count);
  const labels = h ? slice(h.time).map(time => time.slice(11, 13) === "00" ? new Date(Number(time.slice(0, 4)), Number(time.slice(5, 7)) - 1, Number(time.slice(8, 10))).toLocaleDateString(locale, { weekday: "short" }) : `${time.slice(11, 13)}h`) : [];
  const aqi = air ? aqiBand(air.europeanAqi) : null;
  const pollen = air ? POLLEN_KINDS.map(kind => ({ kind, grains: air.pollen[kind] ?? null })).filter(item => item.grains !== null) : [];
  const dayName = (iso: string, index: number) => index === 0 ? t("wxToday") : new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))).toLocaleDateString(locale, { weekday: "short", day: "numeric" });

  return <section className="weather-view">{title}
    <div className="wx-bar">
      <div className="wx-place"><strong>📍 {placeTitle(place)}</strong>{forecast && <small>{place.latitude.toFixed(2)}, {place.longitude.toFixed(2)} · {t("wxElevation")} {fixed(forecast.elevation)} m</small>}</div>
      <div className="wx-actions">
        {weather.updated > 0 && <small>{t("wxUpdated")} {new Date(weather.updated).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</small>}
        <button onClick={weather.refresh}>↻</button>
        <button onClick={() => setChoosing(value => !value)}>{t("wxChangePlace")}</button>
        <button onClick={() => update(null)}>{t("wxDisable")}</button>
      </div>
    </div>
    {choosing && <div className="wx-consent compact"><PlaceSearch t={t} query={query} setQuery={setQuery} search={search} searching={searching} results={results} onPick={next => { update({ enabled: true, place: next }); setChoosing(false); setResults(null); setQuery(""); }} /></div>}
    {weather.failed && !forecast && <p className="wx-note bad">{t("wxLoadError")}</p>}
    {!forecast && !weather.failed && <p className="wx-note">{t("wxLoading")}</p>}

    {forecast && c && code && model && h && d && <>
      <div className="wx-hero">
        <div className="wx-now">
          <span className="wx-icon" aria-hidden="true">{code.icon}</span>
          <div><div className="wx-temp">{fixed(c.temperature, 1)}<span>°C</span></div><div className="wx-desc">{t(`wx_${code.key}`)}</div><small>{t("wxFeelsLike")} {fixed(c.apparent, 1)}°</small></div>
        </div>
        <div className="wx-details">
          <Detail label={t("wxWind")}><WindArrow degrees={c.windDir} /> {fixed(c.windSpeed)} km/h {dir !== null ? t(`wd_${dir}`) : ""}<em>{band ? t(`wind_${band}`) : ""}{c.windGust !== null ? ` · ${t("wxGusts")} ${fixed(c.windGust)}` : ""}</em></Detail>
          <Detail label={t("wxHumidity")}>{fixed(c.humidity)} %<em>{t("wxDewPoint")} {fixed(dew, 1)}°</em></Detail>
          <Detail label={t("wxPressure")}>{fixed(c.pressure)} hPa<em>{trend ? t(trend === "rising" ? "wxRising" : trend === "falling" ? "wxFalling" : "wxSteady") : ""}</em></Detail>
          <Detail label={t("wxCloudCover")}>{fixed(c.cloud)} %<em>{h.cloudLow[at] !== undefined ? `${t("wxCloudLow")} ${fixed(h.cloudLow[at])} · ${t("wxCloudMid")} ${fixed(h.cloudMid[at])} · ${t("wxCloudHigh")} ${fixed(h.cloudHigh[at])}` : ""}</em></Detail>
          <Detail label={t("wxVisibility")}>{h.visibility[at] !== null && h.visibility[at] !== undefined ? fixed((h.visibility[at] as number) / 1000, 1) : "–"} km</Detail>
          <Detail label={t("wxUv")}>{fixed(uv, 1)}<em>{uvKind ? t(`uv_${uvKind}`) : ""}</em></Detail>
          <Detail label={t("wxPrecipitation")}>{fixed(c.precipitation, 1)} mm<em>{c.snowfall ? `❄ ${fixed(c.snowfall, 1)} cm` : ""}</em></Detail>
          <Detail label={t("wxFreezing")}>{fixed(h.freezing[at])} m</Detail>
        </div>
      </div>

      <div className="wx-strip">
        <div className="wx-sun"><span>🌅 {t("wxSunrise")} <b>{timeOf(d.sunrise[0])}</b></span><span>🌇 {t("wxSunset")} <b>{timeOf(d.sunset[0])}</b></span><span>☀ {t("wxDaylight")} <b>{clock(d.daylight[0] ?? null)}</b></span><span>{model.moon.icon} {t("wxMoon")} <b>{t(`moon_${model.moon.key}`)}</b> · {Math.round(model.moon.illumination * 100)} % {t("wxLit")}</span></div>
        <div className={`wx-rain ${model.rain.raining ? "now" : model.rain.start ? "soon" : ""}`}>
          {!model.rain.known ? null : model.rain.raining ? `🌧 ${t("wxRainNow")}: ${fixed(model.rain.mm, 1)} ${t("wxRainMm")}` : model.rain.start ? `🌦 ${t("wxRainFrom")} ${timeOf(model.rain.start)}: ${fixed(model.rain.mm, 1)} ${t("wxRainMm")}` : `☀ ${t("wxRainNone")}`}
        </div>
      </div>

      <div className="wx-card">
        <h3>⚠ {t("wxWarnings")}</h3>
        {model.found.length === 0 ? <p className="wx-ok">✓ {t("wxNoWarnings")}</p> : <ul className="wx-warnings">{model.found.map(item => <li key={item.id} className={item.level}>
          <b>{item.level === "warning" ? t("wxWarningLevel") : t("wxWatch")}</b> {t(item.key)} <small>{item.id === "thunder" || item.id === "ice" ? "" : `${fixed(item.value, item.id === "rain" || item.id === "snow" || item.id === "uv" ? 1 : 0)} · `}{t("wxExpectedAt")} {item.at.slice(5, 10).replace("-", "/")} {timeOf(item.at)}</small>
        </li>)}</ul>}
        <small className="wx-sources">{t("wxWarningsNote")}</small>
      </div>

      <div className="wx-card"><h3>🛰 {t("wxRadar")}</h3><RadarMap place={place} t={t} locale={locale} /></div>

      <div className="wx-card">
        <h3>{t("wxHours")}</h3>
        <div className="wx-hourly">{slice(h.time, at, 24).map((time, index) => { const i = at + index, hc = weatherCode(h.code[i] ?? null, h.isDay[i] !== 0); return <div key={time} className="wx-hour"><small>{index === 0 ? t("wxNow") : `${time.slice(11, 13)}h`}</small><span aria-hidden="true">{hc.icon}</span><b>{fixed(h.temperature[i])}°</b><i>{h.precipProb[i] ? `${fixed(h.precipProb[i])}%` : ""}</i></div>; })}</div>
        <h4>{t("wxTemperature")}</h4>
        <LineChart series={[{ values: slice(h.temperature), color: "#ff8a5b", label: t("wxTemperature"), area: true }, { values: slice(h.apparent), color: "#ffd166", label: t("wxFeelsLike"), dashed: true }]} labels={labels} unit="°C" now={0} />
        <h4>{t("wxPrecipitation")} / {t("wxRainChance")}</h4>
        <BarChart values={slice(h.precip)} chance={slice(h.precipProb)} labels={labels} unit="mm" now={0} />
        <h4>{t("wxWind")} / {t("wxGusts")}</h4>
        <LineChart series={[{ values: slice(h.windSpeed), color: "#5df0c4", label: t("wxWind"), area: true }, { values: slice(h.windGust), color: "#b26cff", label: t("wxGusts"), dashed: true }]} labels={labels} unit="km/h" now={0} floorAtZero minimumSpan={10} />
        <h4>{t("wxClouds")} ({t("wxCloudLow")} · {t("wxCloudMid")} · {t("wxCloudHigh")})</h4>
        <CloudChart low={slice(h.cloudLow)} mid={slice(h.cloudMid)} high={slice(h.cloudHigh)} labels={labels} now={0} />
        <h4>{t("wxPressure")}</h4>
        <LineChart series={[{ values: slice(h.pressure), color: "#8ab4ff", label: t("wxPressure") }]} labels={labels} unit="hPa" now={0} minimumSpan={4} />
      </div>

      <div className="wx-card">
        <h3>{t("wxDays")}</h3>
        <div className="wx-days">{d.time.map((day, index) => { const dc = weatherCode(d.code[index] ?? null, true); return <div key={day} className="wx-day">
          <b>{dayName(day, index)}</b><span className="wx-day-icon" aria-hidden="true">{dc.icon}</span><small>{t(`wx_${dc.key}`)}</small>
          <div className="wx-range"><span>{fixed(d.tMax[index])}°</span><i /><span>{fixed(d.tMin[index])}°</span></div>
          <small>🌧 {fixed(d.precipSum[index], 1)} mm · {fixed(d.precipProbMax[index])}%</small>
          <small><WindArrow degrees={d.windDir[index] ?? null} size={14} /> {fixed(d.windMax[index])} / {fixed(d.gustMax[index])} km/h</small>
          <small>☀ UV {fixed(d.uvMax[index], 1)} · {timeOf(d.sunrise[index])}–{timeOf(d.sunset[index])}</small>
        </div>; })}</div>
      </div>
    </>}

    {air && <div className="wx-card">
      <h3>🌿 {t("wxAir")}</h3>
      <div className="wx-air">
        <div className="wx-aqi" style={{ borderColor: aqi ? AQI_COLOURS[aqi.level] : undefined }}><small>{t("wxAqi")}</small><strong style={{ color: aqi ? AQI_COLOURS[aqi.level] : undefined }}>{fixed(air.europeanAqi)}</strong><span>{aqi ? t(`aqi_${aqi.key}`) : ""}</span></div>
        <div className="wx-pollutants">
          {([["wxPm25", air.pm25, "µg/m³"], ["wxPm10", air.pm10, "µg/m³"], ["wxOzone", air.o3, "µg/m³"], ["wxNo2", air.no2, "µg/m³"], ["wxSo2", air.so2, "µg/m³"], ["wxCo", air.co, "µg/m³"], ["wxDust", air.dust, "µg/m³"]] as const).map(([key, value, unit]) => value !== null && <Detail key={key} label={t(key)}>{fixed(value, 1)} <em>{unit}</em></Detail>)}
        </div>
      </div>
      <h4>{t("wxPollen")}</h4>
      {pollen.length === 0 ? <small className="wx-sources">{t("wxPollenNone")}</small> : <div className="wx-pollen">{pollen.map(item => { const p = pollenBand(item.grains); return <div key={item.kind} className="wx-pollen-item"><small>{t(`wxPollen_${item.kind}`)}</small><strong style={{ color: p ? POLLEN_COLOURS[p.level] : undefined }}>{fixed(item.grains)}</strong><span>{p ? t(`pollen_${p.key}`) : ""}</span></div>; })}</div>}
    </div>}
    <footer className="wx-foot"><small>{t("wxSources")}</small></footer>
  </section>;
}

function PlaceSearch({ t, query, setQuery, search, searching, results, onPick }: { t: Translate; query: string; setQuery: (value: string) => void; search: () => void; searching: boolean; results: Place[] | null; onPick: (place: Place) => void }) {
  return <div className="wx-search">
    <p>{t("wxChoosePlace")}</p>
    <form onSubmit={event => { event.preventDefault(); void search(); }}>
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder={t("wxSearchPlace")} aria-label={t("wxSearchPlace")} maxLength={80} />
      <button className="primary" type="submit" disabled={searching || query.trim().length < 2}>{t("wxSearch")}</button>
    </form>
    {results !== null && results.length === 0 && <p className="wx-note">{t("wxNoResults")}</p>}
    <CoordinateEntry t={t} onPick={onPick} />
    {results && results.length > 0 && <ul className="wx-results">{results.map(place => <li key={`${place.latitude},${place.longitude}`}><button onClick={() => onPick(place)}><b>{place.name}</b> <small>{[place.region, place.country].filter(Boolean).join(", ")} · {place.latitude.toFixed(2)}, {place.longitude.toFixed(2)}</small></button></li>)}</ul>}
  </div>;
}

/** A place given by its coordinates (and a name of the person's choosing), for a spot a search does not find. */
function CoordinateEntry({ t, onPick }: { t: Translate; onPick: (place: Place) => void }) {
  const [open, setOpen] = useState(false);
  const [latitude, setLatitude] = useState(""), [longitude, setLongitude] = useState(""), [name, setName] = useState("");
  const place = parsePlace({ name: name.trim() || `${latitude}, ${longitude}`, latitude: Number(latitude.replace(",", ".")), longitude: Number(longitude.replace(",", ".")) });
  const valid = latitude.trim() !== "" && longitude.trim() !== "" && place !== null;
  return <div className="wx-coords">
    <button type="button" className="wx-link" onClick={() => setOpen(value => !value)}>{open ? "▾" : "▸"} {t("wxByCoordinates")}</button>
    {open && <form onSubmit={event => { event.preventDefault(); if (valid && place) onPick(place); }}>
      <input value={name} onChange={event => setName(event.target.value)} placeholder={t("wxPlaceName")} aria-label={t("wxPlaceName")} maxLength={80} />
      <input value={latitude} onChange={event => setLatitude(event.target.value)} placeholder={t("wxLatitude")} aria-label={t("wxLatitude")} inputMode="decimal" />
      <input value={longitude} onChange={event => setLongitude(event.target.value)} placeholder={t("wxLongitude")} aria-label={t("wxLongitude")} inputMode="decimal" />
      <button className="primary" type="submit" disabled={!valid}>{t("wxUseCoordinates")}</button>
    </form>}
  </div>;
}
