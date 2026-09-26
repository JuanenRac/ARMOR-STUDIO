import { useEffect, useState } from "react";
import { configureCamera, deleteCamera, discoverCameraStreams, sendPtz, type CameraConnection, type DiscoveredCamera } from "./api";
import { UsersPanel } from "./UsersPanel";
import "./configuration.css";
import { MenuTitle } from "./menuLogos";

export type StudioCamera = {
  id: string; name: string; host: string; snapshotUrl: string; enabled: boolean; x: number; y: number;
  username?: string; onvifPort?: number; rtspPort?: number; rtspPath?: string; hasCredentials?: boolean; liveVideoAvailable?: boolean;
};
type Tab = "general" | "users" | "cameras" | "discovery" | "video";
type Props = {
  t: (key: string) => string;
  origin: string; setOrigin: (value: string) => void;
  theme: string; themes: readonly string[]; setTheme: (value: string) => void;
  language: string; languages: readonly { code: string; name: string }[]; setLanguage: (value: string) => void;
  cameras: StudioCamera[]; onCameraSaved: (camera: StudioCamera) => void; onCameraDeleted: (id: string) => void;
  selectedCameraId: string; onCameraSelected: (id: string) => void;
  discovered: DiscoveredCamera[]; discover: () => void;
  connection: string; savePreferences: () => void; exportSite: () => void;
  operatorUnlocked: boolean;
};

const tabs: Tab[] = ["general", "users", "cameras", "discovery", "video"];
const emptyConnection = (): CameraConnection => ({ id: "", name: "", host: "", snapshotUrl: "", rtspPath: "", username: "", password: "", onvifPort: 80, rtspPort: 554 });
const sessionCredentials = new Map<string, Pick<CameraConnection, "username" | "password">>();

