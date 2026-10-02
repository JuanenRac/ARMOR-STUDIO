/**
 * A.R.M.O.R. Studio operational console.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D)
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { listAlarms, listAutomations, listDevices, listSolar, listElectricalReadings, listNetwork, ApiError, setSystemMode, captureSnapshot, closeStudioSession, discoverCameras, forgetNode, getPreferences, savePreferences, sendPtz, startCameraRecording, stopCameraRecording, studioSessionState, type DiscoveredCamera } from "./api";
import { selectionAfterRemoval, upsertCamera } from "./cameras";
import { AboutDialog, ConfirmDialog, Sidebar, StatusBar, TopBar } from "./components/chrome";
import { DesignVersionsDialog } from "./DesignVersionsDialog";
import { SessionUserContext } from "./sessionContext";
import { CameraFullscreen } from "./components/camera";
import { ElectricalView } from "./views/ElectricalView";
import { ConfigurationPanel } from "./ConfigurationPanel";
import { CameraSettings } from "./CameraSettings";
import { loadLayout, saveLayout } from "./cameraLayout";
import { DEFAULT_SERVER_ORIGIN, loadDeploymentOrigin } from "./config";
import {
  DEFAULT_THEME, INITIAL_BUILDINGS, INITIAL_CAMERAS, INITIAL_DIMENSIONS, INITIAL_FEATURES, INITIAL_OPENINGS, INITIAL_ROOF_ITEMS, INITIAL_SENSORS, INITIAL_TERRAIN, INITIAL_WALL_LAMPS, LANGUAGES, THEMES,
  type Building, type Camera, type DevicePlacement, type Dimensions, type GridSize, type LanguageCode, type Opening, type RoofItem, type Sensor, type SiteFeature, type Terrain, type Theme, type View, type WallLamp,
} from "./domain";
import type { SiteModel } from "./designer/ops";
import { usePolled, useFullscreen, useCameraReachability, useServerCameras, useServerInfo, useServerStatus, useSessionUser, useStreamUrls } from "./hooks";
import { text } from "./i18n";
import { HistoryView } from "./HistoryView";
import { MediaLibrary } from "./MediaLibrary";
import { parseStudioSettings, serializeStudioSettings, SETTINGS_KEY, siteExport, type StudioSettings } from "./settings";
import { SiteDesignerInteractive } from "./SiteDesignerInteractive";
import { ElectricalDesigner } from "./ElectricalDesigner";
import { EMPTY_DESIGN, type Design as ElectricalDesign } from "./electrical/model";
import { loadLocalElectrical, saveLocalElectrical } from "./electrical/local";
import { applyElectricalDoc } from "./electrical/sync";
import { useElectricalSync } from "./electrical/useElectricalSync";
import { NetworkDesigner } from "./NetworkDesigner";
import { EMPTY_DESIGN as EMPTY_NETWORK_DESIGN, type Design as NetworkDesign } from "./network/model";
import { applyNetworkDoc, loadLocalNetwork, saveLocalNetwork } from "./network/sync";
import { useNetworkSync } from "./network/useNetworkSync";
import { NetworkView } from "./views/NetworkView";
import { StudioLogin } from "./StudioLogin";
import { useSiteSync } from "./useSiteSync";
import { AlarmsView } from "./views/AlarmsView";
import { AutomationsView } from "./views/AutomationsView";
import { DevicesView } from "./views/DevicesView";
import { CameraMonitorView } from "./views/monitoring";
import { OverviewView } from "./views/OverviewView";
import { SystemView } from "./views/SystemView";
import { ServicesView } from "./views/ServicesView";
import { WeatherView } from "./views/WeatherView";
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

const studioVersion = manifest.version;

function StudioConsole({ initialOrigin, onSignOut }: { initialOrigin: string; onSignOut: () => void }) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [view, setView] = useState<View>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);
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
  const [versionsOf, setVersionsOf] = useState<"site" | "electrical" | "network" | null>(null);
  const sessionUser = useSessionUser(origin);
  const isAdmin = sessionUser.user?.role === "admin";
  const [pendingMode, setPendingMode] = useState<"armed" | "disarmed" | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [restored, setRestored] = useState(false);
  const savedLayout = useMemo(() => loadLayout(), []);
  const [gridSize, setGridSize] = useState<GridSize>(savedLayout?.gridSize ?? 4);
  const [slots, setSlots] = useState<string[]>(savedLayout?.slots ?? []);
  // The number of views and the camera of each place are kept, so the monitor is as it was left.
  useEffect(() => { saveLayout({ gridSize, slots }); }, [gridSize, slots]);
  const [selectedCamera, setSelectedCamera] = useState("cam-01");
  const [recordingCameraIds, setRecordingCameraIds] = useState<string[]>([]);
  const [discovered, setDiscovered] = useState<DiscoveredCamera[]>([]);
  const t = (key: string) => text(language, key);
  const [notice, setNotice] = useState(t("configuration"));

  const { state, connection: connectionState, latencyMs, apply: applyState } = useServerStatus(origin);
  const serverInfo = useServerInfo(origin);
  const streamUrls = useStreamUrls(origin, cameras);
  const reachability = useCameraReachability(origin);
  const operatorUnlocked = useServerCameras(origin, setCameras);
  const connection = connectionState === "synced" ? t("serverSynchronized") : t("offlineDemo");
  const nodes = useMemo(() => Object.values(state.nodes).sort((a, b) => a.node_id.localeCompare(b.node_id)), [state]);
  const selected = cameras.find(camera => camera.id === selectedCamera) ?? cameras[0];
  const devicePoll = usePolled(() => listDevices(origin), 2500, origin);
  const alarmPoll = usePolled(() => listAlarms(origin), 2000, origin);
  const automationPoll = usePolled(() => listAutomations(origin), 5000, origin);
  const solarPoll = usePolled(() => listSolar(origin), 4000, origin);
  const electricalPoll = usePolled(() => listElectricalReadings(origin), 4000, origin);
  const networkPoll = usePolled(() => listNetwork(origin), 5000, origin);
  const devices = devicePoll.data?.devices ?? [];
  const alarms = alarmPoll.data;
  const alarmsPending = (alarms?.active ?? []).filter(alarm => !alarm.acknowledged_at).length;
  const cameraNames = useMemo(() => Object.fromEntries(cameras.map(camera => [camera.id, camera.name])), [cameras]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);

  useEffect(() => {
    document.documentElement.dataset.armorTheme = theme;
    document.documentElement.lang = language;
  }, [theme, language]);

  // Restore the browser-local settings once; anything invalid was already dropped by the parser.
  useEffect(() => {
    let raw: string | null = null;
    try { raw = window.localStorage.getItem(SETTINGS_KEY); } catch { /* Storage may be blocked. */ }
    const saved = parseStudioSettings(raw);
    if (saved.origin) setOrigin(saved.origin);
    if (saved.theme) setTheme(saved.theme);
    if (saved.language) setLanguage(saved.language);
    if (saved.sidebarOpen !== undefined) setSidebarOpen(saved.sidebarOpen);
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
    const savedElectrical = loadLocalElectrical();
    if (savedElectrical) setElectrical(savedElectrical);
    const savedNetwork = loadLocalNetwork();
    if (savedNetwork) setNetworkDesign(savedNetwork);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin]);

  const site: SiteModel = useMemo(() => ({ terrain, buildings, openings, roofItems, wallLamps, features, cameras, sensors, placements }), [terrain, buildings, openings, roofItems, wallLamps, features, cameras, sensors, placements]);
  /** The designer hands back a whole model; only the parts that changed are stored again. */
  const design = useMemo(() => ({ dimensions, terrain, buildings, openings, roofItems, wallLamps, features, sensors, placements, cameras }), [dimensions, terrain, buildings, openings, roofItems, wallLamps, features, sensors, placements, cameras]);
  const siteSync = useSiteSync({
    origin, enabled: restored && operatorUnlocked, design, onConflict: () => setNotice(t("siteConflict")), onNotice: kind => setNotice(t(kind === "recovered" ? "versionsDraftRecovered" : "versionsDraftNotice")),
    apply: next => { setDimensions(next.dimensions); setTerrain(next.terrain); setBuildings(next.buildings); setOpenings(next.openings); setRoofItems(next.roofItems); setWallLamps(next.wallLamps); setFeatures(next.features); setSensors(next.sensors); setPlacements(next.placements); setCameras(next.cameras); },
  });
  const electricalStatus = useElectricalSync({ origin, enabled: restored && operatorUnlocked, design: electrical, apply: setElectrical, onConflict: () => setNotice(t("elConflict")) });
  // The electrical drawing is also kept in this browser, so it is there when the server is not.
  useEffect(() => { if (restored) saveLocalElectrical(electrical); }, [electrical, restored]);
  const networkStatus = useNetworkSync({ origin, enabled: restored && operatorUnlocked, design: networkDesign, apply: setNetworkDesign, onConflict: () => setNotice(t("elConflict")) });
  useEffect(() => { if (restored) saveLocalNetwork(networkDesign); }, [networkDesign, restored]);
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
    const url = URL.createObjectURL(new Blob([siteExport(currentSettings())], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = "armor-studio-site-config.json"; link.click();
    URL.revokeObjectURL(url);
    setNotice(t("siteExported"));
  };
  // The question is asked in the page (ConfirmDialog), not with the browser's confirm(): a browser can switch that one off, and then the button did nothing at all.
  const toggleMode = () => setPendingMode(state.mode === "armed" ? "disarmed" : "armed");
  const changeMode = async (next: "armed" | "disarmed") => {
    setPendingMode(null);
    try { applyState(await setSystemMode(origin, next)); setNotice(t(next === "armed" ? "modeArmedNotice" : "modeDisarmedNotice")); }
    catch (error) {
      // Say why: a ended session, a refusal, an error of the server or no answer at all are different things to do something about.
      if (error instanceof ApiError && error.status === 401) { setNotice(t("modeSessionEnded")); sessionUser.refresh(); }
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

  const panels: Record<View, ReactNode> = {
    overview: <OverviewView t={t} origin={origin} mode={state.mode} toggleMode={toggleMode} demo={connectionState === "demo"} nodes={nodes} cameras={cameras} reachability={reachability} devices={devices} alarms={alarms} model={site} dimensions={dimensions} setView={setView} onDevice={() => setView("devices")} now={now} />,
    alarms: <AlarmsView t={t} origin={origin} alarms={alarms} reload={alarmPoll.reload} devices={devices} cameraNames={cameraNames} mode={state.mode} toggleMode={toggleMode} now={now} isAdmin={isAdmin} />,
    electrical: <ElectricalView t={t} origin={origin} readings={electricalPoll.data ?? null} unreachable={electricalPoll.failed} design={electrical} openDesigner={() => setView("electricalDesigner")} network={networkPoll.data} now={now} />,
    inverters: <InvertersView t={t} origin={origin} devices={solarPoll.data?.devices ?? []} waiting={solarPoll.data?.waiting ?? []} catalog={solarPoll.data?.catalog ?? null} reload={solarPoll.reload} totals={solarPoll.data?.totals ?? null} now={now} unreachable={solarPoll.failed} network={networkPoll.data} />,
    batteries: <BatteriesView t={t} origin={origin} devices={solarPoll.data?.devices ?? []} waiting={solarPoll.data?.waiting ?? []} catalog={solarPoll.data?.catalog ?? null} reload={solarPoll.reload} totals={solarPoll.data?.totals ?? null} now={now} unreachable={solarPoll.failed} network={networkPoll.data} />,
    devices: <DevicesView t={t} origin={origin} devices={devices} reload={devicePoll.reload} placedIds={new Set(placements.map(item => item.device_id))} onPlace={id => { setWantsToPlace(id); setView("siteDesigner"); }} now={now} />,
    automations: <AutomationsView t={t} origin={origin} automations={automationPoll.data?.automations ?? []} reload={automationPoll.reload} devices={devices} now={now} />,
    system: <SystemView t={t} origin={origin} isAdmin={isAdmin} />,
    services: <ServicesView t={t} origin={origin} />,
    weather: <WeatherView t={t} locale={language} origin={origin} />,
    cameras: <CameraMonitorView cameras={cameras} selected={selected} selectedId={selectedCamera} gridSize={gridSize} setGridSize={setGridSize} recordingIds={recordingCameraIds} streamUrls={streamUrls} reachability={reachability} notice={notice} t={t} select={setSelectedCamera} toggle={camera => updateCamera(camera.id, { enabled: !camera.enabled })} snapshot={camera => void saveSnapshot(camera)} record={camera => void toggleRecording(camera)} expand={expand} ptz={commandPtz} slots={slots} setSlot={(index, id) => setSlots(current => { const next = [...current]; while (next.length <= index) next.push(""); next[index] = id; return next; })}
      settings={<CameraSettings t={t} origin={origin} cameras={cameras} selectedCameraId={selectedCamera} onCameraSelected={setSelectedCamera}
        onCameraSaved={camera => setCameras(current => { const next = upsertCamera(current, camera); persist(next); return next; })}
        onCameraDeleted={id => setCameras(current => { const next = current.filter(camera => camera.id !== id); persist(next); setSelectedCamera(selectionAfterRemoval(next, selectedCamera, id)); return next; })}
        discovered={discovered} discover={() => void discoverLocalCameras()} />} />,
    record: <MediaLibrary origin={origin} cameras={cameras} t={t} />,
    history: <HistoryView origin={origin} t={t} />,
    radar: <RadarView network={networkPoll.data} nodes={nodes} model={site} dimensions={dimensions} origin={origin} openDesigner={() => setView("siteDesigner")} openZones={() => setView("history")} setSensors={setSensors} forget={id => void forgetNode(origin, id).then(() => setNotice(t("nodeForgotten"))).catch(() => setNotice(t("recordingFailed")))} t={t} />,
    siteDesigner: <SiteDesignerInteractive openVersions={() => setVersionsOf("site")} t={t} dimensions={dimensions} setDimensions={setDimensions} model={site} applyModel={applySite} selectedCamera={selectedCamera} setSelectedCamera={setSelectedCamera} notice={notice} setNotice={setNotice} save={saveSettings} nodeIds={nodes.map(node => node.node_id)} devices={devices} wantsToPlace={wantsToPlace} clearWantsToPlace={() => setWantsToPlace("")} openDevices={() => setView("devices")} />,
    electricalDesigner: <ElectricalDesigner t={t} design={electrical} setDesign={setElectrical} status={electricalStatus} nodeIds={nodes.map(node => node.node_id)} solarDevices={solarPoll.data?.devices ?? []} solarWaiting={solarPoll.data?.waiting ?? []} electricalNodes={electricalPoll.data?.nodes ?? []} />,
    network: <NetworkView t={t} origin={origin} isAdmin={isAdmin} overview={networkPoll.data} reload={networkPoll.reload} now={now} />,
    networkDesigner: <NetworkDesigner t={t} design={networkDesign} setDesign={setNetworkDesign} status={networkStatus} overview={networkPoll.data} cameras={cameras} />,
    configuration: <ConfigurationPanel
      t={t} origin={origin} setOrigin={setOrigin} theme={theme} themes={THEMES}
      setTheme={value => { setTheme(value as Theme); savePreferences(origin, { theme: value }).catch(() => { /* kept locally at least */ }); }} language={language} languages={LANGUAGES}
      setLanguage={value => { setLanguage(value as LanguageCode); savePreferences(origin, { language: value }).catch(() => { /* kept locally at least */ }); }} isAdmin={isAdmin}
      connection={connection}
      savePreferences={saveSettings} exportSite={exportSettings} operatorUnlocked={operatorUnlocked}
    />,
  };

  const serverName = (() => { try { return new URL(origin).host; } catch { return origin; } })();
  return <SessionUserContext.Provider value={sessionUser}><div className="studio-frame"><main className={`studio-shell ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
    <Sidebar view={view} setView={setView} sidebarOpen={sidebarOpen} toggle={() => setSidebarOpen(value => !value)} connection={connection} alarmBadge={alarmsPending} t={t} />
    <section className="main-stage">
      <TopBar view={view} revision={state.revision} mode={state.mode} demo={connectionState === "demo"} siteStatus={siteSync.status} fullScreen={fullScreen} isFullScreen={fullscreen.active} openAbout={() => setAboutOpen(true)} toggleMode={toggleMode} t={t} />
      {panels[view]}
    </section>
    {expandedCamera && <CameraFullscreen camera={expandedCamera} cameras={cameras} origin={origin} recording={recordingCameraIds.includes(expandedCamera.id)} t={t} close={() => setExpandedCameraId("")} fullScreen={fullScreen} step={stepExpanded} snapshot={() => void saveSnapshot(expandedCamera)} toggleRecording={() => void toggleRecording(expandedCamera)} invokePtz={command => commandPtz(expandedCamera, command)} />}
    {aboutOpen && <AboutDialog version={studioVersion} revision={state.revision} close={() => setAboutOpen(false)} t={t} />}
    {versionsOf && <DesignVersionsDialog kind={versionsOf} origin={origin} t={t} close={() => setVersionsOf(null)}
      draft={versionsOf === "site" ? siteSync.draft : null} restoreDraft={siteSync.restoreDraft}
      restore={design => { if (versionsOf === "site") siteSync.restoreDocument(design); else if (versionsOf === "electrical") setElectrical(current => applyElectricalDoc(design, current)); else setNetworkDesign(current => applyNetworkDoc(design, current)); }} />}
    {pendingMode && <ConfirmDialog title={t(pendingMode === "armed" ? "armSystem" : "disarmSystem")} text={t(pendingMode === "armed" ? "confirmArm" : "confirmDisarm")} confirmLabel={t(pendingMode === "armed" ? "armSystem" : "disarmSystem")} danger={pendingMode === "disarmed"} confirm={() => void changeMode(pendingMode)} cancel={() => setPendingMode(null)} t={t} />}
  </main>
  <StatusBar serverName={serverName} synced={connectionState === "synced"} mode={state.mode}
    nodesOnline={nodes.filter(node => node.online && !node.stale).length} nodesTotal={nodes.length}
    camerasReachable={cameras.filter(camera => reachability[camera.id] === "online").length} camerasTotal={cameras.length}
    highAlerts={nodes.filter(node => node.alert_level === "high").length}
    info={serverInfo} latencyMs={latencyMs} revision={state.revision} onSignOut={onSignOut} t={t} />
  </div></SessionUserContext.Provider>;
}

export default function App() {
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
    const checkSession = () => void studioSessionState(origin).then(state => {
      if (cancelled) return;
      if (state !== "unknown") setAuthenticated(state === "active");
      setChecking(false);
    });
    checkSession();
    const timer = window.setInterval(checkSession, 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [origin, originReady]);
  if (checking) return <main className="studio-login-shell"><p className="login-loading">Comprobando sesión de Studio…</p></main>;
  return authenticated ? <StudioConsole initialOrigin={origin} onSignOut={() => { void closeStudioSession(origin); setAuthenticated(false); }} /> : <StudioLogin origin={origin} onAuthenticated={nextOrigin => { setOrigin(nextOrigin); setAuthenticated(true); }} />;
}
