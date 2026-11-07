import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  airQualityUrl, BASE_MAP_TEMPLATE, forecastUrl, geocodingUrl, getJson, LABELS_TEMPLATE, loadAirQuality, loadForecast, loadRadarFrames, RADAR_INDEX, radarTileTemplate, satelliteImageUrl, searchPlaces, WEATHER_ORIGINS,
} from "./api";
import { axisFor, BarChart, CloudChart, LineChart, niceStep, WindArrow } from "./charts";
import type { Place } from "./model";

const place = { name: "Madrid", latitude: 40.4168, longitude: -3.7038 } as unknown as Place;
const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("the addresses the Weather menu asks, in one place", () => {
  it("name the place only by its coordinates and ask for the metric units", () => {
    const forecast = forecastUrl(place);
    expect(forecast).toContain("https://api.open-meteo.com/v1/forecast?latitude=40.4168&longitude=-3.7038");
    expect(forecast).toContain("wind_speed_unit=kmh");
    expect(forecast).not.toContain("Madrid");
    expect(airQualityUrl(place)).toContain("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=40.4168&longitude=-3.7038");
  });

  it("cut a search to 80 characters, encode it and say the language", () => {
    const url = geocodingUrl("  San José & más  ", "es");
    expect(url).toContain("name=San%20Jos%C3%A9%20%26%20m%C3%A1s&");
    expect(url).toContain("language=es");
    expect(new URL(geocodingUrl("x".repeat(200), "en")).searchParams.get("name")).toHaveLength(80);
  });

  it("allow exactly the origins that are listed, and every address belongs to one of them", () => {
    const allowed = [...WEATHER_ORIGINS.connect, ...WEATHER_ORIGINS.img];
    for (const address of [forecastUrl(place), airQualityUrl(place), geocodingUrl("a", "en"), RADAR_INDEX, radarTileTemplate("https://tilecache.rainviewer.com", { time: 1, path: "/v2/radar/1" } as never), BASE_MAP_TEMPLATE, LABELS_TEMPLATE,
      satelliteImageUrl({ south: 1, west: 2, north: 3, east: 4 }, 100, 50)]) {
      expect(allowed.some(origin => address.startsWith(origin)), address).toBe(true);
    }
  });

  it("build the tile address of one radar frame and the satellite picture of a box, latitude first", () => {
    expect(radarTileTemplate("https://h", { time: 1, path: "/p/1" } as never)).toBe("https://h/p/1/256/{z}/{x}/{y}/2/1_1.png");
    expect(radarTileTemplate("https://h", { time: 1, path: "/p/1" } as never, 6)).toContain("/6/1_1.png");
    const url = satelliteImageUrl({ south: 40.123456, west: -4.5, north: 41, east: -3 }, 640.4, 480.6);
    expect(url).toContain("bbox=40.1235,-4.5,41,-3");
    expect(url).toContain("width=640&height=481");
  });
});

describe("what comes back from the Internet", () => {
  it("is asked without credentials or a referrer, and an answer that is not ok is an error", async () => {
    const fetcher = vi.fn(async () => answer({ ok: true }));
    vi.stubGlobal("fetch", fetcher);
    await expect(getJson("https://api.open-meteo.com/x")).resolves.toEqual({ ok: true });
    const options = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect([options.credentials, options.referrerPolicy]).toEqual(["omit", "no-referrer"]);
    vi.stubGlobal("fetch", vi.fn(async () => answer({}, 503)));
    await expect(getJson("https://api.open-meteo.com/x")).rejects.toThrow("HTTP 503");
  });

  it("gives up after the time it is given", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new Error("aborted"))))));
    const pending = getJson("https://api.open-meteo.com/x", undefined, 50);
    const checked = expect(pending).rejects.toThrow("aborted");
    await vi.advanceTimersByTimeAsync(60);
    await checked;
  });

  it("is cancelled by the caller", async () => {
    const controller = new AbortController();
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new Error("aborted"))))));
    const pending = getJson("https://api.open-meteo.com/x", controller.signal);
    const checked = expect(pending).rejects.toThrow("aborted");
    controller.abort();
    await checked;
  });

  it("refuses an answer that is not a forecast, and a search shorter than two letters asks nothing", async () => {
    const fetcher = vi.fn(async () => answer({ nothing: true }));
    vi.stubGlobal("fetch", fetcher);
    await expect(loadForecast(place)).rejects.toThrow("not a forecast");
    expect(await searchPlaces(" a ", "en")).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reads the places, the air and the radar frames through the parsers, and an answer without them is empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => answer({})));
    expect(await searchPlaces("madrid", "en")).toEqual([]);
    expect(await loadAirQuality(place)).toBeNull();
    expect(await loadRadarFrames()).toBeDefined();
  });
});

describe("the small charts", () => {
  it("choose a round step for the axis", () => {
    expect(niceStep(100)).toBe(20);
    expect(niceStep(10)).toBe(2);
    expect(niceStep(0)).toBeGreaterThan(0);
    expect(niceStep(4)).toBe(1);
  });

  it("make an axis that covers the values, with zero as the floor on request and a minimum span", () => {
    expect(axisFor([3, 17, null])).toEqual({ min: 0, max: 20, step: 5 });
    expect(axisFor([4, 9], true)).toMatchObject({ min: 0 });
    const flat = axisFor([5, 5], false, 2);
    expect(flat.max - flat.min).toBeGreaterThanOrEqual(2);
    const none = axisFor([null, null]);
    expect(none.max).toBeGreaterThan(none.min);
  });

  it("draw a line chart with a gap where a value is missing, a mark for now and no mark when now is out of range", () => {
    const series = [{ values: [1, 2, null, 4, 5] as Array<number | null>, color: "#fff", label: "t", area: true, dashed: true }];
    const html = renderToStaticMarkup(createElement(LineChart, { series, labels: ["a", "", "c", "d", "e"], unit: "°C", now: 2 }));
    expect(html).toContain('class="wx-chart"');
    expect(html.match(/class="wx-line"/g)).toHaveLength(2);
    expect(html).toContain("wx-area");
    expect(html).toContain('stroke-dasharray="4 3"');
    expect(html).toContain("wx-now");
    expect(renderToStaticMarkup(createElement(LineChart, { series, labels: [], unit: "x", now: 99 }))).not.toContain("wx-now");
    expect(renderToStaticMarkup(createElement(LineChart, { series: [], labels: [], unit: "x", now: null }))).toContain("<svg");
  });

  it("draw bars only where there is something, and the line of the chance over them", () => {
    const html = renderToStaticMarkup(createElement(BarChart, { values: [0, 2, null, 5], labels: ["", "b", "", "d"], unit: "mm", now: 1, chance: [10, null, 40, 60] }));
    expect(html.match(/class="wx-bar"/g)).toHaveLength(2);
    expect(html).toContain("#ffd166");
  });

  it("stack the three layers of cloud and skip the empty ones", () => {
    const html = renderToStaticMarkup(createElement(CloudChart, { low: [50, 0], mid: [20, null], high: [10, 30], labels: ["a", "b"], now: null }));
    expect(html.match(/class="wx-bar"/g)).toHaveLength(4);
  });

  it("turn the arrow of the wind to where it goes, and draw nothing without a direction", () => {
    expect(renderToStaticMarkup(createElement(WindArrow, { degrees: 90 }))).toContain("rotate(270deg)");
    expect(renderToStaticMarkup(createElement(WindArrow, { degrees: null }))).toBe("");
  });
});
