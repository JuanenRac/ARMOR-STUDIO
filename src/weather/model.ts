/**
 * The weather of a place, as the Weather menu holds it: the data Open-Meteo returns (read value by value, never trusted), and everything that is worked out from it - what the
 * weather code means, the compass point of the wind, the bands of the UV index, the air quality and the pollen, the phase of the moon, the rain of the next hour and the warnings
 * the forecast itself implies. Pure functions of their input: nothing here asks the network.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */

export type Place = { name: string; region?: string; country?: string; latitude: number; longitude: number };
type Series = Array<number | null>;

export type Current = {
  time: string; temperature: number | null; apparent: number | null; humidity: number | null; isDay: boolean; precipitation: number | null; rain: number | null; showers: number | null;
  snowfall: number | null; code: number | null; cloud: number | null; pressure: number | null; windSpeed: number | null; windDir: number | null; windGust: number | null;
};
export type Hourly = {
  time: string[]; temperature: Series; apparent: Series; precipProb: Series; precip: Series; snowfall: Series; code: Series; cloud: Series; cloudLow: Series; cloudMid: Series; cloudHigh: Series;
  visibility: Series; windSpeed: Series; windGust: Series; windDir: Series; humidity: Series; dewPoint: Series; pressure: Series; uv: Series; cape: Series; freezing: Series; isDay: Series;
};
export type Daily = {
  time: string[]; code: Series; tMax: Series; tMin: Series; apMax: Series; apMin: Series; sunrise: string[]; sunset: string[]; daylight: Series; sunshine: Series; uvMax: Series;
  precipSum: Series; rainSum: Series; snowSum: Series; precipHours: Series; precipProbMax: Series; windMax: Series; gustMax: Series; windDir: Series;
};
export type Minutely = { time: string[]; precip: Series };
export type Forecast = { latitude: number; longitude: number; elevation: number | null; timezone: string; utcOffsetSeconds: number; current: Current | null; minutely: Minutely; hourly: Hourly; daily: Daily };

export type AirQuality = {
  time: string; europeanAqi: number | null; usAqi: number | null; pm10: number | null; pm25: number | null; co: number | null; no2: number | null; so2: number | null; o3: number | null; dust: number | null;
  pollen: Record<string, number | null>;
};

const num = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const series = (value: unknown): Series => Array.isArray(value) ? value.map(num) : [];
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const record = (value: unknown): Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Open-Meteo's forecast answer, read field by field: whatever is missing or of the wrong kind becomes null or an empty list. Null when it is not a forecast at all. */
export function parseForecast(json: unknown): Forecast | null {
  const root = record(json);
  const latitude = num(root.latitude), longitude = num(root.longitude);
  if (latitude === null || longitude === null) return null;
  const c = record(root.current), h = record(root.hourly), d = record(root.daily), m = record(root.minutely_15);
  const hourly: Hourly = {
    time: strings(h.time), temperature: series(h.temperature_2m), apparent: series(h.apparent_temperature), precipProb: series(h.precipitation_probability), precip: series(h.precipitation),
    snowfall: series(h.snowfall), code: series(h.weather_code), cloud: series(h.cloud_cover), cloudLow: series(h.cloud_cover_low), cloudMid: series(h.cloud_cover_mid), cloudHigh: series(h.cloud_cover_high),
    visibility: series(h.visibility), windSpeed: series(h.wind_speed_10m), windGust: series(h.wind_gusts_10m), windDir: series(h.wind_direction_10m), humidity: series(h.relative_humidity_2m),
    dewPoint: series(h.dew_point_2m), pressure: series(h.pressure_msl), uv: series(h.uv_index), cape: series(h.cape), freezing: series(h.freezing_level_height), isDay: series(h.is_day),
  };
  const daily: Daily = {
    time: strings(d.time), code: series(d.weather_code), tMax: series(d.temperature_2m_max), tMin: series(d.temperature_2m_min), apMax: series(d.apparent_temperature_max), apMin: series(d.apparent_temperature_min),
    sunrise: strings(d.sunrise), sunset: strings(d.sunset), daylight: series(d.daylight_duration), sunshine: series(d.sunshine_duration), uvMax: series(d.uv_index_max), precipSum: series(d.precipitation_sum),
    rainSum: series(d.rain_sum), snowSum: series(d.snowfall_sum), precipHours: series(d.precipitation_hours), precipProbMax: series(d.precipitation_probability_max), windMax: series(d.wind_speed_10m_max),
    gustMax: series(d.wind_gusts_10m_max), windDir: series(d.wind_direction_10m_dominant),
  };
  const current: Current | null = typeof c.time === "string" ? {
    time: c.time, temperature: num(c.temperature_2m), apparent: num(c.apparent_temperature), humidity: num(c.relative_humidity_2m), isDay: num(c.is_day) !== 0, precipitation: num(c.precipitation), rain: num(c.rain),
    showers: num(c.showers), snowfall: num(c.snowfall), code: num(c.weather_code), cloud: num(c.cloud_cover), pressure: num(c.pressure_msl), windSpeed: num(c.wind_speed_10m), windDir: num(c.wind_direction_10m), windGust: num(c.wind_gusts_10m),
  } : null;
  return { latitude, longitude, elevation: num(root.elevation), timezone: typeof root.timezone === "string" ? root.timezone : "UTC", utcOffsetSeconds: num(root.utc_offset_seconds) ?? 0, current, minutely: { time: strings(m.time), precip: series(m.precipitation) }, hourly, daily };
}

