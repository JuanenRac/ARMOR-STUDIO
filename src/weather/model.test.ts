import { describe, expect, it } from "vitest";
import { aqiBand, compass, dewPoint, hourIndex, localIso, moonPhase, nextHourRain, parseAirQuality, parseForecast, parsePlace, parsePlaces, parseRadarFrames, pollenBand, pressureTrend, uvBand, warnings, weatherCode, windBand, type Forecast } from "./model";

const sample = {
  latitude: 40.4, longitude: -3.7, elevation: 650, timezone: "Europe/Madrid", utc_offset_seconds: 7200,
  current: { time: "2026-10-01T21:30", temperature_2m: 18.4, apparent_temperature: 17.9, relative_humidity_2m: 60, is_day: 0, precipitation: 0, rain: 0, showers: 0, snowfall: 0, weather_code: 3, cloud_cover: 90, pressure_msl: 1015.2, wind_speed_10m: 12, wind_direction_10m: 270, wind_gusts_10m: 25 },
  minutely_15: { time: ["2026-10-01T21:30", "2026-10-01T21:45", "2026-10-01T22:00", "2026-10-01T22:15", "2026-10-01T22:30"], precipitation: [0, 0, 0.4, 1.1, 0.2] },
  hourly: { time: ["2026-10-01T20:00", "2026-10-01T21:00", "2026-10-01T22:00", "2026-10-01T23:00"], temperature_2m: [19, 18, 17, 16], precipitation: [0, 0, 12, 22], wind_gusts_10m: [20, 25, 75, 95], weather_code: [3, 3, 65, 96], apparent_temperature: [19, 18, 17, 16], pressure_msl: [1014, 1015, 1016, 1017], snowfall: [0, 0, 0, 0], visibility: [20000, 20000, 20000, 20000], uv_index: [0, 0, 0, 0] },
  daily: { time: ["2026-10-01"], weather_code: [3], temperature_2m_max: [24], temperature_2m_min: [12], sunrise: ["2026-10-01T07:50"], sunset: ["2026-10-01T19:40"] },
};

