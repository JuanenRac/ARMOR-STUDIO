/**
 * The settings of the cameras, inside the Cameras menu: the list, the connection of each one (address, ports, stream, user and password), the search for cameras on the network
 * and the removal of one.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { CameraTraits } from "./api/cameras";
import { PasswordInput } from "./components/PasswordInput";
import { IgnoreZonesEditor } from "./IgnoreZonesEditor";
import { askConfirm } from "./askConfirm";
import { snapshotHasLogin } from "./snapshotLogin";
import { useEffect, useState } from "react";
import { configureCamera, deleteCamera, discoverCameraStreams, type CameraConnection, type DiscoveredCamera, type PublicCameraConnection } from "./api";
import { CAMERA_PRESETS, cameraWebAddress, isCameraPreset, lensCameras, newLenses, presetKey, presetTraits, type LensDraft } from "./cameraPresets";
import "./configuration.css";

export type StudioCamera = CameraTraits & {
  id: string; name: string; host: string; snapshotUrl: string; enabled: boolean; x: number; y: number;
  username?: string; onvifPort?: number; rtspPort?: number; rtspPath?: string; previewPath?: string; hasCredentials?: boolean; liveVideoAvailable?: boolean;
};
type Props = {
  t: (key: string) => string; origin: string;
  cameras: StudioCamera[]; onCameraSaved: (camera: StudioCamera) => void; onCameraDeleted: (id: string) => void;
  selectedCameraId: string; onCameraSelected: (id: string) => void;
  discovered: DiscoveredCamera[]; discover: () => void;
  /** An administrator sets the zones to ignore; anybody else only sees them. */
  isAdmin?: boolean;
};

const emptyConnection = (): CameraConnection => ({ id: "", name: "", host: "", snapshotUrl: "", rtspPath: "", previewPath: "", username: "", password: "", onvifPort: 80, rtspPort: 554 });
// No password is kept here after it is sent: the server keeps the credentials (encrypted), an empty password with the same user name keeps them, and a Map that lived as long as the tab
// filled the password again for whoever signed in next on a shared computer.