const POLLEN = ["alder", "birch", "grass", "mugwort", "olive", "ragweed"] as const;
export const POLLEN_KINDS = POLLEN;
export function parseAirQuality(json: unknown): AirQuality | null {
  const root = record(json), c = record(root.current);
  if (typeof c.time !== "string") return null;
  return {
    time: c.time, europeanAqi: num(c.european_aqi), usAqi: num(c.us_aqi), pm10: num(c.pm10), pm25: num(c.pm2_5), co: num(c.carbon_monoxide), no2: num(c.nitrogen_dioxide), so2: num(c.sulphur_dioxide), o3: num(c.ozone), dust: num(c.dust),
    pollen: Object.fromEntries(POLLEN.map(kind => [kind, num(c[`${kind}_pollen`])])),
  };
}

export type Frame = { time: number; path: string };
/** RainViewer's list of radar frames: the host of the tiles and the frames of the past two hours (oldest first). Null when it is not that. */
export function parseRadarFrames(json: unknown): { host: string; frames: Frame[] } | null {
  const root = record(json), host = root.host, past = record(root.radar).past;
  if (typeof host !== "string" || !/^https:\/\/[a-z0-9.-]+$/i.test(host) || !Array.isArray(past)) return null;
  const frames = past.flatMap(item => { const frame = record(item); return typeof frame.time === "number" && typeof frame.path === "string" && /^\/v2\/radar\/[A-Za-z0-9]+$/.test(frame.path) ? [{ time: frame.time, path: frame.path }] : []; });
  return frames.length ? { host, frames: frames.sort((a, b) => a.time - b.time) } : null;
}

// ---- the places the person chose ---------------------------------------------------------------------------------------------------------------------

