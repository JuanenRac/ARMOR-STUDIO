/**
 * The settings of the cameras, inside the Cameras menu: the list, the connection of each one (address, ports, stream, user and password), the search for cameras on the network
 * and the removal of one.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useState } from "react";
import { configureCamera, deleteCamera, discoverCameraStreams, type CameraConnection, type DiscoveredCamera } from "./api";
import "./configuration.css";

export type StudioCamera = {
  id: string; name: string; host: string; snapshotUrl: string; enabled: boolean; x: number; y: number;
  username?: string; onvifPort?: number; rtspPort?: number; rtspPath?: string; previewPath?: string; hasCredentials?: boolean; liveVideoAvailable?: boolean;
};
type Props = {
  t: (key: string) => string; origin: string;
  cameras: StudioCamera[]; onCameraSaved: (camera: StudioCamera) => void; onCameraDeleted: (id: string) => void;
  selectedCameraId: string; onCameraSelected: (id: string) => void;
  discovered: DiscoveredCamera[]; discover: () => void;
};

const emptyConnection = (): CameraConnection => ({ id: "", name: "", host: "", snapshotUrl: "", rtspPath: "", previewPath: "", username: "", password: "", onvifPort: 80, rtspPort: 554 });
const sessionCredentials = new Map<string, Pick<CameraConnection, "username" | "password">>();

export function CameraSettings(props: Props) {
  const { t } = props;
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
      snapshotUrl: selected.snapshotUrl, rtspPath: selected.rtspPath ?? "", previewPath: selected.previewPath ?? "", username: credentials?.username ?? selected.username ?? "", password: credentials?.password ?? "", onvifPort: selected.onvifPort ?? 80, rtspPort: selected.rtspPort ?? 554 });
  }, [selectedId, selected?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

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
      setForm(current => ({ ...current, rtspPath: result.paths[0], previewPath: result.camera.previewPath ?? current.previewPath }));
      props.onCameraSaved({ ...result.camera, enabled: selected?.enabled ?? true, x: selected?.x ?? 50, y: selected?.y ?? 50 });
      setMessage(`${t("rtspFound")}: ${result.paths.join(", ")}`);
    } catch { setMessage(t("rtspDiscoverFailed")); }
  };
  const useDiscovery = (device: DiscoveredCamera) => {
    setSelectedId("");
    setForm({ ...emptyConnection(), host: device.host });
  };
  const removeCamera = async () => {
    if (!selected || !window.confirm(t("confirmDeleteCamera"))) return;
    try { await deleteCamera(props.origin, selected.id); props.onCameraDeleted(selected.id); newCamera(); setMessage(t("cameraDeleted")); }
    catch { setMessage(t("cameraDeleteFailed")); }
  };

  return <div className="camera-settings">
    <aside className="camera-picker"><button className="primary" onClick={newCamera}>{t("newCamera")}</button>{props.cameras.map(camera => <button key={camera.id} className={camera.id === selectedId ? "active" : ""} onClick={() => selectCamera(camera.id)}><b>{camera.name}</b><small>{camera.host}</small></button>)}
      <div className="camera-discovery"><button onClick={props.discover}>{t("networkDiscovery")}</button><small>{t("discoveryHelp")}</small>
        {props.discovered.length > 0 && <><small>{t("selectCandidate")}</small>{props.discovered.map(camera => <button key={camera.host} onClick={() => useDiscovery(camera)}>{camera.host} · {camera.ports.join(", ")}</button>)}</>}</div>
    </aside>
    <article className="stack-card camera-form"><h3>{form.id ? t("editCamera") : t("newCamera")}</h3>
      <div className="camera-field"><label><span>{t("cameraName")}</span><input value={form.name} onChange={event => update("name", event.target.value)} /></label></div>
      <div className="camera-field"><label><span>{t("hostAddress")}</span><input placeholder="192.168.0.200" value={form.host} onChange={event => update("host", event.target.value)} /></label></div>
      <div className="camera-field"><label><span>{t("onvifPort")}</span><input type="number" min="1" max="65535" value={form.onvifPort} onChange={event => update("onvifPort", Number(event.target.value))} /></label></div>
      <div className="camera-field"><label><span>{t("rtspPort")}</span><input type="number" min="1" max="65535" value={form.rtspPort} onChange={event => update("rtspPort", Number(event.target.value))} /></label></div>
      <div className="camera-field camera-field-wide"><label><span>{t("rtspPath")}</span><input placeholder="Streaming/Channels/101" value={form.rtspPath} onChange={event => update("rtspPath", event.target.value)} /></label><p className="field-help">{t("rtspPathHelp")}</p></div>
      <div className="camera-field camera-field-wide"><label><span>{t("previewPath")}</span><input placeholder="12" value={form.previewPath ?? ""} onChange={event => update("previewPath", event.target.value)} /></label><p className="field-help">{t("previewPathHelp")}</p></div>
      <div className="camera-field"><label><span>{t("cameraUser")}</span><input autoComplete="username" value={form.username} onChange={event => update("username", event.target.value)} /></label></div>
      <div className="camera-field"><label><span>{t("cameraPassword")}</span><input type="password" autoComplete="current-password" placeholder={selected?.hasCredentials && !form.password ? "••••••••" : undefined} value={form.password} onChange={event => update("password", event.target.value)} /></label><p className="field-help">{selected?.hasCredentials && !form.password ? t("credentialsStored") : t("credentialNotice")}</p></div>
      <div className="camera-field camera-field-wide"><label><span>{t("snapshotUrl")}</span><input placeholder="http://camera/snapshot.jpg" value={form.snapshotUrl} onChange={event => update("snapshotUrl", event.target.value)} /></label></div>
      <div className="camera-form-actions"><button className="primary" onClick={() => void saveCamera()}>{t("saveCamera")}</button><button disabled={!form.id || !(selected?.hasCredentials || (form.username && form.password))} onClick={() => void discoverRtsp()}>{t("discoverRtsp")}</button>{form.id && <button className="danger-button" onClick={() => void removeCamera()}>{t("deleteCamera")}</button>}</div><p className="notice">{message}</p>
    </article>
  </div>;
}