export function ConfigurationPanel(props: Props) {
  const { t } = props;
  const [tab, setTab] = useState<Tab>("general");
  const [selectedId, setSelectedId] = useState(props.selectedCameraId || props.cameras[0]?.id || "");
  const [form, setForm] = useState<CameraConnection>(emptyConnection);
  const [message, setMessage] = useState("");
  const selected = props.cameras.find(camera => camera.id === selectedId);

  useEffect(() => {
    if (props.selectedCameraId) setSelectedId(props.selectedCameraId);
  }, [props.selectedCameraId]);

  useEffect(() => {
    if (!selected) return;
    const credentials = sessionCredentials.get(selected.id);
    setForm({ id: selected.id, name: selected.name, host: selected.host === "Not configured" ? "" : selected.host,
      snapshotUrl: selected.snapshotUrl, rtspPath: selected.rtspPath ?? "", username: credentials?.username ?? selected.username ?? "", password: credentials?.password ?? "", onvifPort: selected.onvifPort ?? 80, rtspPort: selected.rtspPort ?? 554 });
  }, [selectedId, selected?.id]);

  const update = <K extends keyof CameraConnection>(key: K, value: CameraConnection[K]) => setForm(current => ({ ...current, [key]: value }));
  const selectCamera = (id: string) => { setSelectedId(id); props.onCameraSelected(id); };
  const newCamera = () => { setSelectedId(""); setForm(emptyConnection()); setMessage(""); };
  const saveCamera = async () => {
    if (!form.name.trim() || !form.host.trim()) { setMessage(t("cameraRequired")); return; }
    try {
      const saved = await configureCamera(props.origin, { ...form, id: form.id || "cam-" + crypto.randomUUID().slice(0, 8) });
      sessionCredentials.set(saved.id, { username: form.username, password: form.password });
      props.onCameraSaved({ ...saved, enabled: selected?.enabled ?? true, x: selected?.x ?? 50, y: selected?.y ?? 50 });
      selectCamera(saved.id);
      setForm(current => ({ ...current, id: saved.id }));
      setMessage(t("cameraSaved"));
    } catch { setMessage(t("cameraSaveFailed")); }
  };
  const discoverRtsp = async () => {
    if (!form.id) { setMessage(t("selectCameraFirst")); return; }
    setMessage(t("rtspDiscovering"));
    try {
      const result = await discoverCameraStreams(props.origin, form.id);
      if (!result.paths.length) { setMessage(t("rtspNotFound")); return; }
      setForm(current => ({ ...current, rtspPath: result.paths[0] }));
      props.onCameraSaved({ ...result.camera, enabled: selected?.enabled ?? true, x: selected?.x ?? 50, y: selected?.y ?? 50 });
      setMessage(`${t("rtspFound")}: ${result.paths.join(", ")}`);
    } catch { setMessage(t("rtspDiscoverFailed")); }
  };
  const useDiscovery = (device: DiscoveredCamera) => {
    setSelectedId("");
    setForm({ ...emptyConnection(), host: device.host, onvifPort: device.ports.includes(80) ? 80 : 80, rtspPort: device.ports.includes(554) ? 554 : 554 });
    setTab("cameras");
  };
  const ptz = async (command: string) => {
    if (!form.id) { setMessage(t("selectCameraFirst")); return; }
    try { await sendPtz(props.origin, form.id, command); setMessage(t("ptzSent")); }
    catch { setMessage(t("ptzUnavailable")); }
  };
  const removeCamera = async () => {
    if (!selected || !window.confirm(t("confirmDeleteCamera"))) return;
    try { await deleteCamera(props.origin, selected.id); props.onCameraDeleted(selected.id); newCamera(); setMessage(t("cameraDeleted")); }
    catch { setMessage(t("cameraDeleteFailed")); }
  };
  const tabLabel = (item: Tab) => t("tab" + item[0].toUpperCase() + item.slice(1));

  return <section className="configuration">
    <div className="panel-heading"><MenuTitle kind="configuration"><p className="eyebrow">{t("systemConfiguration")}</p><h2>{t("configuration")}</h2><p className="muted">{t("configurationHelp")}</p></MenuTitle></div>
    <div className="config-tabs" role="tablist" aria-label={t("configuration")}>
      {tabs.map(item => <button key={item} className={tab === item ? "active" : ""} role="tab" aria-selected={tab === item} onClick={() => setTab(item)}>{tabLabel(item)}</button>)}
    </div>
    {tab === "general" && <div className="config-grid">
      <article className="stack-card"><h3>{t("serverOrigin")}</h3><label>{t("serverOrigin")}<input value={props.origin} onChange={event => props.setOrigin(event.target.value)} inputMode="url" /></label><small>{props.connection}</small><p className={`operator-session ${props.operatorUnlocked ? "ready" : ""}`}>{props.operatorUnlocked ? t("studioAccessActive") : t("studioAccessWaiting")}</p><small>{t("studioAccessNotice")}</small><button onClick={props.savePreferences}>{t("savePreferences")}</button><button onClick={props.exportSite}>{t("exportSite")}</button></article>
      <article className="stack-card"><h3>{t("interface")}</h3><label>{t("theme")}<select value={props.theme} onChange={event => props.setTheme(event.target.value)}>{props.themes.map(item => <option key={item}>{item}</option>)}</select></label><label>{t("language")}<select value={props.language} onChange={event => props.setLanguage(event.target.value)}>{props.languages.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><button onClick={props.savePreferences}>{t("saveUi")}</button></article>
    </div>}
    {tab === "users" && <UsersPanel t={t} origin={props.origin} />}
    {tab === "cameras" && <div className="camera-settings">
      <aside className="camera-picker"><button className="primary" onClick={newCamera}>{t("newCamera")}</button>{props.cameras.map(camera => <button key={camera.id} className={camera.id === selectedId ? "active" : ""} onClick={() => selectCamera(camera.id)}><b>{camera.name}</b><small>{camera.host}</small></button>)}</aside>
      <article className="stack-card camera-form"><h3>{form.id ? t("editCamera") : t("newCamera")}</h3>
        <div className="camera-field"><label><span>{t("cameraName")}</span><input value={form.name} onChange={event => update("name", event.target.value)} /></label></div>
        <div className="camera-field"><label><span>{t("hostAddress")}</span><input placeholder="192.168.0.200" value={form.host} onChange={event => update("host", event.target.value)} /></label></div>
        <div className="camera-field"><label><span>{t("onvifPort")}</span><input type="number" min="1" max="65535" value={form.onvifPort} onChange={event => update("onvifPort", Number(event.target.value))} /></label></div>
        <div className="camera-field"><label><span>{t("rtspPort")}</span><input type="number" min="1" max="65535" value={form.rtspPort} onChange={event => update("rtspPort", Number(event.target.value))} /></label></div>
        <div className="camera-field camera-field-wide"><label><span>{t("rtspPath")}</span><input placeholder="Streaming/Channels/101" value={form.rtspPath} onChange={event => update("rtspPath", event.target.value)} /></label><p className="field-help">{t("rtspPathHelp")}</p></div>
        <div className="camera-field"><label><span>{t("cameraUser")}</span><input autoComplete="username" value={form.username} onChange={event => update("username", event.target.value)} /></label></div>
        <div className="camera-field"><label><span>{t("cameraPassword")}</span><input type="password" autoComplete="current-password" placeholder={selected?.hasCredentials && !form.password ? "••••••••" : undefined} value={form.password} onChange={event => update("password", event.target.value)} /></label><p className="field-help">{selected?.hasCredentials && !form.password ? t("credentialsStored") : t("credentialNotice")}</p></div>
        <div className="camera-field camera-field-wide"><label><span>{t("snapshotUrl")}</span><input placeholder="http://camera/snapshot.jpg" value={form.snapshotUrl} onChange={event => update("snapshotUrl", event.target.value)} /></label></div>
        <div className="camera-form-actions"><button className="primary" onClick={() => void saveCamera()}>{t("saveCamera")}</button><button disabled={!form.id || !(selected?.hasCredentials || (form.username && form.password))} onClick={() => void discoverRtsp()}>{t("discoverRtsp")}</button>{form.id && <button className="danger-button" onClick={() => void removeCamera()}>{t("deleteCamera")}</button>}</div><p className="notice">{message}</p>
      </article>
    </div>}
    {tab === "discovery" && <article className="stack-card discovery"><h3>{t("networkDiscovery")}</h3><p>{t("discoveryHelp")}</p><button className="primary" onClick={props.discover}>{t("networkDiscovery")}</button>{props.discovered.length > 0 && <><small>{t("selectCandidate")}</small><div className="discovery-results">{props.discovered.map(camera => <button key={camera.host} onClick={() => useDiscovery(camera)}>{camera.host} · {camera.ports.join(", ")}</button>)}</div></>}</article>}
    {tab === "video" && <article className="stack-card video-integration"><h3>{t("videoIntegration")}</h3><p>{t("videoHelp")}</p><div className="ptz-grid">{["left", "up", "right", "zoomIn", "down", "zoomOut"].map(command => <button key={command} disabled={!form.id} onClick={() => void ptz(command)}>{t("ptz" + command[0].toUpperCase() + command.slice(1))}</button>)}</div><p className="notice">{message}</p></article>}
  </section>;
}