/** A place read from storage or from the search, value by value: a bad coordinate or an over-long name makes it null. */
export function parsePlace(value: unknown): Place | null {
  const item = record(value), latitude = num(item.latitude), longitude = num(item.longitude);
  if (latitude === null || longitude === null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  const text = (field: unknown, limit: number): string | undefined => typeof field === "string" && field.trim() && field.length <= limit ? field.trim() : undefined;
  const name = text(item.name, 80);
  if (!name) return null;
  const place: Place = { name, latitude: Math.round(latitude * 1e4) / 1e4, longitude: Math.round(longitude * 1e4) / 1e4 };
  const region = text(item.region ?? item.admin1, 80), country = text(item.country, 80);
  if (region) place.region = region;
  if (country) place.country = country;
  return place;
}
/** The answer of Open-Meteo's geocoding: the places found, best first. */
export function parsePlaces(json: unknown): Place[] {
  const results = record(json).results;
  return Array.isArray(results) ? results.flatMap(item => { const place = parsePlace(item); return place ? [place] : []; }) : [];
}

// ---- what the numbers mean ---------------------------------------------------------------------------------------------------------------------------

/** The key of the phrase for a WMO weather code, and the symbol that goes with it. */
export function weatherCode(code: number | null, isDay = true): { key: string; icon: string } {
  const table: Record<number, [string, string, string?]> = {
    0: ["clear", "☀️", "🌙"], 1: ["mostly_clear", "🌤️", "🌙"], 2: ["partly_cloudy", "⛅", "☁️"], 3: ["overcast", "☁️"], 45: ["fog", "🌫️"], 48: ["rime_fog", "🌫️"],
    51: ["drizzle_light", "🌦️"], 53: ["drizzle", "🌦️"], 55: ["drizzle_heavy", "🌧️"], 56: ["freezing_drizzle", "🌧️"], 57: ["freezing_drizzle_heavy", "🌧️"],
    61: ["rain_light", "🌦️"], 63: ["rain", "🌧️"], 65: ["rain_heavy", "🌧️"], 66: ["freezing_rain", "🌧️"], 67: ["freezing_rain_heavy", "🌧️"],
    71: ["snow_light", "🌨️"], 73: ["snow", "🌨️"], 75: ["snow_heavy", "❄️"], 77: ["snow_grains", "🌨️"], 80: ["showers_light", "🌦️"], 81: ["showers", "🌧️"], 82: ["showers_violent", "⛈️"],
    85: ["snow_showers_light", "🌨️"], 86: ["snow_showers_heavy", "❄️"], 95: ["thunder", "⛈️"], 96: ["thunder_hail", "⛈️"], 99: ["thunder_hail_heavy", "⛈️"],
  };
  const entry = code === null ? undefined : table[code];
  if (!entry) return { key: "unknown", icon: "❔" };
  return { key: entry[0], icon: !isDay && entry[2] ? entry[2] : entry[1] };
}

/** One of the eight compass points (0 = north) for a bearing in degrees: the direction the wind comes from. */
export function compass(degrees: number | null): number | null {
  return degrees === null ? null : Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
}

/** The wind in words, from km/h (the Beaufort scale in eight steps). */
export function windBand(kmh: number | null): string | null {
  if (kmh === null) return null;
  return kmh < 2 ? "calm" : kmh < 20 ? "light" : kmh < 39 ? "moderate" : kmh < 50 ? "fresh" : kmh < 62 ? "strong" : kmh < 88 ? "gale" : kmh < 118 ? "storm" : "hurricane";
}

/** The UV index in words (the WHO bands). */
export function uvBand(index: number | null): string | null {
  return index === null ? null : index < 3 ? "low" : index < 6 ? "moderate" : index < 8 ? "high" : index < 11 ? "very_high" : "extreme";
}

/** The European air quality index in its six bands (0 to 20 good ... above 100 extremely poor). */
export function aqiBand(index: number | null): { key: string; level: number } | null {
  if (index === null) return null;
  const bands = ["good", "fair", "moderate", "poor", "very_poor", "extremely_poor"];
  const level = index <= 20 ? 0 : index <= 40 ? 1 : index <= 60 ? 2 : index <= 80 ? 3 : index <= 100 ? 4 : 5;
  return { key: bands[level], level };
}

/** A pollen count in grains per cubic metre in words. */
export function pollenBand(grains: number | null): { key: string; level: number } | null {
  if (grains === null) return null;
  const level = grains < 1 ? 0 : grains < 10 ? 1 : grains < 50 ? 2 : grains < 200 ? 3 : 4;
  return { key: ["none", "low", "moderate", "high", "very_high"][level], level };
}

/** The dew point in degrees for a temperature and a relative humidity (Magnus formula). */
export function dewPoint(celsius: number | null, humidity: number | null): number | null {
  if (celsius === null || humidity === null || humidity <= 0) return null;
  const a = 17.62, b = 243.12, gamma = Math.log(humidity / 100) + (a * celsius) / (b + celsius);
  return Math.round(((b * gamma) / (a - gamma)) * 10) / 10;
}

/** The phase of the moon on a date: how far through its month (0 new, 0.5 full), how much of it is lit, and the symbol. */
export function moonPhase(date: Date): { phase: number; illumination: number; index: number; icon: string; key: string } {
  const days = date.getTime() / 86400000 + 2440587.5 - 2451550.1;   // since a known new moon
  const phase = ((days / 29.530588853) % 1 + 1) % 1;
  const index = Math.round(phase * 8) % 8;
  return { phase, illumination: (1 - Math.cos(2 * Math.PI * phase)) / 2, index, icon: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"][index], key: ["new", "waxing_crescent", "first_quarter", "waxing_gibbous", "full", "waning_gibbous", "last_quarter", "waning_crescent"][index] };
}

/** How the pressure is moving over the last three hours at index `at`: rising, falling or steady (a change of a hectopascal or more). */
export function pressureTrend(pressure: Series, at: number): "rising" | "falling" | "steady" | null {
  const now = pressure[at], before = pressure[at - 3];
  if (now === null || now === undefined || before === null || before === undefined) return null;
  const change = now - before;
  return change >= 1 ? "rising" : change <= -1 ? "falling" : "steady";
}

/** The local time of a place as the ISO text Open-Meteo uses ("2026-10-01T21:00"), from the moment and the place's offset from UTC. */
export function localIso(nowMs: number, utcOffsetSeconds: number): string {
  return new Date(nowMs + utcOffsetSeconds * 1000).toISOString().slice(0, 16);
}

/** The index of the first hour that has not ended at the place's local time `iso`. */
export function hourIndex(times: readonly string[], iso: string): number {
  const hour = iso.slice(0, 13);
  const at = times.findIndex(time => time.slice(0, 13) >= hour);
  return at < 0 ? Math.max(0, times.length - 1) : at;
}

/** The rain of the next hour from the 15-minute forecast: the millimetres, the first quarter that wets, and whether it is raining now. */
export function nextHourRain(minutely: Minutely, iso: string): { mm: number; start: string | null; raining: boolean; known: boolean } {
  const quarter = iso.slice(0, 14) + String(Math.floor(Number(iso.slice(14, 16)) / 15) * 15).padStart(2, "0");   // the quarter of an hour that is running
  const from = minutely.time.findIndex(time => time >= quarter);
  if (from < 0 || minutely.precip.slice(from, from + 4).every(value => value === null)) return { mm: 0, start: null, raining: false, known: false };
  const steps = minutely.precip.slice(from, from + 4);
  const mm = Math.round(steps.reduce<number>((sum, value) => sum + (value ?? 0), 0) * 10) / 10;
  const first = steps.findIndex(value => (value ?? 0) >= 0.1);
  return { mm, start: first < 0 ? null : minutely.time[from + first] ?? null, raining: first === 0, known: true };
}

export type Warning = { id: string; level: "watch" | "warning"; key: string; value: number; at: string };
/**
 * What the forecast of the next two days implies, by plain thresholds (these are not an official warning service): heavy rain, strong gusts, heat, cold, snow, thunderstorms,
 * freezing rain, fog and extreme UV. Each is reported once, with the worst value and when it is expected.
 */
export function warnings(forecast: Forecast, fromIndex: number, hours = 48): Warning[] {
  const h = forecast.hourly, to = Math.min(h.time.length, fromIndex + hours), found = new Map<string, Warning>();
  const note = (id: string, level: Warning["level"], key: string, value: number, at: string, worse: boolean) => {
    const existing = found.get(id);
    if (!existing || (worse && value > existing.value) || (!worse && value < existing.value)) found.set(id, { id, level, key, value, at });
  };
  for (let i = fromIndex; i < to; i += 1) {
    const at = h.time[i], rain = h.precip[i], gust = h.windGust[i], temp = h.apparent[i] ?? h.temperature[i], snow = h.snowfall[i], code = h.code[i], visibility = h.visibility[i], uv = h.uv[i];
    if (rain !== null && rain !== undefined && rain >= 10) note("rain", rain >= 20 ? "warning" : "watch", rain >= 20 ? "w_rain_violent" : "w_rain_heavy", rain, at, true);
    if (gust !== null && gust !== undefined && gust >= 70) note("wind", gust >= 90 ? "warning" : "watch", gust >= 90 ? "w_wind_storm" : "w_wind_strong", gust, at, true);
    if (temp !== null && temp !== undefined) {
      if (temp >= 36) note("heat", temp >= 40 ? "warning" : "watch", temp >= 40 ? "w_heat_extreme" : "w_heat", temp, at, true);
      if (temp <= -5) note("cold", temp <= -10 ? "warning" : "watch", temp <= -10 ? "w_cold_extreme" : "w_cold", temp, at, false);
    }
    if (snow !== null && snow !== undefined && snow >= 1) note("snow", snow >= 3 ? "warning" : "watch", snow >= 3 ? "w_snow_heavy" : "w_snow", snow, at, true);
    if (code !== null && code !== undefined) {
      if (code >= 95) note("thunder", code >= 96 ? "warning" : "watch", code >= 96 ? "w_thunder_hail" : "w_thunder", code, at, true);
      if (code === 56 || code === 57 || code === 66 || code === 67) note("ice", "warning", "w_freezing_rain", code, at, true);
    }
    if (visibility !== null && visibility !== undefined && visibility < 500 && (code === 45 || code === 48)) note("fog", visibility < 200 ? "warning" : "watch", visibility < 200 ? "w_fog_dense" : "w_fog", visibility, at, false);
    if (uv !== null && uv !== undefined && uv >= 11) note("uv", "watch", "w_uv_extreme", uv, at, true);
  }
  return [...found.values()].sort((a, b) => Number(b.level === "warning") - Number(a.level === "warning") || a.at.localeCompare(b.at));
}

/** A duration in seconds as hours and minutes ("12 h 34 min" without the words: 12:34). */
export function clock(seconds: number | null): string {
  if (seconds === null) return "";
  const minutes = Math.round(seconds / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}