describe("the weather model", () => {
  it("reads a forecast value by value and leaves what is missing empty", () => {
    const forecast = parseForecast(sample)!;
    expect(forecast.timezone).toBe("Europe/Madrid"); expect(forecast.current?.temperature).toBe(18.4); expect(forecast.current?.isDay).toBe(false);
    expect(forecast.hourly.temperature).toEqual([19, 18, 17, 16]); expect(forecast.hourly.cloudLow).toEqual([]);
    expect(parseForecast({})).toBeNull(); expect(parseForecast(null)).toBeNull(); expect(parseForecast("x")).toBeNull();
    expect(parseForecast({ latitude: 1, longitude: 2, hourly: { temperature_2m: [1, "x", null, NaN] } })!.hourly.temperature).toEqual([1, null, null, null]);
  });
  it("reads the air quality and the pollen", () => {
    const air = parseAirQuality({ current: { time: "t", european_aqi: 35, pm10: 12.5, pm2_5: 6, ozone: 80, birch_pollen: 120, grass_pollen: null } })!;
    expect(air.europeanAqi).toBe(35); expect(air.pollen.birch).toBe(120); expect(air.pollen.grass).toBeNull(); expect(parseAirQuality({})).toBeNull();
  });
  it("reads the radar frames and refuses a strange host or path", () => {
    const parsed = parseRadarFrames({ host: "https://tilecache.rainviewer.com", radar: { past: [{ time: 2, path: "/v2/radar/bbb" }, { time: 1, path: "/v2/radar/aaa" }, { time: 3, path: "/../x" }] } })!;
    expect(parsed.frames.map(frame => frame.time)).toEqual([1, 2]);
    expect(parseRadarFrames({ host: "http://evil.example", radar: { past: [{ time: 1, path: "/v2/radar/a" }] } })).toBeNull();
    expect(parseRadarFrames({ host: "https://x.example", radar: { past: [] } })).toBeNull();
  });
  it("accepts a place only with sane coordinates and a name", () => {
    expect(parsePlace({ name: "Madrid", latitude: 40.4168, longitude: -3.7038, admin1: "Madrid", country: "Spain" })).toEqual({ name: "Madrid", latitude: 40.4168, longitude: -3.7038, region: "Madrid", country: "Spain" });
    expect(parsePlace({ name: "x", latitude: 91, longitude: 0 })).toBeNull(); expect(parsePlace({ name: "", latitude: 1, longitude: 1 })).toBeNull(); expect(parsePlace({ name: "x".repeat(81), latitude: 1, longitude: 1 })).toBeNull();
    expect(parsePlaces({ results: [{ name: "A", latitude: 1, longitude: 2 }, { name: "B", latitude: "x" }] }).map(place => place.name)).toEqual(["A"]); expect(parsePlaces({})).toEqual([]);
  });
  it("says what the code, the wind, the UV and the air quality mean", () => {
    expect(weatherCode(0, true)).toEqual({ key: "clear", icon: "☀️" }); expect(weatherCode(0, false).icon).toBe("🌙"); expect(weatherCode(95).key).toBe("thunder"); expect(weatherCode(null).key).toBe("unknown"); expect(weatherCode(1234).key).toBe("unknown");
    expect([0, 44, 46, 90, 180, 270, 359, 360, 720].map(compass)).toEqual([0, 1, 1, 2, 4, 6, 0, 0, 0]); expect(compass(null)).toBeNull();
    expect([0, 10, 30, 45, 55, 70, 100, 130].map(windBand)).toEqual(["calm", "light", "moderate", "fresh", "strong", "gale", "storm", "hurricane"]);
    expect([1, 4, 7, 9, 12].map(uvBand)).toEqual(["low", "moderate", "high", "very_high", "extreme"]);
    expect([10, 30, 50, 70, 90, 150].map(value => aqiBand(value)?.level)).toEqual([0, 1, 2, 3, 4, 5]); expect(aqiBand(null)).toBeNull();
    expect([0, 5, 30, 100, 500].map(value => pollenBand(value)?.level)).toEqual([0, 1, 2, 3, 4]);
  });
  it("works out the dew point, the moon and the pressure trend", () => {
    expect(dewPoint(20, 50)).toBeCloseTo(9.3, 0); expect(dewPoint(null, 50)).toBeNull();
    const full = moonPhase(new Date(Date.UTC(2026, 9, 26, 12))), news = moonPhase(new Date(Date.UTC(2026, 9, 10, 12)));
    expect(full.key).toBe("full"); expect(full.illumination).toBeGreaterThan(0.9); expect(news.key).toBe("new"); expect(news.illumination).toBeLessThan(0.1);
    expect(pressureTrend([1010, 1010, 1010, 1012], 3)).toBe("rising"); expect(pressureTrend([1015, 1014, 1013, 1012], 3)).toBe("falling"); expect(pressureTrend([1010, 1010, 1010, 1010.5], 3)).toBe("steady"); expect(pressureTrend([1], 0)).toBeNull();
  });
  it("tells the local time of a place and finds the hour in the list", () => {
    expect(localIso(Date.UTC(2026, 9, 1, 19, 30), 7200)).toBe("2026-10-01T21:30");
    expect(hourIndex(sample.hourly.time, "2026-10-01T21:30")).toBe(1); expect(hourIndex(sample.hourly.time, "2026-10-02T01:00")).toBe(3);
  });
  it("tells the rain of the next hour", () => {
    const m = parseForecast(sample)!.minutely;
    const rain = nextHourRain(m, "2026-10-01T21:37");
    expect(rain.known).toBe(true); expect(rain.mm).toBe(1.5); expect(rain.start).toBe("2026-10-01T22:00"); expect(rain.raining).toBe(false);
    expect(nextHourRain({ time: [], precip: [] }, "2026-10-01T21:37").known).toBe(false);
  });
  it("reports what the forecast implies, once each, worst first, and only for the hours ahead", () => {
    const forecast = parseForecast(sample) as Forecast;
    const found = warnings(forecast, 1);
    expect(found.map(item => item.key)).toEqual(expect.arrayContaining(["w_rain_violent", "w_wind_storm", "w_thunder_hail"]));
    expect(found.find(item => item.id === "rain")?.value).toBe(22);
    expect(found[0].level).toBe("warning");
    expect(warnings(forecast, 0, 1).length).toBe(0);   // the first hour alone holds nothing
  });
});
