#!/usr/bin/env node
/**
 * Takes the screenshots of the README: Studio in a real browser (headless Microsoft Edge) against a real ARMOR-SERVER started on this computer in a throw-away folder,
 * fed with made-up data (a site drawn here, two radar nodes, a solar system and an electrical node played by ARMOR-SIMULATOR, one alarm panel). Nothing real is behind them.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 *
 *   npm run build                                Studio built (dist/), and ARMOR-SERVER built next to it (npm ci && npm run build)
 *   node tools/make_screenshots.mjs              writes images/screenshots/<name>.png at 1920x1080
 *   node tools/make_screenshots.mjs --out DIR    writes them in DIR instead, to look at them before they replace the ones in the repository
 *
 * It needs Edge (the one Windows has), Python 3.11+ for ARMOR-SIMULATOR, and Playwright, which it takes from e2e/node_modules (cd e2e && npm ci).
 * It takes no mouse or keyboard of the desktop: the browser has no window. Everything it starts is stopped at the end and its folder is deleted.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const studio = path.resolve(here, "..");
const root = path.resolve(studio, "..");
const serverDir = process.env.ARMOR_SERVER_DIR ?? path.join(root, "ARMOR-SERVER");
const simulatorDir = process.env.ARMOR_SIMULATOR_DIR ?? path.join(root, "ARMOR-SIMULATOR");
const require = createRequire(path.join(studio, "e2e", "package.json"));
const { chromium } = require("@playwright/test");
const outIndex = process.argv.indexOf("--out");
const out = path.resolve(outIndex > 0 ? process.argv[outIndex + 1] : path.join(studio, "images", "screenshots"));
fs.mkdirSync(out, { recursive: true });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const freePort = () => new Promise(resolve => { const probe = net.createServer(); probe.listen(0, "127.0.0.1", () => { const { port } = probe.address(); probe.close(() => resolve(port)); }); });
const secret = () => crypto.randomBytes(24).toString("base64url");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "armor-shots-"));
const children = [];
const start = (command, args, options) => { const child = spawn(command, args, { stdio: "ignore", ...options }); children.push(child); return child; };

// ---- the made-up site: a plot with a house and a workshop, a gate, a fence, trees and the two radars that watch it
const feature = (id, kind, x, y, width, depth, height, extra = {}) => ({ id, kind, x, y, z: 0, width, depth, height, rotation: 0, slope: 0, ...extra });
const SITE = {
  schema: "armor-studio/site/1",
  dimensions: { width: 59, depth: 40, height: 3 },
  terrain: { points: [{ x: 4, y: 4 }, { x: 54, y: 3 }, { x: 56, y: 31 }, { x: 30, y: 37 }, { x: 4, y: 33 }] },
  buildings: [
    { id: "building-01", name: "House", points: [{ x: 10, y: 9 }, { x: 24, y: 9 }, { x: 24, y: 19 }, { x: 10, y: 19 }], base: 0, floors: [3, 3], roof: { style: "gable", slope: 0.35, overhang: 0.4, ridge: 0 }, thickness: 0.25 },
    { id: "building-02", name: "Workshop", points: [{ x: 38, y: 8 }, { x: 46, y: 8 }, { x: 46, y: 14 }, { x: 38, y: 14 }], base: 0, floors: [3], roof: { style: "flat", slope: 0, overhang: 0.2, ridge: 0 }, thickness: 0.2 },
  ],
  openings: [],
  roofItems: [
    { id: "solar-01", buildingId: "building-01", kind: "solar", x: 14, y: 12, width: 1.7, depth: 1, height: 0.06, rotation: 0, tilt: 0 },
    { id: "solar-02", buildingId: "building-01", kind: "solar", x: 16, y: 12, width: 1.7, depth: 1, height: 0.06, rotation: 0, tilt: 0 },
    { id: "chimney-01", buildingId: "building-01", kind: "chimney", x: 20, y: 11, width: 0.6, depth: 0.6, height: 1.2, rotation: 0, tilt: 0 },
  ],
  wallLamps: [],
  features: [
    feature("lamp-01", "lamp", 27, 10, 0.12, 0.12, 5), feature("lamp-02", "lamp", 49, 18, 0.12, 0.12, 5),
    feature("path-01", "path", 17, 22, 1.4, 6, 0.04), feature("road-01", "road", 30, 34, 4, 46, 0.03, { rotation: 90 }),
    feature("tree-01", "tree", 6, 26, 4, 4, 6, { style: "oak" }), feature("tree-02", "tree", 44, 24, 3.4, 3.4, 7, { style: "pine" }), feature("tree-03", "tree", 29, 24, 3, 3, 5.5, { style: "oak" }),
    feature("gate-01", "gate", 30, 33.5, 4.6, 0.6, 2.5, { style: "iron" }),
    feature("fence-01", "fence", 17, 34.2, 22, 0.08, 1.2, { rotation: 2, style: "picket" }), feature("fence-02", "fence", 43, 33, 24, 0.08, 1.2, { rotation: -10, style: "picket" }),
    feature("mast-01", "mast", 50, 28, 0.25, 0.25, 9),
  ],
  // x and y are percentages of the plot (y from the top, so the north of the plot is the small y); heading is in degrees, 90 faces north (up on the plan) and 270 south
  sensors: [{ id: "sensor-01", name: "North radar", kind: "LD2450", x: 46, y: 16, heading: 270, tilt: 10, z: 2.4, node: "north-1" }, { id: "sensor-02", name: "South radar", kind: "LD2450", x: 52, y: 74, heading: 90, tilt: 10, z: 2.4, node: "south-1" }],
  placements: [],
  cameraPlacements: {},
};

const serverPort = await freePort();
const studioPort = await freePort();
const visionPort = await freePort();
const ingest = secret();
const password = secret();
const visionToken = secret();
const visionDir = process.env.ARMOR_VISION_DIR ?? path.join(root, "ARMOR-VISION");
const summaryAiDir = process.env.ARMOR_SERVER_AI_DIR ?? path.join(root, "ARMOR-SERVER-AI");
let browser;
try {
  const origin = `http://127.0.0.1:${studioPort}`;
  const base = `http://127.0.0.1:${serverPort}`;
  const data = path.join(work, "data");
  fs.mkdirSync(data);
  const python = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");
  // the live vision service (ARMOR-VISION) on a made-up camera: it plays its own scene, so the activity heat map has something to show
  const visionFiles = path.join(work, "vision");
  fs.mkdirSync(visionFiles);
  fs.writeFileSync(path.join(visionFiles, "zones.json"), JSON.stringify({ cameras: { "cam-front": { motion_threshold: 25, motion_min_cells: 2, zones: [{ id: "drive", name: "Driveway", kind: "alert", labels: ["person"], min_frames: 3, min_seconds: 1.0, points: [[0.3, 0.6], [0.9, 0.6], [0.9, 1.0], [0.3, 1.0]] }], masks: [] } }, profiles: { away: ["drive"], home: [] } }));
  fs.writeFileSync(path.join(visionFiles, "activity.json"), JSON.stringify({ enabled: true, heatmap: { cols: 32, rows: 18, window_seconds: 300, half_life_seconds: null, slices: 60, max_cells: 4096, position: "foot", labels: [] }, events: { dwell_seconds: 3.0, loiter_seconds: 6.0, loiter_radius: 0.05, lost_seconds: 2.0, labels: [], lines: [{ id: "gate", a: [0.3, 0.7], b: [0.9, 0.7] }] } }));
  fs.writeFileSync(path.join(visionFiles, "service.json"), JSON.stringify({ host: "127.0.0.1", port: visionPort, allow_remote: false, max_body_bytes: 65536, max_detections: 64, max_query_bytes: 512, token_file: null, simulate: { camera_id: "cam-front" } }));
  start(python, ["-m", "armor_vision", "serve", "--activity-config", path.join(visionFiles, "activity.json"), "--config", path.join(visionFiles, "zones.json"), "--service-config", path.join(visionFiles, "service.json")], { cwd: visionDir, env: { ...process.env, PYTHONPATH: "src", ARMOR_VISION_SERVICE_TOKEN: visionToken } });
  // the settings of the summary of a day (ARMOR-SERVER-AI) with the switch on; the server also has to be told to allow it (below)
  const summaryConfig = path.join(work, "daily_summary.json");
  fs.writeFileSync(summaryConfig, JSON.stringify({ ...JSON.parse(fs.readFileSync(path.join(summaryAiDir, "docs", "daily_summary.example.json"), "utf8")), enabled: true }));
  start(process.execPath, ["dist/server.mjs"], {
    cwd: serverDir,
    env: {
      ...process.env, ARMOR_HOST: "127.0.0.1", ARMOR_PORT: String(serverPort), ARMOR_DATA_DIR: data, ARMOR_TZ: "UTC", ARMOR_INGEST_TOKEN: ingest, ARMOR_CONTROL_TOKEN: secret(), ARMOR_OPERATOR_TOKEN: secret(),
      ARMOR_STUDIO_USERNAME: "admin", ARMOR_STUDIO_PASSWORD: password, ARMOR_STUDIO_ORIGIN: origin,
      ARMOR_VISION_SERVICE_URL: `http://127.0.0.1:${visionPort}`, ARMOR_VISION_SERVICE_TOKEN: visionToken, ARMOR_PYTHON: python, ARMOR_DAILY_SUMMARY_AI_DIR: summaryAiDir, ARMOR_DAILY_SUMMARY_CONFIG: summaryConfig,
    },
  });
  start(process.execPath, ["tools/serve.mjs"], { cwd: studio, env: { ...process.env, ARMOR_STUDIO_HOST: "127.0.0.1", ARMOR_STUDIO_PORT: String(studioPort), ARMOR_SERVER_ORIGIN: base } });
  for (let tries = 0; tries < 80; tries += 1) { try { await fetch(base + "/api/v1/studio/session"); await fetch(origin + "/healthz"); break; } catch { await sleep(250); } }

  const login = await fetch(base + "/api/v1/studio/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password }) });
  if (login.status !== 201) throw new Error(`the sign-in of the throw-away server returned ${login.status}`);
  const cookie = (login.headers.getSetCookie()[0] ?? "").split(";")[0];
  const api = (method, route, body, token) => fetch(base + route, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : { cookie, "X-Requested-With": "armor" }) }, body: body === undefined ? undefined : JSON.stringify(body) });

  // the site
  const current = await (await api("GET", "/api/v1/site")).json();
  const saved = await api("PUT", "/api/v1/site", { site: SITE, revision: current.revision ?? 0 });
  if (!saved.ok) throw new Error(`the site was refused: ${saved.status} ${await saved.text()}`);

  // the nodes: two radar nodes, a solar system and an electrical node, played by the simulator (it keeps sending while the screenshots are taken)
  const play = (node, scenario, extra = []) => start(python, ["-m", "armor_simulator",
    "--node-id", node, "--scenario", scenario, "--count", "1200", "--interval-ms", "300", "--health-every", "5", "--light", "cycle", "--server-url", base, "--ingest-token", ingest, "--start-ms", String(Date.now()), ...extra], { cwd: simulatorDir, env: { ...process.env, PYTHONPATH: "src" } });
  play("north-1", "patrol", ["--solar", "--electrical"]);
  play("south-1", "crossing", ["--seed", "7"]);

  // the alarm panel (kept fresh while the screenshots are taken)
  const panel = (phase) => ({
    kind: "alarm", node_id: "alarm-1", timestamp_ms: Date.now(), phase, mode: phase === "disarmed" ? "disarmed" : "away", siren: false, locked_out: false, commands_enabled: true,
    zones: [
      { id: "front-door", name: "Front door", kind: "entry", state: "normal", bypassed: false }, { id: "window", name: "Living room window", kind: "instant", state: "normal", bypassed: false },
      { id: "hall-motion", name: "Hall motion", kind: "interior", state: "normal", bypassed: false }, { id: "smoke", name: "Kitchen smoke", kind: "always", state: "normal", bypassed: false },
    ],
    open_zones: [], events: [{ ago_s: 640, kind: "armed" }, { ago_s: 95, kind: "disarmed" }],
  });
  const keepPanel = async () => { const reply = await api("POST", "/api/v1/alarm/state", panel("armed"), ingest); if (reply.status !== 202) throw new Error(`the alarm panel was refused: ${reply.status} ${await reply.text()}`); };
  await keepPanel();
  await sleep(6000);

  // Edge on Windows by default; ARMOR_SHOTS_CHANNEL=chromium takes the Chromium that Playwright installs (a runner without Edge)
  const channel = process.env.ARMOR_SHOTS_CHANNEL ?? "msedge";
  browser = await chromium.launch(channel === "chromium" ? { headless: true } : { channel, headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, locale: "en-US" });
  const page = await context.newPage();
  await page.addInitScript(() => { try { window.localStorage.setItem("armor-studio-prefs-v1", JSON.stringify({ tutorial: false, tourAutoStart: false, assistant: false, assistantAutoOpen: false, ...(window.localStorage.getItem("armor-shots-aids") === "1" ? { designAids: true } : {}) })); window.localStorage.setItem("armor-studio-settings-v1", JSON.stringify({ language: "en" })); } catch { /* storage blocked */ } });
  await page.goto(origin + "/");
  await page.getByTestId("login-user").fill("admin");
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.locator(".sidebar").waitFor();
  const open = async label => { await page.locator(".sidebar nav button:not(.nav-group-title)").filter({ hasText: new RegExp(label, "i") }).first().evaluate(element => element.click()); await page.waitForTimeout(2500); };
  // the clock of the status bar shows today's date: only the time stays in the pictures
  const hideDate = () => page.evaluate(() => { for (const element of document.querySelectorAll("footer *, .statusbar *, .status-bar *, [class*=clock] *, [class*=clock]")) if (element.children.length === 0 && /(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})|([A-Za-z]{3}\s+\d{1,2},\s*\d{4})/.test(element.textContent ?? "")) element.style.visibility = "hidden"; });
  const shot = async (file, label) => { await keepPanel(); await open(label); await hideDate(); await page.screenshot({ path: path.join(out, file + ".png") }); console.log("wrote", path.join(out, file + ".png")); };

  await shot("overview", "Overview");
  await shot("radar", "Radar");
  await shot("inverters", "Inverters");
  await shot("site-designer", "Site designer");
  // the Electrical Designer starts from the ready example of a house
  await open("Electrical Designer");
  const example = page.getByRole("button", { name: /example/i }).first();
  if (await example.count()) { await example.click(); await page.waitForTimeout(1500); }
  await page.mouse.move(1000, 600); await page.keyboard.press("f"); await page.mouse.move(1750, 900); await page.waitForTimeout(1500); await hideDate();   // fit the drawing, and take the pointer off the buttons so no tip covers it
  await page.screenshot({ path: path.join(out, "electrical-designer.png") }); console.log("wrote", path.join(out, "electrical-designer.png"));
  await shot("alarm-panels", "Alarm panels");

  // ---- the newer windows: the summary of a day and the heat map, the coverage check with floor-plan templates, the arming modes and a false alarm
  const turnOn = await api("PUT", "/api/v1/security/settings", { "summary.daily": true, "vision.heatmap": true, "alarm.arming_modes": true });
  if (!turnOn.ok) throw new Error(`the options were refused: ${turnOn.status} ${await turnOn.text()}`);
  const camera = await api("POST", "/api/v1/cameras/configure", { id: "cam-front", name: "Front camera", host: "192.0.2.10" });
  if (!camera.ok) throw new Error(`the camera was refused: ${camera.status} ${await camera.text()}`);
  // one alarm is said to have been a false one, so the summary has something to count
  let firstAlarm;
  for (let tries = 0; tries < 24 && !firstAlarm; tries += 1) { const list = await (await api("GET", "/api/v1/alarms")).json(); firstAlarm = (list.alarms ?? list)[0]; if (!firstAlarm) await sleep(5000); }
  await sleep(8000);   // the vision service plays its scene meanwhile
  await page.evaluate(() => { try { window.localStorage.setItem("armor-shots-aids", "1"); } catch { /* storage blocked */ } });
  await page.reload();
  await page.locator(".sidebar").waitFor();
  await page.addStyleTag({ content: "input[type=date]::-webkit-datetime-edit { color: transparent; }" });
  const take = async name => { await page.mouse.move(1000, 1040); await page.waitForTimeout(600); await hideDate(); await page.screenshot({ path: path.join(out, name + ".png") }); console.log("wrote", path.join(out, name + ".png")); };

  await keepPanel(); await open("Alarms");
  await page.getByRole("button", { name: /^false alarm$/i }).first().click();
  await page.waitForTimeout(1500);
  await take("false-alarm");

  await keepPanel(); await open("History");
  await page.getByRole("tab", { name: /reports/i }).or(page.getByRole("button", { name: /^reports$/i })).first().click();
  await page.getByTestId("rep-summary-show").click();
  await page.getByTestId("rep-summary-result").waitFor({ timeout: 30000 });
  await take("history-summary");
  await page.getByTestId("rep-heatmap-show").click();
  await page.getByTestId("rep-heatmap-result").waitFor({ timeout: 30000 });
  await page.getByTestId("rep-heatmap-result").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await take("history-heatmap");

  await keepPanel(); await open("Site designer");
  await page.getByRole("button", { name: /^coverage$/i }).first().click();
  await page.waitForTimeout(2500);
  const templatePick = page.getByLabel(/floor-plan templates/i).first();
  if (await templatePick.count()) { await templatePick.selectOption({ index: 0 }); await page.getByRole("button", { name: /add to the plan/i }).first().click(); await page.waitForTimeout(2500); }
  await take("coverage-floors");

  await keepPanel(); await open("Alarm Designer");
  await page.getByTestId("ad-tab-modes").click();
  await page.waitForTimeout(1500);
  await take("arming-modes");

  // the starting points of the Alarm Designer (a flat, a shop, a warehouse with a perimeter): the first one is put on the sheet
  await keepPanel(); await open("Alarm Designer");
  const alarmTemplates = page.locator("select.ed-templates").first();
  if (await alarmTemplates.count()) {
    await alarmTemplates.selectOption({ index: 1 });
    await page.waitForTimeout(1200);
    const sure = page.locator("[role=dialog] button, [role=alertdialog] button").filter({ hasText: /^(ok|yes|confirm|accept|continue|clear)/i }).first();
    if (await sure.count()) await sure.click();
    await page.waitForTimeout(2000);
  }
  await take("alarm-templates");

  // the card that says whether the programs of the machine can be updated from the phone (Configuration > Updates); it only shows, the switches live in the server
  await keepPanel(); await open("Configuration");
  await page.getByRole("tab", { name: /^updates$/i }).or(page.getByRole("button", { name: /^updates$/i })).first().click();
  await page.getByTestId("machine-update-card").waitFor({ timeout: 30000 });
  await page.getByTestId("machine-update-card").scrollIntoViewIfNeeded();
  await page.addStyleTag({ content: ".alarm-popups { display: none !important; }" });   // the pop-ups of the simulated nodes would cover the card
  await page.waitForTimeout(1500);
  await take("machine-update");

} finally {
  await browser?.close();
  for (const child of children) try { child.kill(); } catch { /* already gone */ }
  await sleep(500);
  fs.rmSync(work, { recursive: true, force: true });
}
