/**
 * What the Weather menu asks of the Internet, and of whom: Open-Meteo (the forecast, the air quality and pollen, and the search of a place by name; no key, the data is CC BY 4.0), RainViewer (the
 * rain radar of the last two hours) and EUMETSAT (the infrared image of the clouds from the Meteosat satellite), plus the tiles of Esri's base map. Nothing is asked until the person turns the
 * menu on, and what leaves is only the coordinates of the place they chose. The addresses are listed in one place so that the page's security policy allows exactly these.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { parseAirQuality, parseForecast, parsePlaces, parseRadarFrames, type AirQuality, type Forecast, type Frame, type Place } from "./model";

export const FORECAST_API = "https://api.open-meteo.com";
export const GEOCODING_API = "https://geocoding-api.open-meteo.com";
export const AIR_QUALITY_API = "https://air-quality-api.open-meteo.com";
export const RADAR_API = "https://api.rainviewer.com";
export const RADAR_TILES = "https://tilecache.rainviewer.com";
export const SATELLITE_WMS = "https://view.eumetsat.int";
export const BASE_MAP_TILES = "https://server.arcgisonline.com";
/** What the security policy of the page has to allow for this menu: the origins it may talk to (connect) and the ones it may take images from (img). */
export const WEATHER_ORIGINS = { connect: [FORECAST_API, GEOCODING_API, AIR_QUALITY_API, RADAR_API], img: [RADAR_TILES, SATELLITE_WMS, BASE_MAP_TILES] } as const;

const CURRENT = "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m";
const HOURLY = "temperature_2m,apparent_temperature,precipitation_probability,precipitation,snowfall,weather_code,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,wind_gusts_10m,wind_direction_10m,relative_humidity_2m,dew_point_2m,pressure_msl,uv_index,cape,freezing_level_height,is_day";
const DAILY = "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,sunshine_duration,uv_index_max,precipitation_sum,rain_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant";
const AIR = "european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen";

const coords = (place: Place) => `latitude=${place.latitude}&longitude=${place.longitude}`;
export const forecastUrl = (place: Place): string =>
  `${FORECAST_API}/v1/forecast?${coords(place)}&timezone=auto&forecast_days=10&forecast_minutely_15=8&wind_speed_unit=kmh&current=${CURRENT}&minutely_15=precipitation&hourly=${HOURLY}&daily=${DAILY}`;
export const airQualityUrl = (place: Place): string => `${AIR_QUALITY_API}/v1/air-quality?${coords(place)}&timezone=auto&current=${AIR}`;
export const geocodingUrl = (query: string, language: string): string => `${GEOCODING_API}/v1/search?name=${encodeURIComponent(query.trim().slice(0, 80))}&count=8&language=${encodeURIComponent(language)}&format=json`;
export const RADAR_INDEX = `${RADAR_API}/public/weather-maps.json`;

/** The tiles of one radar frame, in the form Leaflet takes: 256 pixel tiles, colour scheme 2, smoothed, with snow coloured. */
export const radarTileTemplate = (host: string, frame: Frame, color = 2): string => `${host}${frame.path}/256/{z}/{x}/{y}/${color}/1_1.png`;
// Esri's dark grey canvas (no key): the base, and the names of places to lay over the radar.
export const BASE_MAP_TEMPLATE = `${BASE_MAP_TILES}/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
export const LABELS_TEMPLATE = `${BASE_MAP_TILES}/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`;
/** The infrared image of the clouds (Meteosat, 10.5 micrometres: the brighter, the colder and so the higher the cloud top) for a box of the map, as a picture. */
export function satelliteImageUrl(box: { south: number; west: number; north: number; east: number }, width: number, height: number): string {
  const round = (value: number) => Math.round(value * 1e4) / 1e4;
  const bbox = [box.south, box.west, box.north, box.east].map(round).join(",");   // WMS 1.3.0 with EPSG:4326 lists latitude first
  return `${SATELLITE_WMS}/geoserver/ows?service=WMS&version=1.3.0&request=GetMap&layers=mtg_fd:ir105_hrfi&styles=&format=image/png&crs=EPSG:4326&bbox=${bbox}&width=${Math.round(width)}&height=${Math.round(height)}`;
}

export async function getJson(url: string, signal?: AbortSignal, timeoutMs = 12000): Promise<unknown> {
  const timeout = new AbortController(), timer = setTimeout(() => timeout.abort(), timeoutMs);
  const abort = () => timeout.abort();
  signal?.addEventListener("abort", abort);
  try {
    const response = await fetch(url, { signal: timeout.signal, headers: { Accept: "application/json" }, credentials: "omit", referrerPolicy: "no-referrer" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}

export const loadForecast = async (place: Place, signal?: AbortSignal): Promise<Forecast> => {
  const forecast = parseForecast(await getJson(forecastUrl(place), signal));
  if (!forecast) throw new Error("not a forecast");
  return forecast;
};
export const loadAirQuality = async (place: Place, signal?: AbortSignal): Promise<AirQuality | null> => parseAirQuality(await getJson(airQualityUrl(place), signal));
export const searchPlaces = async (query: string, language: string, signal?: AbortSignal): Promise<Place[]> => query.trim().length < 2 ? [] : parsePlaces(await getJson(geocodingUrl(query, language), signal));
export const loadRadarFrames = async (signal?: AbortSignal) => parseRadarFrames(await getJson(RADAR_INDEX, signal));