/** A camera id that also works when Studio is opened over plain http (no secure context, so no crypto.randomUUID). */
export function newCameraId(): string {
  const bytes = new Uint8Array(4);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return "cam-" + Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

/** The server accepts a bare host name or address: drop a pasted scheme, credentials, port and path. */
export function cleanCameraHost(value: string): string {
  return value.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/^[^@/]*@/, "").replace(/[/?#].*$/, "").replace(/:\d+$/, "");
}

export function CameraSettings(props: Props) {
  const { t } = props;
  const [selectedId, setSelectedId] = useState(props.selectedCameraId || props.cameras[0]?.id || "");
  const [form, setForm] = useState<CameraConnection>(emptyConnection);
  const [message, setMessage] = useState("");
  const [lenses, setLenses] = useState<LensDraft[]>(() => newLenses(2));
  const [found, setFound] = useState<string[]>([]);
  const [finding, setFinding] = useState(false);
  const selected = props.cameras.find(camera => camera.id === selectedId);

  useEffect(() => {
    if (props.selectedCameraId) setSelectedId(props.selectedCameraId);
  }, [props.selectedCameraId]);

  useEffect(() => {
    if (!selected) return;
    setForm({ id: selected.id, name: selected.name, host: selected.host === "Not configured" ? "" : selected.host,
      snapshotUrl: selected.snapshotUrl, rtspPath: selected.rtspPath ?? "", previewPath: selected.previewPath ?? "", username: selected.username ?? "", password: "", onvifPort: selected.onvifPort ?? 80, rtspPort: selected.rtspPort ?? 554,
      layout: selected.layout, group: selected.group, lensName: selected.lensName, preset: selected.preset, ptz: selected.ptz, zoom: selected.zoom, webUrl: selected.webUrl, params: selected.params });
  }, [selectedId, selected?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  const update = <K extends keyof CameraConnection>(key: K, value: CameraConnection[K]) => setForm(current => ({ ...current, [key]: value }));
  const selectCamera = (id: string) => { setSelectedId(id); props.onCameraSelected(id); };
  const newCamera = () => { setSelectedId(""); setForm(emptyConnection()); setLenses(newLenses(2)); setFound([]); setMessage(""); };
  const choosePreset = (value: string) => {
    if (!isCameraPreset(value)) { update("preset", undefined); return; }
    setForm(current => ({ ...current, preset: value, ...presetTraits(value) }));
  };
  const setParam = (key: "wifiSsid" | "ip" | "encoder" | "resolution", value: string) => setForm(current => ({ ...current, params: { ...current.params, [key]: value } }));
  const setBitrate = (value: string) => setForm(current => ({ ...current, params: { ...current.params, bitrateKbps: value === "" ? undefined : Number(value) } }));
  const changeLens = (index: number, change: Partial<LensDraft>) => setLenses(current => current.map((lens, at) => at === index ? { ...lens, ...change } : lens));
  const isNewMulti = form.preset === "multi" && !form.id;
  const persist = async (): Promise<PublicCameraConnection | undefined> => {
    if (!form.name.trim() || !form.host.trim()) { setMessage(t("cameraRequired")); return undefined; }
    if (snapshotHasLogin(form.snapshotUrl)) { setMessage(t("snapshot_login_refused")); return undefined; }
    try {
      const saved = await configureCamera(props.origin, { ...form, id: form.id || newCameraId(), host: cleanCameraHost(form.host) });
      setForm(current => ({ ...current, id: saved.id, password: "" }));   // sent: it is not kept
      props.onCameraSaved({ ...saved, enabled: selected?.enabled ?? true, x: selected?.x ?? 50, y: selected?.y ?? 50 });
      selectCamera(saved.id);
      return saved;
    } catch (error) { setMessage(`${t("cameraSaveFailed")} (${error instanceof Error ? error.message : ""})`); return undefined; }
  };
  const saveCamera = async () => {
    if (!isNewMulti) { if (await persist()) setMessage(t("cameraSaved")); return; }
    if (!form.name.trim() || !form.host.trim()) { setMessage(t("cameraRequired")); return; }
    try {
      // One camera per lens, each with its own stream and its own movement, tied by a group.
      let last: PublicCameraConnection | undefined;
      for (const camera of lensCameras({ ...form, host: cleanCameraHost(form.host) }, newCameraId(), lenses)) {
        last = await configureCamera(props.origin, camera);
        props.onCameraSaved({ ...last, enabled: true, x: 50, y: 50 });
      }
      setForm(current => ({ ...current, password: "" }));
      if (last) selectCamera(last.id);
      setMessage(t("cameraSaved"));
    } catch (error) { setMessage(`${t("cameraSaveFailed")} (${error instanceof Error ? error.message : ""})`); }
  };
  /** One button for the whole thing: it saves what is on the form (the camera has to be known to the server) and then tries the paths of the camera's family. */
  const findStream = async () => {
    setFinding(true); setFound([]); setMessage(t("cs_finding"));
    try {
      const saved = await persist();
      if (!saved) return;
      setMessage(t("cs_finding"));
      const result = await discoverCameraStreams(props.origin, saved.id);
      setFound(result.paths);
      if (!result.paths.length) { setMessage(t("cs_not_found")); return; }
      setForm(current => ({ ...current, rtspPath: result.camera.rtspPath ?? result.paths[0], previewPath: result.camera.previewPath ?? current.previewPath }));
      props.onCameraSaved({ ...result.camera, enabled: selected?.enabled ?? true, x: selected?.x ?? 50, y: selected?.y ?? 50 });
      setMessage(`${t("rtspFound")}: ${result.paths.length}`);
    } catch { setMessage(t("rtspDiscoverFailed")); }
    finally { setFinding(false); }
  };
  const useFound = async (path: string, as: "rtspPath" | "previewPath") => {
    const clean = path.replace(/^\/+/, "");
    update(as, clean);
  };
  const pickDiscovered = (device: DiscoveredCamera) => {
    setSelectedId("");
    setForm({ ...emptyConnection(), host: device.host });
    setFound([]);
  };
  const removeCamera = async () => {
    if (!selected || !(await askConfirm(t("confirmDeleteCamera"), t))) return;
    try { await deleteCamera(props.origin, selected.id); props.onCameraDeleted(selected.id); newCamera(); setMessage(t("cameraDeleted")); }
    catch { setMessage(t("cameraDeleteFailed")); }
  };
  const hasLogin = Boolean(selected?.hasCredentials || (form.username && form.password));
  const connectionReady = Boolean(form.name.trim() && form.host.trim() && hasLogin);
  const streamReady = isNewMulti ? lenses.some(lens => lens.rtspPath.trim()) : Boolean(form.rtspPath.trim());
  const summary = {
    connection: connectionReady ? `${form.name} · ${cleanCameraHost(form.host)}` : t("cs_sum_incomplete"),
    stream: streamReady ? (form.rtspPath || t("cs_sum_ready")) : t("cs_sum_no_stream"),
    type: form.preset ? t(presetKey(form.preset as never)) : "—",
    extras: form.webUrl || form.params?.encoder || "—",
  };
  const tagOf = (path: string) => (form.rtspPath === path.replace(/^\/+/, "") ? t("cs_use_main") : form.previewPath === path.replace(/^\/+/, "") ? t("cs_use_light") : "");

  return <div className="camera-settings">
    <aside className="camera-picker"><button className="primary" onClick={newCamera}>{t("newCamera")}</button>{props.cameras.map(camera => <button key={camera.id} className={camera.id === selectedId ? "active" : ""} onClick={() => selectCamera(camera.id)}><b>{camera.name}</b><small>{camera.host}{camera.lensName ? ` · ${camera.lensName}` : ""}</small></button>)}
      <div className="camera-discovery"><button onClick={props.discover}>{t("networkDiscovery")}</button><small>{t("discoveryHelp")}</small>
        {props.discovered.length > 0 && <><small>{t("selectCandidate")}</small>{props.discovered.map(camera => <button key={camera.host} onClick={() => pickDiscovered(camera)}>{camera.host} · {camera.ports.join(", ")}</button>)}</>}</div>
    </aside>
    <article className="stack-card camera-form cam-editor">
      <header className="cam-ed-head"><h3>{form.id ? t("editCamera") : t("newCamera")}</h3>
        <span className={`cam-ed-state ${form.id ? "saved" : "draft"}`}>{form.id ? (streamReady ? t("cs_sum_ready") : t("cs_sum_no_stream")) : t("cs_sum_unsaved")}</span>
        <div className="cam-ed-actions"><button className="primary" onClick={() => void saveCamera()} disabled={finding}>{t("saveCamera")}</button>{form.id && <button className="danger-button" onClick={() => void removeCamera()}>{t("deleteCamera")}</button>}</div></header>
      {message && <p className="notice cam-ed-message" role="status">{message}</p>}

      <details className="cam-step" open><summary><b>1</b><span>{t("cs_step1")}</span><small>{summary.connection}</small></summary>
        <div className="cam-step-body">
          <div className="camera-field"><label><span>{t("cameraName")}</span><input value={form.name} onChange={event => update("name", event.target.value)} /></label></div>
          <div className="camera-field"><label><span>{t("hostAddress")}</span><input placeholder="192.168.0.200" value={form.host} onChange={event => update("host", event.target.value)} /></label></div>
          <div className="camera-field"><label><span>{t("cameraUser")}</span><input autoComplete="username" value={form.username} onChange={event => update("username", event.target.value)} /></label></div>
          <div className="camera-field"><label><span>{t("cameraPassword")}</span><PasswordInput t={t} autoComplete="current-password" placeholder={selected?.hasCredentials && !form.password ? "••••••••" : undefined} value={form.password} onChange={event => update("password", event.target.value)} /></label></div>
          <p className="field-help camera-field-wide">{selected?.hasCredentials && !form.password ? t("credentialsStored") : t("cs_login_help")}</p>
          <details className="cam-sub camera-field-wide"><summary>{t("cs_ports")}</summary>
            <div className="cam-step-body">
              <div className="camera-field"><label><span>{t("onvifPort")}</span><input type="number" min="1" max="65535" value={form.onvifPort} onChange={event => update("onvifPort", Number(event.target.value))} /></label></div>
              <div className="camera-field"><label><span>{t("rtspPort")}</span><input type="number" min="1" max="65535" value={form.rtspPort} onChange={event => update("rtspPort", Number(event.target.value))} /></label></div>
            </div></details>
        </div></details>

      <details className="cam-step" open><summary><b>2</b><span>{t("cs_step2")}</span><small>{summary.stream}</small></summary>
        <div className="cam-step-body">
          {!isNewMulti && <div className="camera-field-wide cam-find"><button className="primary cam-find-button" disabled={finding || !form.host.trim() || !hasLogin} onClick={() => void findStream()}>{finding ? "…" : t("cs_find")}</button>
            <p className="field-help">{t("rtspPathHelp")}</p></div>}
          {found.length > 0 && <div className="camera-field-wide cam-found"><h4>{t("cs_found")}</h4>
            {found.map(path => <div key={path} className="cam-found-row"><code>{path}</code>{tagOf(path) && <span className="cam-tag">{tagOf(path)}</span>}
              <button type="button" onClick={() => void useFound(path, "rtspPath")}>{t("cs_use_main")}</button><button type="button" onClick={() => void useFound(path, "previewPath")}>{t("cs_use_light")}</button></div>)}</div>}
          <p className="field-help camera-field-wide">{t("cs_dual_hint")}</p>
          <details className="cam-sub camera-field-wide" open={!form.rtspPath || isNewMulti}><summary>{t("cs_manual")}</summary>
            <div className="cam-step-body">
              {isNewMulti ? <fieldset className="camera-field camera-field-wide camera-lenses"><legend>{t("cam_lenses")}</legend>
                <label><span>{t("cam_lens_count")}</span><input type="number" min="2" max="8" value={lenses.length} onChange={event => setLenses(current => { const wanted = newLenses(Number(event.target.value) || 2); return wanted.map((lens, at) => current[at] ?? lens); })} /></label>
                {lenses.map((lens, index) => <div key={index} className="camera-lens-row"><b>{t("cam_lens")} {index + 1}</b>
                  <input aria-label={t("cameraName")} value={lens.name} onChange={event => changeLens(index, { name: event.target.value })} />
                  <input aria-label={t("rtspPath")} placeholder={t("rtspPath")} value={lens.rtspPath} onChange={event => changeLens(index, { rtspPath: event.target.value })} />
                  <input aria-label={t("previewPath")} placeholder={t("previewPath")} value={lens.previewPath} onChange={event => changeLens(index, { previewPath: event.target.value })} />
                  <label><input type="checkbox" checked={lens.ptz} onChange={event => changeLens(index, { ptz: event.target.checked })} /> {t("cam_can_ptz")}</label>
                  <label><input type="checkbox" checked={lens.zoom} onChange={event => changeLens(index, { zoom: event.target.checked })} /> {t("cam_can_zoom")}</label></div>)}
              </fieldset> : <>
                <div className="camera-field camera-field-wide"><label><span>{t("rtspPath")}</span><input placeholder="Streaming/Channels/101" value={form.rtspPath} onChange={event => update("rtspPath", event.target.value)} /></label></div>
                <div className="camera-field camera-field-wide"><label><span>{t("previewPath")}</span><input placeholder="12" value={form.previewPath ?? ""} onChange={event => update("previewPath", event.target.value)} /></label><p className="field-help">{t("previewPathHelp")}</p></div>
              </>}
              <p className="field-help camera-field-wide">{t("cs_path_login")}</p>
              <div className="camera-field camera-field-wide"><label><span>{t("snapshotUrl")}</span><input placeholder="http://camera/snapshot.jpg" value={form.snapshotUrl} onChange={event => update("snapshotUrl", event.target.value)} /></label></div>
            </div></details>
        </div></details>

      <details className="cam-step" open={!form.preset}><summary><b>3</b><span>{t("cs_step3")}</span><small>{summary.type}</small></summary>
        <div className="cam-step-body">
          <div className="camera-field camera-field-wide"><label><span>{t("cam_preset")}</span><select value={form.preset ?? ""} onChange={event => choosePreset(event.target.value)}><option value="">—</option>{CAMERA_PRESETS.map(preset => <option key={preset} value={preset}>{t(presetKey(preset))}</option>)}</select></label>
            {form.layout === "split" && <p className="field-help">{t("cam_split_note")}</p>}{isNewMulti && <p className="field-help">{t("cam_multi_note")}</p>}</div>
          <div className="camera-field camera-field-wide camera-traits"><label><input type="checkbox" checked={form.ptz !== false} onChange={event => update("ptz", event.target.checked)} /> {t("cam_can_ptz")}</label> <label><input type="checkbox" checked={form.zoom !== false} onChange={event => update("zoom", event.target.checked)} /> {t("cam_can_zoom")}</label></div>
        </div></details>

      <details className="cam-step"><summary><b>4</b><span>{t("cs_step4")}</span><small>{summary.extras}</small></summary>
        <div className="cam-step-body">
          <div className="camera-field camera-field-wide camera-web"><label><span>{t("cam_web_url")}</span><input placeholder="http://192.168.0.200/" value={form.webUrl ?? ""} onChange={event => update("webUrl", event.target.value)} /></label>
            <button type="button" disabled={!cameraWebAddress(form)} onClick={() => { const address = cameraWebAddress({ ...form, host: cleanCameraHost(form.host) }); if (address) window.open(address, "_blank", "noopener,noreferrer"); }}>{t("cam_open_web")}</button></div>
          <details className="cam-sub camera-field-wide camera-params"><summary>{t("cam_params")}</summary><p className="field-help">{t("cam_params_help")}</p>
            <div className="cam-step-body">
              <label><span>{t("cam_param_wifi")}</span><input value={form.params?.wifiSsid ?? ""} onChange={event => setParam("wifiSsid", event.target.value)} /></label>
              <label><span>{t("cam_param_ip")}</span><input value={form.params?.ip ?? ""} onChange={event => setParam("ip", event.target.value)} /></label>
              <label><span>{t("cam_param_encoder")}</span><input placeholder="H.265" value={form.params?.encoder ?? ""} onChange={event => setParam("encoder", event.target.value)} /></label>
              <label><span>{t("cam_param_bitrate")}</span><input type="number" min="16" value={form.params?.bitrateKbps ?? ""} onChange={event => setBitrate(event.target.value)} /></label>
              <label><span>{t("cam_param_resolution")}</span><input placeholder="2560x1440" value={form.params?.resolution ?? ""} onChange={event => setParam("resolution", event.target.value)} /></label>
            </div></details>
        </div></details>
    </article>
    {form.id && <IgnoreZonesEditor t={t} origin={props.origin} cameraId={form.id} isAdmin={Boolean(props.isAdmin)} />}
  </div>;
}
