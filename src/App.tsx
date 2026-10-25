/**
 * A.R.M.O.R. Studio operational console.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D)
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { downloadText } from "./download";
import { ConfirmHost } from "./askConfirm";
import { ElevationHost } from "./ElevationHost";
import { useAlarmAnnouncer } from "./alerts/useAlarmAnnouncer";
import { AlarmPopups } from "./alerts/AlarmPopups";
import { PreflightDialog } from "./preflight/PreflightDialog";
import type { RouteContext } from "./alerts/route";
import { getPrefs, openingView, setPrefs, usePrefs } from "./prefs";
import { TourHost } from "./tour/TourHost";
import { RichTooltips } from "./tour/RichTooltips";
import { shouldAutoStart, startTour } from "./tour/tourStore";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { readNodeHealth, acknowledgeAlarm, listMedia, listAlarms, listAutomations, listDevices, listSolar, listElectricalReadings, listAlarmNodes, listNetwork, ApiError, setSystemMode, captureSnapshot, closeStudioSession, discoverCameras, forgetNode, getPreferences, savePreferences, sendPtz, startCameraRecording, stopCameraRecording, studioSessionState, type DiscoveredCamera } from "./api";
import { nodeCensus } from "./nodeCensus";
import { selectionAfterRemoval, upsertCamera } from "./cameras";
import { clearSessionMemory } from "./sessionMemory";
import { rememberUser, setStorageUser } from "./storageScope";
import { cameraCoveringNode } from "./alerts/coverage";
import { useConnectionAnnouncer } from "./alerts/useConnectionAnnouncer";
import { ViewSlot, viewsToDraw } from "./viewSlots";
import { AboutDialog, HelpDialog, PinDialog, Sidebar, StatusBar, TopBar } from "./components/chrome";
import { DesignVersionsDialog } from "./DesignVersionsDialog";
import { SessionUserContext } from "./sessionContext";
import { resolveCapabilities } from "./capabilities";
import { KnownNodesContext } from "./knownNodes";
import { Ticking } from "./components/Ticking";
import { StreamRenewContext } from "./streamContext";
import { CameraFullscreen } from "./components/camera";
import { ElectricalView } from "./views/ElectricalView";
import { AlarmPanelsView } from "./views/AlarmPanelsView";
import { ConfigurationPanel } from "./ConfigurationPanel";
import { CameraSettings } from "./CameraSettings";
import { loadLayout, saveLayout } from "./cameraLayout";
import { DEFAULT_SERVER_ORIGIN, loadDeploymentOrigin } from "./config";
import {
  DEFAULT_THEME, INITIAL_BUILDINGS, INITIAL_CAMERAS, INITIAL_DIMENSIONS, INITIAL_FEATURES, INITIAL_OPENINGS, INITIAL_ROOF_ITEMS, INITIAL_SENSORS, INITIAL_TERRAIN, INITIAL_WALL_LAMPS, LANGUAGES, THEMES,
  type Building, type Camera, type DevicePlacement, type Dimensions, type GridSize, type LanguageCode, type Opening, type RoofItem, type Sensor, type SiteFeature, type Terrain, type Theme, type View, type WallLamp,
} from "./domain";
import { NAV } from "./domain";

const VIEW_ORDER = NAV.map(([key]) => key);
import type { SiteModel } from "./designer/ops";
import { usePolled, useFullscreen, useCameraReachability, useServerCameras, useServerInfo, useRemoteConnection, useServerStatus, useSessionUser, useStreamUrls } from "./hooks";
import { ensureLocale, isLocaleLoaded, text } from "./i18n";
import { HistoryView } from "./HistoryView";
import { MediaLibrary } from "./MediaLibrary";
import { parseStudioSettings, serializeStudioSettings, SETTINGS_KEY, siteExport, type StudioSettings } from "./settings";
import { EMPTY_DESIGN, type Design as ElectricalDesign } from "./electrical/model";
import { electricalAdapter } from "./electrical/useElectricalSync";
import { alarmAdapter } from "./alarm/useAlarmDesignSync";
import { networkAdapter } from "./network/useNetworkSync";
import { loadLocalDesign } from "./useDesignSync";
import { applyElectricalDoc } from "./electrical/sync";
import { useElectricalSync } from "./electrical/useElectricalSync";
import { EMPTY_DESIGN as EMPTY_ALARM_DESIGN, type Design as AlarmDesign } from "./alarm/model";
import { applyAlarmDoc } from "./alarm/sync";
import { useAlarmDesignSync } from "./alarm/useAlarmDesignSync";
import { EMPTY_DESIGN as EMPTY_NETWORK_DESIGN, type Design as NetworkDesign } from "./network/model";
import { applyNetworkDoc } from "./network/sync";
import { useNetworkSync } from "./network/useNetworkSync";
import { NetworkView } from "./views/NetworkView";
import { StudioLogin, loginLanguage } from "./StudioLogin";
import { useSiteSync } from "./useSiteSync";
import { AlarmsView } from "./views/AlarmsView";
import { AutomationsView } from "./views/AutomationsView";
import { DevicesView } from "./views/DevicesView";
import { CameraMonitorView } from "./views/monitoring";
import { OverviewView } from "./views/OverviewView";
import { SystemView } from "./views/SystemView";
import { ServicesView } from "./views/ServicesView";
import { ScreenView } from "./views/ScreenView";
import { RadarView } from "./views/RadarView";
import { InvertersView } from "./views/InvertersView";
import { BatteriesView } from "./views/BatteriesView";
import manifest from "../armor.project.json";
import "./index.css";
import "./camera-layout.css";
import "./nav.css";
import "./compact.css";
import "./hover.css";
import "./dialogs.css";
import "./themes.css";
import "./selects.css";
import "./actionButtons.css";
import "./ui-system.css";
import "./wide-text.css";

const studioVersion = manifest.version;

// The menus that bring the most code (the four designers and the weather map with its own library) are fetched the first time they are opened, so the sign-in is not held back by their code or by
// the language tables.
// The assistant carries everything it knows how to answer, in every language, so it is fetched on its own after the page is drawn.
const Assistant = lazy(() => import("./assistant/Assistant").then(module => ({ default: module.Assistant })));
const SiteDesignerInteractive = lazy(() => import("./SiteDesignerInteractive").then(module => ({ default: module.SiteDesignerInteractive })));
const ElectricalDesigner = lazy(() => import("./ElectricalDesigner").then(module => ({ default: module.ElectricalDesigner })));
const NetworkDesigner = lazy(() => import("./NetworkDesigner").then(module => ({ default: module.NetworkDesigner })));
const AlarmDesigner = lazy(() => import("./AlarmDesigner").then(module => ({ default: module.AlarmDesigner })));
const WeatherView = lazy(() => import("./views/WeatherView").then(module => ({ default: module.WeatherView })));

/** The console talks to ONE server: the address is the outer component's, the one the person signed in to; changing it signs in again. */
function StudioConsole({ origin, setOrigin, onSignOut }: { origin: string; setOrigin: (value: string) => void; onSignOut: () => void }) {
  const [view, setView] = useState<View>(() => openingView(getPrefs()));
  const prefs = usePrefs();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [expandedCameraId, setExpandedCameraId] = useState("");
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [cameras, setCameras] = useState<Camera[]>(INITIAL_CAMERAS);
  const [sensors, setSensors] = useState<Sensor[]>(INITIAL_SENSORS);
  const [terrain, setTerrain] = useState<Terrain>(INITIAL_TERRAIN);
  const [buildings, setBuildings] = useState<Building[]>(INITIAL_BUILDINGS);
  const [openings, setOpenings] = useState<Opening[]>(INITIAL_OPENINGS);
  const [roofItems, setRoofItems] = useState<RoofItem[]>(INITIAL_ROOF_ITEMS);
  const [wallLamps, setWallLamps] = useState<WallLamp[]>(INITIAL_WALL_LAMPS);
  const [features, setFeatures] = useState<SiteFeature[]>(INITIAL_FEATURES);
  const [placements, setPlacements] = useState<DevicePlacement[]>([]);
  const [dimensions, setDimensions] = useState<Dimensions>(INITIAL_DIMENSIONS);
  const [wantsToPlace, setWantsToPlace] = useState("");
  const [electrical, setElectrical] = useState<ElectricalDesign>(EMPTY_DESIGN);
  const [networkDesign, setNetworkDesign] = useState<NetworkDesign>(EMPTY_NETWORK_DESIGN);
  const [alarmDesign, setAlarmDesign] = useState<AlarmDesign>(EMPTY_ALARM_DESIGN);
  const [versionsOf, setVersionsOf] = useState<"site" | "electrical" | "network" | "alarm" | null>(null);
  const sessionUser = useSessionUser(origin);
  setStorageUser(sessionUser.user?.id ?? null);   // before anything below reads or writes what this browser keeps for the person (the same value again is harmless)
  if (sessionUser.user) rememberUser(origin, sessionUser.user.id);
  // What the person may do comes from the server's announcement (an older server sends none, and the role then decides as it always did): see capabilities.ts.
  const capabilities = useMemo(() => resolveCapabilities(sessionUser.user?.role, sessionUser.capabilities), [sessionUser.user?.role, sessionUser.capabilities]);
  const signedIn = sessionUser.user !== null;
  const isAdmin = capabilities.can("administer");
  const isViewer = signedIn && !capabilities.can("operate");
  const cannotArm = signedIn && !capabilities.can("arm");
  const [pendingMode, setPendingMode] = useState<"armed" | "disarmed" | null>(null);
  const [checkOpen, setCheckOpen] = useState(false);
  const [restored, setRestored] = useState(false);
  const savedLayout = useMemo(() => loadLayout(), []);
  const [gridSize, setGridSize] = useState<GridSize>(savedLayout?.gridSize ?? 4);
  const [slots, setSlots] = useState<string[]>(savedLayout?.slots ?? []);
  // The number of views and the camera of each place are kept, so the monitor is as it was left.
  useEffect(() => { saveLayout({ gridSize, slots }); }, [gridSize, slots]);
  const [selectedCamera, setSelectedCamera] = useState("cam-01");
  const [recordingCameraIds, setRecordingCameraIds] = useState<string[]>([]);
  const [discovered, setDiscovered] = useState<DiscoveredCamera[]>([]);
  // The same function for as long as the language is the same: effects that list it among their dependencies (the rules of the history, the evidence library) were run again every second,
  // when the clock of the console draws it anew, and replaced what the person was editing with the copy of the server.
  // Portuguese arrives as a separate file the first time it is chosen: the page is drawn again when it has.
  const [loadedLocales, setLoadedLocales] = useState(0);
  useEffect(() => { if (!isLocaleLoaded(language)) { let live = true; void ensureLocale(language).then(() => { if (live) setLoadedLocales(count => count + 1); }); return () => { live = false; }; } return undefined; }, [language]);
  const t = useCallback((key: string, ...args: Array<string | number>) => args.reduce<string>((value, arg, index) => value.split(`{${index}}`).join(String(arg)), text(language, key)), [language, loadedLocales]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [notice, setNotice] = useState("");

  const { state, connection: connectionState, latencyMs, live: liveChannel, apply: applyState } = useServerStatus(origin, { live: true });
  const remoteConnection = useRemoteConnection(origin, connectionState !== "demo" && sessionUser.user !== null);
  const serverInfo = useServerInfo(origin);
  const { urls: streamUrls, renew: renewStream } = useStreamUrls(origin, cameras);
  const reachability = useCameraReachability(origin);
  const operatorUnlocked = useServerCameras(origin, setCameras);
  const connection = connectionState === "synced" ? t("serverSynchronized") : t("offlineDemo");
  const nodes = useMemo(() => Object.values(state.nodes).sort((a, b) => a.node_id.localeCompare(b.node_id)), [state]);
  const selected = cameras.find(camera => camera.id === selectedCamera) ?? cameras[0];
  const devicePoll = usePolled(() => listDevices(origin), 2500, origin, { always: true });
  const alarmPoll = usePolled(() => listAlarms(origin), 2000, origin, { always: true });
  // Which cameras are recording is the server's to say: after a reload the console has to ask.
  const recordingPoll = usePolled(() => listMedia(origin).then(result => result.activeCameraIds), 15_000, origin, { always: true });
  useEffect(() => { if (recordingPoll.data) setRecordingCameraIds(recordingPoll.data); }, [recordingPoll.data]);
  const automationPoll = usePolled(() => listAutomations(origin), 5000, origin, { always: true });
  const solarPoll = usePolled(() => listSolar(origin), 4000, origin, { always: true });
  const electricalPoll = usePolled(() => listElectricalReadings(origin), 4000, origin, { always: true });
  const alarmNodesPoll = usePolled(() => listAlarmNodes(origin), 3000, origin, { always: true });
  const knownNodes = useMemo(() => ({
    ids: [...nodes.map(node => node.node_id), ...(solarPoll.data?.devices ?? []).map(device => device.node_id), ...(solarPoll.data?.waiting ?? []).map(item => item.node_id), ...(electricalPoll.data?.nodes ?? []).map(item => item.node_id), ...(alarmNodesPoll.data?.nodes ?? []).map(item => item.node_id)],
    ips: nodes.flatMap(node => (node.panel ? [node.panel.ip] : [])),
  }), [nodes, solarPoll.data, electricalPoll.data, alarmNodesPoll.data]);
  const networkPoll = usePolled(() => listNetwork(origin), 5000, origin, { always: true });
  // the count of every kind of node (radar, solar, electrical, alarm, hmi), from the health they report and from the radar stream
  const nodeHealthPoll = usePolled(() => readNodeHealth(origin), 10_000, origin, { always: true });
  const census = useMemo(() => nodeCensus(nodes, nodeHealthPoll.data), [nodes, nodeHealthPoll.data]);
  const devices = devicePoll.data?.devices ?? [];
  const alarms = alarmPoll.data;
  const alertContext = useMemo<RouteContext>(() => ({
    panelNodes: new Set((alarmNodesPoll.data?.nodes ?? []).map(item => item.node_id)),
    solarNodes: new Set([...(solarPoll.data?.devices ?? []).map(item => item.node_id), ...(solarPoll.data?.waiting ?? []).map(item => item.node_id)]),
    electricalNodes: new Set((electricalPoll.data?.nodes ?? []).map(item => item.node_id)),
    cameras: new Set(cameras.map(camera => camera.id)),
    // An intruder seen by a radar opens the camera that sees that radar (from the plan), and the radar's map only when no camera does.
    cameraCovering: (nodeId: string) => cameraCoveringNode(nodeId, sensors, cameras, { x: dimensions.width / 2, y: dimensions.depth / 2 }),
  }), [alarmNodesPoll.data, solarPoll.data, electricalPoll.data, cameras, sensors, dimensions]);
  // says aloud what connects: the sources are what the server last said about each kind (an unread source says nothing)
  const connectionSources = useMemo(() => ({
    node: nodes.map(node => ({ id: node.node_id, name: node.node_id, online: node.online && !node.stale })),
    device: devicePoll.data ? devicePoll.data.devices.map(device => ({ id: device.id, name: device.name, online: device.online })) : null,
    camera: cameras.length > 0 && Object.keys(reachability).length > 0 ? cameras.map(camera => ({ id: camera.id, name: camera.name, online: reachability[camera.id] === "online" })) : null,
    alarm: alarmNodesPoll.data ? alarmNodesPoll.data.nodes.map(node => ({ id: node.node_id, name: node.node_id, online: !node.stale })) : null,
    solar: solarPoll.data ? [...new Set(solarPoll.data.devices.map(device => device.node_id))].map(id => ({ id, name: id, online: solarPoll.data!.devices.some(device => device.node_id === id && !device.stale) })) : null,
    electrical: electricalPoll.data ? electricalPoll.data.nodes.map(node => ({ id: node.node_id, name: node.node_id, online: !node.stale })) : null,
  }), [nodes, devicePoll.data, cameras, reachability, alarmNodesPoll.data, solarPoll.data, electricalPoll.data]);
  useConnectionAnnouncer({ sources: connectionSources, t, language, enabled: connectionState === "synced" });
  const announcer = useAlarmAnnouncer({ alarms: alarmPoll.data, t, language, armed: state.mode === "armed", enabled: true, sound: prefs.alertSound, notification: prefs.alertNotifications, context: alertContext,
    go: target => { if (target.camera) setSelectedCamera(target.camera); setView(target.view); } });
  // the menu the person is in is remembered for "open where I was"; the first visit starts the welcome tour
  useEffect(() => { if (getPrefs().lastView !== view) setPrefs({ lastView: view }); }, [view]);
  useEffect(() => { if (!shouldAutoStart()) return undefined; const timer = window.setTimeout(() => { if (shouldAutoStart()) startTour("welcome"); }, 1400); return () => window.clearTimeout(timer); }, []);
  const alarmsPending = (alarms?.active ?? []).filter(alarm => !alarm.acknowledged_at).length;
  const cameraNames = useMemo(() => Object.fromEntries(cameras.map(camera => [camera.id, camera.name])), [cameras]);

  useEffect(() => {
    document.documentElement.dataset.armorTheme = theme;
    document.documentElement.lang = language;
  }, [theme, language]);

  // Restore the browser-local settings once; anything invalid was already dropped by the parser.
  useEffect(() => {
    let raw: string | null = null;
    try { raw = window.localStorage.getItem(SETTINGS_KEY); } catch { /* Storage may be blocked. */ }
    const saved = parseStudioSettings(raw);
    // The address saved with the settings is NOT applied: the server this person signed in to is the one they are using, not whichever the browser remembers.
    if (saved.theme) setTheme(saved.theme);
    if (saved.language) setLanguage(saved.language);
    if (saved.sidebarOpen !== undefined) setSidebarOpen(saved.sidebarOpen);
    // The plan of the site kept here is the one of the server it was drawn for: a browser that last worked on another installation (the bench, then the house) does not bring that plan to this one.
    if (!saved.origin || saved.origin === origin) {
      if (saved.dimensions) setDimensions(saved.dimensions);
      if (saved.cameras) setCameras(saved.cameras);
      if (saved.sensors) setSensors(saved.sensors);
      if (saved.terrain) setTerrain(saved.terrain);
      if (saved.buildings) setBuildings(saved.buildings);
      if (saved.openings) setOpenings(saved.openings);
      if (saved.roofItems) setRoofItems(saved.roofItems);
      if (saved.wallLamps) setWallLamps(saved.wallLamps);
      if (saved.features) setFeatures(saved.features);
      if (saved.placements) setPlacements(saved.placements);
    }
    // The drawings kept here are the ones of THIS server: the copies carry the address, so another installation's plan is never put in front of this one.
    const savedElectrical = loadLocalDesign(electricalAdapter, origin, electrical);
    if (savedElectrical) setElectrical(savedElectrical);
    const savedNetwork = loadLocalDesign(networkAdapter, origin, networkDesign);
    if (savedNetwork) setNetworkDesign(savedNetwork);
    const savedAlarm = loadLocalDesign(alarmAdapter, origin, alarmDesign);
    if (savedAlarm) setAlarmDesign(savedAlarm);
    setRestored(true);
  }, []);

  // The account's own language and theme, kept on the server, win over whatever this browser remembers locally - so they
  // travel with the person, not with the browser or the address used to reach the server. Left alone when the server has
  // never had them set (a brand new account, or one never migrated from the local-only days), so nothing gets erased.
  useEffect(() => {
    let cancelled = false;
    getPreferences(origin).then(prefs => {
      if (cancelled) return;
      if (prefs.language) setLanguage(prefs.language as LanguageCode);
      if (prefs.theme) setTheme(prefs.theme as Theme);
    }).catch(() => { /* the local fallback stands when the server cannot be asked */ });
    return () => { cancelled = true; };
  }, [origin]);

  const site: SiteModel = useMemo(() => ({ terrain, buildings, openings, roofItems, wallLamps, features, cameras, sensors, placements }), [terrain, buildings, openings, roofItems, wallLamps, features, cameras, sensors, placements]);
  /** The designer hands back a whole model; only the parts that changed are stored again. */
  const design = useMemo(() => ({ dimensions, terrain, buildings, openings, roofItems, wallLamps, features, sensors, placements, cameras }), [dimensions, terrain, buildings, openings, roofItems, wallLamps, features, sensors, placements, cameras]);
  const siteSync = useSiteSync({
    origin, enabled: restored && operatorUnlocked && signedIn, design, onConflict: () => setNotice(t("siteConflict")), onNotice: kind => setNotice(t(kind === "recovered" ? "versionsDraftRecovered" : "versionsDraftNotice")),
    apply: next => { setDimensions(next.dimensions); setTerrain(next.terrain); setBuildings(next.buildings); setOpenings(next.openings); setRoofItems(next.roofItems); setWallLamps(next.wallLamps); setFeatures(next.features); setSensors(next.sensors); setPlacements(next.placements); setCameras(next.cameras); },
  });
  // The three drawings are also kept in this browser (for this server), so they are there when the server is not.
  const electricalStatus = useElectricalSync({ origin, enabled: restored && operatorUnlocked && signedIn, persist: restored && signedIn, design: electrical, apply: setElectrical, onConflict: () => setNotice(t("elConflict")) });
  const networkStatus = useNetworkSync({ origin, enabled: restored && operatorUnlocked && signedIn, persist: restored && signedIn, design: networkDesign, apply: setNetworkDesign, onConflict: () => setNotice(t("elConflict")) });
  const alarmDesignStatus = useAlarmDesignSync({ origin, enabled: restored && operatorUnlocked && signedIn, persist: restored && signedIn, design: alarmDesign, apply: setAlarmDesign, onConflict: () => setNotice(t("elConflict")) });
  const applySite = (next: SiteModel) => {
    if (next.terrain !== site.terrain) setTerrain(next.terrain);
    if (next.buildings !== site.buildings) setBuildings(next.buildings);
    if (next.openings !== site.openings) setOpenings(next.openings);
    if (next.roofItems !== site.roofItems) setRoofItems(next.roofItems);
    if (next.wallLamps !== site.wallLamps) setWallLamps(next.wallLamps);
    if (next.features !== site.features) setFeatures(next.features);
    if (next.cameras !== site.cameras) setCameras(next.cameras);
    if (next.sensors !== site.sensors) setSensors(next.sensors);
    if (next.placements !== site.placements) setPlacements(next.placements);
  };

  const currentSettings = (nextCameras: Camera[] = cameras): StudioSettings => ({ origin, theme, language, sidebarOpen, dimensions, cameras: nextCameras, sensors, terrain, buildings, openings, roofItems, wallLamps, features, placements });
  const persist = (nextCameras: Camera[] = cameras) => {
    try { window.localStorage.setItem(SETTINGS_KEY, serializeStudioSettings(currentSettings(nextCameras))); } catch { /* Storage may be full or blocked. */ }
  };
  const updateCamera = (id: string, update: Partial<Camera>) => setCameras(current => {
    const next = current.map(camera => camera.id === id ? { ...camera, ...update } : camera);
    persist(next); return next;
  });
  const saveSettings = () => { persist(); setNotice(t("preferencesSaved")); };
  // The design is kept as it changes, so closing the tab never loses it.
  useEffect(() => {
    if (!restored) return;
    const timer = window.setTimeout(() => persist(), 700);
    return () => window.clearTimeout(timer);
  }, [restored, terrain, buildings, openings, roofItems, wallLamps, features, sensors, dimensions, cameras, placements]);   // eslint-disable-line react-hooks/exhaustive-deps
  const exportSettings = () => {
    downloadText("armor-studio-site-config.json", siteExport(currentSettings()), "application/json");
    setNotice(t("siteExported"));
  };
  // The question is asked in the page (ConfirmDialog), not with the browser's confirm(): a browser can switch that one off, and then the button did nothing at all.
  const toggleMode = () => setPendingMode(state.mode === "armed" ? "disarmed" : "armed");
  const changeMode = async (next: "armed" | "disarmed", pin?: string) => {
    setPendingMode(null);
    try { applyState(await setSystemMode(origin, next, pin)); setNotice(t(next === "armed" ? "modeArmedNotice" : "modeDisarmedNotice")); }
    catch (error) {
      // Say why: a ended session, a refusal, an error of the server or no answer at all are different things to do something about.
      if (error instanceof ApiError && error.status === 401) { setNotice(t("modeSessionEnded")); sessionUser.refresh(); }
      else if (error instanceof ApiError && (error.code === "wrong_pin" || error.code === "pin_locked" || error.code === "pin_not_set")) setNotice(t(`mode_${error.code}`));
      else if (error instanceof ApiError && error.status === 403) setNotice(t("modeForbidden"));
      else if (error instanceof ApiError) setNotice(t("modeServerError").replace("{status}", String(error.status)));
      else setNotice(t("modeNoAnswer"));
    }
  };
  const fullscreen = useFullscreen(() => setNotice(t("fullscreenUnavailable")));
  const fullScreen = fullscreen.toggle;

  const saveSnapshot = async (camera: Camera) => {
    try { await captureSnapshot(origin, camera.id); setNotice(t("snapshotSaved")); setView("record"); }
    catch { setNotice(t("recordingFailed")); }
  };
  const toggleRecording = async (camera: Camera) => {
    const recording = recordingCameraIds.includes(camera.id);
    try {
      if (recording) { await stopCameraRecording(origin, camera.id); setRecordingCameraIds(current => current.filter(id => id !== camera.id)); setNotice(t("recordingStopped")); setView("record"); }
      else { await startCameraRecording(origin, camera.id); setRecordingCameraIds(current => [...new Set([...current, camera.id])]); setNotice(t("recordingStarted")); }
    } catch { setNotice(t("recordingFailed")); }
  };
  // Commands for one camera go out strictly in order: a "stop" must never overtake the move it ends.
  const ptzQueues = useRef<Record<string, Promise<unknown>>>({});
  const commandPtz = (camera: Camera, command: string): Promise<void> => {
    const previous = ptzQueues.current[camera.id] ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(() => sendPtz(origin, camera.id, command));
    ptzQueues.current[camera.id] = next.catch(() => undefined);
    return next;
  };
  const discoverLocalCameras = async () => {
    setNotice(t("networkDiscovery"));
    try {
      const found = await discoverCameras(origin);
      setDiscovered(found);
      setNotice(found.length ? `${found.length} ${t("camerasFound")}` : t("noCamerasFound"));
    } catch { setNotice(t("discoveryFailed")); }
  };
  const expand = (id: string) => { setSelectedCamera(id); setExpandedCameraId(id); };

  const expandedCamera = cameras.find(camera => camera.id === expandedCameraId);
  const stepExpanded = (offset: number) => {
    const index = expandedCamera ? cameras.findIndex(camera => camera.id === expandedCamera.id) : -1;
    if (!cameras.length || index < 0) return;
    expand(cameras[(index + offset + cameras.length) % cameras.length].id);
  };

  const visitedViews = useRef(new Set<View>());
  const shownPanels = useRef(new Map<View, ReactNode>());
  const panels: Record<View, ReactNode> = {
    overview: <Ticking>{now => <OverviewView t={t} origin={origin} mode={state.mode} toggleMode={toggleMode} demo={connectionState === "demo"} readOnly={cannotArm} nodes={nodes} cameras={cameras} reachability={reachability} devices={devices} alarms={alarms} model={site} dimensions={dimensions} setView={setView} onDevice={() => setView("devices")} now={now} panels={alarmNodesPoll.data ?? null} solar={solarPoll.data ?? null} electrical={electricalPoll.data ?? null} network={networkPoll.data ?? null} census={census} />}</Ticking>,
    alarms: <Ticking>{now => <AlarmsView t={t} origin={origin} alarms={alarms} reload={alarmPoll.reload} devices={devices} cameraNames={cameraNames} mode={state.mode} toggleMode={toggleMode} now={now} isAdmin={isAdmin} readOnly={cannotArm} />}</Ticking>,
    alarmPanels: <Ticking>{now => <AlarmPanelsView openDesigner={() => setView("alarmDesigner")} t={t} origin={origin} nodes={alarmNodesPoll.data ?? null} unreachable={alarmNodesPoll.failed} network={networkPoll.data ?? null} isAdmin={isAdmin} now={now} />}</Ticking>,
    electrical: <Ticking>{now => <ElectricalView isAdmin={isAdmin} openDevices={() => setView("devices")} t={t} origin={origin} readings={electricalPoll.data ?? null} unreachable={electricalPoll.failed} design={electrical} openDesigner={() => setView("electricalDesigner")} network={networkPoll.data} now={now} />}</Ticking>,
    inverters: <Ticking>{now => <InvertersView isAdmin={isAdmin} t={t} origin={origin} devices={solarPoll.data?.devices ?? []} waiting={solarPoll.data?.waiting ?? []} catalog={solarPoll.data?.catalog ?? null} reload={solarPoll.reload} totals={solarPoll.data?.totals ?? null} now={now} unreachable={solarPoll.failed} network={networkPoll.data} />}</Ticking>,
    batteries: <Ticking>{now => <BatteriesView isAdmin={isAdmin} t={t} origin={origin} devices={solarPoll.data?.devices ?? []} waiting={solarPoll.data?.waiting ?? []} catalog={solarPoll.data?.catalog ?? null} reload={solarPoll.reload} totals={solarPoll.data?.totals ?? null} now={now} unreachable={solarPoll.failed} network={networkPoll.data} />}</Ticking>,
    devices: <Ticking>{now => <DevicesView t={t} origin={origin} devices={devices} reload={devicePoll.reload} placedIds={new Set(placements.map(item => item.device_id))} onPlace={id => { setWantsToPlace(id); setView("siteDesigner"); }} now={now} />}</Ticking>,
    automations: <Ticking>{now => <AutomationsView t={t} origin={origin} automations={automationPoll.data?.automations ?? []} reload={automationPoll.reload} devices={devices} now={now} />}</Ticking>,
    system: <SystemView t={t} origin={origin} isAdmin={isAdmin} />,
    services: <ServicesView t={t} origin={origin} />,
    hmi: <ScreenView t={t} origin={origin} isAdmin={isAdmin} network={networkPoll.data} />,
    weather: <WeatherView t={t} locale={language} origin={origin} />,
    cameras: <CameraMonitorView openDesigner={() => setView("siteDesigner")} cameras={cameras} selected={selected} selectedId={selectedCamera} gridSize={gridSize} setGridSize={setGridSize} recordingIds={recordingCameraIds} streamUrls={streamUrls} reachability={reachability} notice={notice} t={t} select={setSelectedCamera} toggle={camera => updateCamera(camera.id, { enabled: !camera.enabled })} snapshot={camera => void saveSnapshot(camera)} record={camera => void toggleRecording(camera)} expand={expand} ptz={commandPtz} slots={slots} setSlot={(index, id) => setSlots(current => { const next = [...current]; while (next.length <= index) next.push(""); next[index] = id; return next; })}
      settings={<CameraSettings t={t} origin={origin} isAdmin={isAdmin} cameras={cameras} selectedCameraId={selectedCamera} onCameraSelected={setSelectedCamera}
        onCameraSaved={camera => setCameras(current => { const next = upsertCamera(current, camera); persist(next); return next; })}
        onCameraDeleted={id => setCameras(current => { const next = current.filter(camera => camera.id !== id); persist(next); setSelectedCamera(selectionAfterRemoval(next, selectedCamera, id)); return next; })}
        discovered={discovered} discover={() => void discoverLocalCameras()} />} />,
    record: <MediaLibrary origin={origin} cameras={cameras} t={t} />,
    history: <HistoryView origin={origin} t={t} />,
    radar: <RadarView isAdmin={isAdmin} devices={devices} network={networkPoll.data} nodes={nodes} model={site} dimensions={dimensions} origin={origin} openDesigner={() => setView("siteDesigner")} openZones={() => setView("history")} setSensors={setSensors} forget={id => void forgetNode(origin, id).then(() => setNotice(t("nodeForgotten"))).catch(() => setNotice(t("recordingFailed")))} t={t} />,
    siteDesigner: <SiteDesignerInteractive openVersions={() => setVersionsOf("site")} t={t} dimensions={dimensions} setDimensions={setDimensions} model={site} applyModel={applySite} selectedCamera={selectedCamera} setSelectedCamera={setSelectedCamera} notice={notice} setNotice={setNotice} save={saveSettings} nodeIds={nodes.map(node => node.node_id)} devices={devices} wantsToPlace={wantsToPlace} clearWantsToPlace={() => setWantsToPlace("")} openDevices={() => setView("devices")} cameras={cameras} alarmNodes={alarmNodesPoll.data?.nodes ?? []} openCameras={() => setView("cameras")} openAlarmPanels={() => setView("alarmPanels")} />,
    electricalDesigner: <ElectricalDesigner t={t} design={electrical} setDesign={setElectrical} status={electricalStatus} nodeIds={nodes.map(node => node.node_id)} solarDevices={solarPoll.data?.devices ?? []} solarWaiting={solarPoll.data?.waiting ?? []} electricalNodes={electricalPoll.data?.nodes ?? []} site={{ openings, features, roofItems }} />,
    network: <Ticking>{now => <NetworkView openDesigner={() => setView("networkDesigner")} language={language} t={t} origin={origin} isAdmin={isAdmin} overview={networkPoll.data} reload={networkPoll.reload} now={now} />}</Ticking>,
    alarmDesigner: <AlarmDesigner t={t} design={alarmDesign} setDesign={setAlarmDesign} status={alarmDesignStatus} panels={alarmNodesPoll.data ?? null} openVersions={() => setVersionsOf("alarm")} openPanels={() => setView("alarmPanels")} />,
    networkDesigner: <NetworkDesigner t={t} design={networkDesign} setDesign={setNetworkDesign} status={networkStatus} overview={networkPoll.data} cameras={cameras} />,
    configuration: <ConfigurationPanel
      t={t} origin={origin} setOrigin={setOrigin} theme={theme} themes={THEMES}
      setTheme={value => { setTheme(value as Theme); savePreferences(origin, { theme: value }).catch(() => { /* kept locally at least */ }); }} language={language} languages={LANGUAGES}
      setLanguage={value => { setLanguage(value as LanguageCode); savePreferences(origin, { language: value }).catch(() => { /* kept locally at least */ }); }} isAdmin={isAdmin}
      connection={connection} network={networkPoll.data ?? null}
      savePreferences={saveSettings} exportSite={exportSettings} operatorUnlocked={operatorUnlocked} isViewer={isViewer}
    />,
  };

  const serverName = (() => { try { return new URL(origin).host; } catch { return origin; } })();
  // A wall-panel account is for the panels (ARMOR-NODE-ALARM, ARMOR-NODE-HMI), not for Studio: every menu would answer it with a refusal.
  if (sessionUser.user?.role === "panel") return <main className="studio-login-shell"><div className="studio-login-card"><h1>A.R.M.O.R. Studio</h1><p role="alert">{t("panel_account_notice")}</p><button className="primary" onClick={onSignOut}>{t("signOut")}</button></div></main>;
  return <SessionUserContext.Provider value={sessionUser}><KnownNodesContext.Provider value={knownNodes}><StreamRenewContext.Provider value={renewStream}><div className="studio-frame"><main className={`studio-shell ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
    <Sidebar view={view} setView={setView} sidebarOpen={sidebarOpen} toggle={() => setSidebarOpen(value => !value)} alarmBadge={alarmsPending} t={t} />
    <section className="main-stage" data-tour="stage">
      <TopBar view={view} revision={state.revision} mode={state.mode} demo={connectionState === "demo"} siteStatus={siteSync.status} fullScreen={fullScreen} isFullScreen={fullscreen.active} openAbout={() => setAboutOpen(true)} openHelp={() => setHelpOpen(true)} toggleMode={toggleMode} readOnly={cannotArm} checkPerimeter={() => setCheckOpen(true)} remote={remoteConnection} t={t} />
      {viewsToDraw(VIEW_ORDER, view, visitedViews.current).map(shown => {
        // a hidden menu keeps the last thing it was given (the same element: React does not draw it again every second); it is refreshed when it is shown
        if (shown === view) shownPanels.current.set(shown, panels[shown]);
        return <ViewSlot key={shown} active={shown === view}><Suspense fallback={<p className="login-loading">{t("loading")}</p>}>{shownPanels.current.get(shown)}</Suspense></ViewSlot>;
      })}
    </section>
    {expandedCamera && <CameraFullscreen camera={expandedCamera} cameras={cameras} origin={origin} recording={recordingCameraIds.includes(expandedCamera.id)} t={t} close={() => setExpandedCameraId("")} fullScreen={fullScreen} step={stepExpanded} snapshot={() => void saveSnapshot(expandedCamera)} toggleRecording={() => void toggleRecording(expandedCamera)} invokePtz={command => commandPtz(expandedCamera, command)} />}
    <TourHost t={t} language={language} view={view} setView={setView} />
    <RichTooltips t={t} />
    {helpOpen && <HelpDialog initial={view} close={() => setHelpOpen(false)} t={t} language={language} />}
    <Suspense fallback={null}><Assistant view={view} t={t} language={language} go={setView} openHelp={() => setHelpOpen(true)} /></Suspense>
    <AlarmPopups popups={announcer.popups} open={announcer.open} dismiss={announcer.dismiss} dismissAll={announcer.dismissAll} acknowledge={signedIn && !capabilities.can("acknowledge") ? undefined : id => { void acknowledgeAlarm(origin, id).then(alarmPoll.reload, () => undefined); }} t={t} />
    {aboutOpen && <AboutDialog version={studioVersion} revision={state.revision} close={() => setAboutOpen(false)} t={t} />}
    {versionsOf && <DesignVersionsDialog kind={versionsOf} origin={origin} t={t} close={() => setVersionsOf(null)}
      draft={versionsOf === "site" ? siteSync.draft : null} restoreDraft={siteSync.restoreDraft}
      restore={design => { if (versionsOf === "site") siteSync.restoreDocument(design); else if (versionsOf === "electrical") setElectrical(current => applyElectricalDoc(design, current)); else if (versionsOf === "alarm") setAlarmDesign(current => applyAlarmDoc(design, current)); else setNetworkDesign(current => applyNetworkDoc(design, current)); }} />}
    {pendingMode === "disarmed" && <PinDialog title={t("disarmSystem")} text={t("confirmDisarm")} confirmLabel={t("disarmSystem")} confirm={pin => void changeMode("disarmed", pin)} cancel={() => setPendingMode(null)} t={t} />}
    {checkOpen && <PreflightDialog origin={origin} names={{ cameras, devices }} infoOnly confirm={() => undefined} cancel={() => setCheckOpen(false)} t={t} />}
    {pendingMode === "armed" && <PreflightDialog origin={origin} names={{ cameras, devices }} confirm={() => void changeMode("armed")} cancel={() => setPendingMode(null)} t={t} />}
  </main>
  <StatusBar serverName={serverName} synced={connectionState === "synced"} mode={state.mode}
    nodesOnline={census.online} nodesTotal={census.total}
    camerasReachable={cameras.filter(camera => reachability[camera.id] === "online").length} camerasTotal={cameras.length}
    highAlerts={nodes.filter(node => node.online && !node.stale && node.alert_level === "high").length}
    info={serverInfo} latencyMs={latencyMs} live={liveChannel} revision={state.revision} onSignOut={onSignOut} t={t} />
  <ConfirmHost />
  <ElevationHost t={t} />
  </div></StreamRenewContext.Provider></KnownNodesContext.Provider></SessionUserContext.Provider>;
}

export default function App() {
  // A new address typed in Configuration starts from the beginning: the session is the one of the server it was opened with.
  const storedOrigin = (() => { try { return window.localStorage.getItem("armor-studio-origin"); } catch { return null; } })();
  const [origin, setOrigin] = useState(storedOrigin || DEFAULT_SERVER_ORIGIN);
  const [originReady, setOriginReady] = useState(Boolean(storedOrigin));
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  // Without a remembered address, take the one the deployment publishes.
  useEffect(() => {
    if (originReady) return;
    void loadDeploymentOrigin().then(deployed => { if (deployed) setOrigin(deployed); setOriginReady(true); });
  }, [originReady]);
  useEffect(() => {
    if (!originReady) return;
    let cancelled = false;
    // Only "ended" signs out; an unanswered check leaves things as they are and is tried again a minute later.
    // The first time, a server that is slow to answer must not show the login for a session that is valid: the page keeps checking, and asks again in three seconds.
    let known = false, retry = 0, tries = 0;
    const checkSession = () => void studioSessionState(origin).then(state => {
      if (cancelled) return;
      if (state !== "unknown") { known = true; setAuthenticated(state === "active"); setChecking(false); }
      else if (!known && ++tries < 5) retry = window.setTimeout(checkSession, 3000);
      else if (!known) setChecking(false);   // after fifteen seconds without an answer the login shows (it is where the server's address is changed)
    });
    checkSession();
    const timer = window.setInterval(checkSession, 60_000);
    return () => { cancelled = true; window.clearInterval(timer); window.clearTimeout(retry); };
  }, [origin, originReady]);
  if (checking) return <main className="studio-login-shell"><p className="login-loading">{text(loginLanguage(), "login_checking")}</p></main>;
  const changeOrigin = (next: string) => {
    try { window.localStorage.setItem("armor-studio-origin", next); } catch { /* Storage may be blocked. */ }
    setAuthenticated(false); setChecking(true); setOrigin(next);
  };
  return authenticated ? <StudioConsole origin={origin} setOrigin={changeOrigin} onSignOut={() => { void closeStudioSession(origin); clearSessionMemory(); setAuthenticated(false); }} /> : <StudioLogin origin={origin} onAuthenticated={nextOrigin => { setOrigin(nextOrigin); setAuthenticated(true); }} />;
}
