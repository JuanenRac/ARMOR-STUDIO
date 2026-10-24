/**
 * Configuration > Security, for an administrator: the way in from outside the house made with choices instead of files - the VPN (WireGuard: set it up, add a phone with a QR code,
 * remove it), the name that follows the house (dynamic DNS) and the panels of the nodes reached through the server (register the node, look at its certificate, trust it, open it).
 * The work is done by the maintenance helper; this only asks for it and says what happened in plain words.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { PasswordInput } from "./components/PasswordInput";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ddnsRemove, ddnsSetup, ddnsUpdate, listNodePanels, remoteTls, nodePanelFingerprint, nodePanelUrl, remoteSetupState, removeNodePanel, saveNodePanel, vpnAddPeer, vpnRemovePeer,
  vpnSetup, vpnShowPeer, type DdnsInput, type NodePanel, type RemoteSetupState, type RemoteTls, type VpnPeerConfig } from "./api";
import { askConfirm } from "./askConfirm";
import { errorText } from "./apiErrorText";

type T = (key: string) => string;
type Props = { t: T; origin: string };
type Say = (text: string, bad?: boolean) => void;

const explain = (t: T, error: unknown): string => errorText(t, error, "sec_err_");
const fill = (text: string, ...values: string[]) => text.replace(/\{(\d+)\}/g, (_match, index: string) => values[Number(index)] ?? "");

function useMessage(): [{ text: string; bad: boolean }, Say] {
  const [message, setMessage] = useState({ text: "", bad: false });
  return [message, (text, bad = false) => setMessage({ text, bad })];
}
const Notice = ({ message }: { message: { text: string; bad: boolean } }) => (message.text ? <p className={`notice ${message.bad ? "bad" : ""}`} role="status">{message.text}</p> : null);

/** The configuration of a device: the QR code to scan (drawn from the SVG the machine made) and the text to copy. It holds a private key, so it is shown once and closed. */
function PeerConfig({ t, view, qr, onClose }: { t: T; view: VpnPeerConfig; qr: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const picture = view.qr_svg ? `data:image/svg+xml;utf8,${encodeURIComponent(view.qr_svg)}` : null;
  return <section className="notice" data-testid="vpn-config">
    <h4>{t("rem_vpn_config_title")}: {view.name}</h4>
    <p className="muted">{t("rem_vpn_config_warn")}</p>
    {picture ? <img src={picture} alt="WireGuard QR" width={240} height={240} style={{ background: "#fff", padding: 8 }} /> : !qr && <p className="muted">{t("rem_vpn_qr_missing")}</p>}
    <textarea readOnly rows={9} value={view.config} onFocus={event => event.currentTarget.select()} style={{ width: "100%", fontFamily: "monospace" }} />
    <p>
      <button type="button" onClick={() => { void navigator.clipboard?.writeText(view.config).then(() => setCopied(true)).catch(() => undefined); }}>{copied ? t("rem_copied") : t("rem_copy")}</button>
      {" "}<button type="button" className="primary" onClick={onClose}>{t("rem_close")}</button>
    </p>
  </section>;
}

function Vpn({ t, origin, state, reload }: Props & { state: RemoteSetupState; reload: () => Promise<void> }) {
  const vpn = state.wireguard;
  const [message, say] = useMessage();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ endpoint: "", port: "51820", lan: "192.168.0.0/24", route: "" });
  const [name, setName] = useState("");
  const [full, setFull] = useState(false);
  const [view, setView] = useState<VpnPeerConfig | null>(null);
  const run = async (work: () => Promise<void>) => { say(""); setBusy(true); try { await work(); await reload(); } catch (error) { say(explain(t, error), true); } finally { setBusy(false); } };

  const setup = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => { await vpnSetup(origin, { endpoint: form.endpoint.trim(), port: Number(form.port) || 51820, lan: form.lan.trim(), ...(form.route.trim() ? { route_lan: form.route.trim() } : {}) }); });
  };
  const add = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => { setView(await vpnAddPeer(origin, name.trim(), full)); setName(""); setFull(false); });
  };
  const remove = async (peer: string) => {
    if (!(await askConfirm(t("rem_vpn_remove_confirm"), t))) return;
    void run(async () => { await vpnRemovePeer(origin, peer); setView(current => (current?.name === peer ? null : current)); });
  };

  return <article className="stack-card sec-card" data-testid="remote-vpn">
    <h3>{t("rem_vpn_title")}</h3>
    {!vpn.script ? <p className="muted">{t("rem_unavailable")}</p> : !vpn.tool ? <p className="notice bad">{t("rem_vpn_missing_tool")}</p> : !vpn.configured ? <form onSubmit={setup}>
      <label>{t("rem_vpn_endpoint")}<input value={form.endpoint} onChange={event => setForm({ ...form, endpoint: event.target.value })} placeholder="home.duckdns.org" /></label>
      <label>{t("rem_vpn_port")}<input inputMode="numeric" value={form.port} onChange={event => setForm({ ...form, port: event.target.value.replace(/\D/g, "") })} /></label>
      <label>{t("rem_vpn_lan")}<input value={form.lan} onChange={event => setForm({ ...form, lan: event.target.value })} placeholder="192.168.0.0/24" /></label>
      <label>{t("rem_vpn_route")}<input value={form.route} onChange={event => setForm({ ...form, route: event.target.value })} placeholder="eth0" /></label>
      <button className="primary" disabled={busy || form.endpoint.trim() === ""}>{t("rem_vpn_setup")}</button>
    </form> : <>
      <p className="notice"><b>{vpn.running ? t("rem_vpn_on") : t("rem_vpn_off")}</b> {vpn.endpoint} · {vpn.subnet}</p>
      <p className="muted">{fill(t("rem_vpn_router"), vpn.endpoint?.split(":")[1] ?? vpn.port ?? "51820")}</p>
      <h4>{t("rem_vpn_devices")}</h4>
      {vpn.peers.length === 0 ? <p className="muted">{t("rem_vpn_none")}</p> : <ul className="plain-list">
        {vpn.peers.map(peer => <li key={peer.name}>
          <b>{peer.name}</b> <span className="muted">{peer.address}</span>{" "}
          <button type="button" disabled={busy} onClick={() => void run(async () => { setView(await vpnShowPeer(origin, peer.name)); })}>{t("rem_vpn_show")}</button>{" "}
          <button type="button" className="danger" disabled={busy} onClick={() => void remove(peer.name)}>{t("rem_vpn_remove")}</button>
        </li>)}
      </ul>}
      <form onSubmit={add}>
        <h4>{t("rem_vpn_add")}</h4>
        <label>{t("rem_vpn_name")}<input value={name} onChange={event => setName(event.target.value.replace(/[^A-Za-z0-9_-]/g, ""))} maxLength={32} /></label>
        <label className="check"><input type="checkbox" checked={full} onChange={event => setFull(event.target.checked)} /> {t("rem_vpn_full")}</label>
        <button className="primary" disabled={busy || name === ""}>{t("rem_vpn_create")}</button>
      </form>
      {view && <PeerConfig t={t} view={view} qr={vpn.qr} onClose={() => setView(null)} />}
    </>}
    <Notice message={message} />
  </article>;
}

function Ddns({ t, origin, state, reload }: Props & { state: RemoteSetupState; reload: () => Promise<void> }) {
  const dyn = state.ddns;
  const [message, say] = useMessage();
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<DdnsInput["provider"]>("duckdns");
  const [form, setForm] = useState({ domain: "", token: "", zone: "", record: "", url: "" });
  const run = async (work: () => Promise<void>) => { say(""); setBusy(true); try { await work(); await reload(); } catch (error) { say(explain(t, error), true); } finally { setBusy(false); } };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const input: DdnsInput = provider === "duckdns" ? { provider, domain: form.domain.trim(), token: form.token.trim() }
      : provider === "cloudflare" ? { provider, zone: form.zone.trim(), record_name: form.record.trim(), token: form.token.trim() } : { provider, url: form.url.trim() };
    void run(async () => { await ddnsSetup(origin, input); setForm({ domain: "", token: "", zone: "", record: "", url: "" }); });
  };
  const ready = provider === "duckdns" ? form.domain.trim() !== "" && form.token.trim() !== "" : provider === "cloudflare" ? form.zone.trim() !== "" && form.record.trim() !== "" && form.token.trim() !== "" : form.url.trim() !== "";
  return <article className="stack-card sec-card" data-testid="remote-ddns">
    <h3>{t("rem_ddns_title")}</h3>
    <p className="muted">{t("rem_ddns_help")}</p>
    {!dyn.script ? <p className="muted">{t("rem_unavailable")}</p> : dyn.configured ? <>
      <p className="notice">{fill(t("rem_ddns_state"), dyn.name || "-", dyn.provider ?? "", dyn.last_address || "-")}</p>
      <p>
        <button type="button" disabled={busy} onClick={() => void run(async () => { await ddnsUpdate(origin); })}>{t("rem_ddns_update")}</button>{" "}
        <button type="button" className="danger" disabled={busy} onClick={() => void run(async () => { await ddnsRemove(origin); })}>{t("rem_ddns_stop")}</button>
      </p>
    </> : <form onSubmit={save}>
      <p className="muted">{t("rem_ddns_off")}</p>
      <label>{t("rem_ddns_provider")}<select value={provider} onChange={event => setProvider(event.target.value as DdnsInput["provider"])}>
        <option value="duckdns">{t("rem_ddns_duckdns")}</option><option value="cloudflare">{t("rem_ddns_cloudflare")}</option><option value="url">{t("rem_ddns_url")}</option></select></label>
      {provider === "duckdns" && <label>{t("rem_ddns_domain")}<input value={form.domain} onChange={event => setForm({ ...form, domain: event.target.value.toLowerCase() })} /></label>}
      {provider === "cloudflare" && <><label>{t("rem_ddns_zone")}<input value={form.zone} onChange={event => setForm({ ...form, zone: event.target.value })} /></label>
        <label>{t("rem_ddns_record")}<input value={form.record} onChange={event => setForm({ ...form, record: event.target.value })} /></label></>}
      {provider === "url" ? <label>{t("rem_ddns_address")}<input value={form.url} onChange={event => setForm({ ...form, url: event.target.value })} placeholder="https://…?ip={ip}" /></label>
        : <label>{t("rem_ddns_token")}<PasswordInput t={t} autoComplete="off" value={form.token} onChange={event => setForm({ ...form, token: event.target.value })} /></label>}
      <button className="primary" disabled={busy || !ready}>{t("rem_ddns_save")}</button>
    </form>}
    <Notice message={message} />
  </article>;
}

/** The text that pairs a phone with the installation's own HTTPS: the pin of the authority that signs it, for the name the phone reaches the house by. */
function PhonePairing({ t, origin }: Props) {
  const [host, setHost] = useState(() => { try { const name = new URL(origin).hostname; return name === "localhost" || /^[0-9.]+$/.test(name) ? "" : name; } catch { return ""; } });
  const [found, setFound] = useState<RemoteTls | null>(null);
  const [message, say] = useMessage();
  const [busy, setBusy] = useState(false);
  const show = async () => { say(""); setBusy(true); try { setFound(await remoteTls(origin, host.trim().toLowerCase())); } catch (error) { setFound(null); say(explain(t, error), true); } finally { setBusy(false); } };
  const copy = async () => { try { await navigator.clipboard.writeText(found?.text ?? ""); say(t("rem_pair_copied")); } catch { say(""); } };
  return <article className="stack-card sec-card" data-testid="remote-pairing">
    <h3>{t("rem_pair_title")}</h3>
    <p className="muted">{t("rem_pair_help")}</p>
    <label>{t("rem_pair_host")}<input value={host} onChange={event => setHost(event.target.value)} placeholder="casa.duckdns.org" /></label>
    <p><button type="button" disabled={busy} onClick={() => void show()}>{t("rem_pair_show")}</button></p>
    {found && !found.present && <p className="notice">{t("rem_pair_none")}</p>}
    {found && found.present && !found.pin && <p className="notice bad">{t("rem_pair_error")}</p>}
    {found?.text && <>
      <p><code className="mono" data-testid="pairing-text">{found.text}</code> <button type="button" onClick={() => void copy()}>{t("rem_pair_copy")}</button></p>
      <p className="muted small">{fill(t("rem_pair_until"), found.subject ?? "-", found.not_after ?? "-")}</p>
    </>}
    <Notice message={message} />
  </article>;
}

function NodePanels({ t, origin }: Props) {
  const [panels, setPanels] = useState<NodePanel[]>([]);
  const [message, say] = useMessage();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ id: "", address: "", https: false });
  const [seen, setSeen] = useState<Record<string, { fingerprint: string; changed: boolean }>>({});
  const load = useCallback(() => listNodePanels(origin).then(reply => setPanels(reply.panels)).catch(() => undefined), [origin]);
  useEffect(() => { void load(); }, [load]);
  const run = async (work: () => Promise<void>) => { say(""); setBusy(true); try { await work(); await load(); } catch (error) { say(explain(t, error), true); } finally { setBusy(false); } };
  const add = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => { await saveNodePanel(origin, { id: form.id.trim().toLowerCase(), address: form.address.trim(), scheme: form.https ? "https" : "http" }); setForm({ id: "", address: "", https: false }); });
  };
  return <article className="stack-card sec-card" data-testid="remote-node-panels">
    <h3>{t("rem_np_title")}</h3>
    <p className="muted">{t("rem_np_help")}</p>
    {panels.length === 0 ? <p className="muted">{t("rem_np_none")}</p> : <ul className="plain-list">
      {panels.map(panel => <li key={panel.id}>
        <b>{panel.id}</b> <span className="muted">{panel.scheme}://{panel.address}{panel.port === (panel.scheme === "https" ? 443 : 80) ? "" : `:${panel.port}`}</span>{" "}
        {panel.scheme === "https" && <span className={panel.fingerprint ? "badge ok" : "badge warn"}>{panel.fingerprint ? t("rem_np_pinned") : t("rem_np_unpinned")}</span>}{" "}
        {(panel.scheme === "http" || panel.fingerprint) && <a className="button" href={nodePanelUrl(origin, panel.id)} target="_blank" rel="noopener noreferrer">{t("rem_np_open")}</a>}{" "}
        {panel.scheme === "https" && <button type="button" disabled={busy} onClick={() => void run(async () => { const reply = await nodePanelFingerprint(origin, panel.id, false); setSeen(current => ({ ...current, [panel.id]: { fingerprint: reply.fingerprint, changed: reply.changed } })); })}>{t("rem_np_trust")}</button>}{" "}
        <button type="button" className="danger" disabled={busy} onClick={() => void (async () => { if (await askConfirm(t("rem_np_remove_confirm"), t)) await run(async () => { await removeNodePanel(origin, panel.id); }); })()}>{t("rem_vpn_remove")}</button>
        {seen[panel.id] && <div className="notice">
          <p>{t("rem_np_fingerprint")} <code className="mono">{seen[panel.id]!.fingerprint.replace(/(.{2})(?=.)/g, "$1:")}</code></p>
          <p className="muted">{t("rem_np_compare")}</p>
          <button type="button" className="primary" disabled={busy} onClick={() => void run(async () => { await nodePanelFingerprint(origin, panel.id, true); setSeen(current => { const next = { ...current }; delete next[panel.id]; return next; }); })}>{t("rem_np_trust_now")}</button>
        </div>}
      </li>)}
    </ul>}
    <form onSubmit={add}>
      <label>{t("rem_np_id")}<input value={form.id} onChange={event => setForm({ ...form, id: event.target.value.replace(/[^A-Za-z0-9_-]/g, "") })} /></label>
      <label>{t("rem_np_address")}<input value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} placeholder="192.168.0.50" /></label>
      <label className="check"><input type="checkbox" checked={form.https} onChange={event => setForm({ ...form, https: event.target.checked })} /> {t("rem_np_https")}</label>
      <button className="primary" disabled={busy || form.id === "" || form.address.trim() === ""}>{t("rem_np_save")}</button>
    </form>
    <Notice message={message} />
  </article>;
}

/** The steps to reach the server from outside the house, each with its real state: what Studio can see is checked, what it cannot (the router) is said plainly. */
function Guide({ t, origin, state }: Props & { state: RemoteSetupState }) {
  const vpn = state.wireguard;
  const name = state.ddns.configured && state.ddns.name ? state.ddns.name : vpn.endpoint || "";
  const address = origin.replace(/\/$/, "");
  const steps: { title: string; ok: boolean; text: string }[] = [
    { title: t("rem_guide_s1"), ok: vpn.tool && vpn.script, text: vpn.tool && vpn.script ? t("rem_guide_s1_ok") : t("rem_guide_s1_bad") },
    { title: t("rem_guide_s2"), ok: vpn.configured && vpn.running, text: !vpn.configured ? t("rem_guide_s2_bad") : vpn.running ? t("rem_guide_s2_ok") : t("rem_guide_s2_stopped") },
    { title: t("rem_guide_s3"), ok: name !== "", text: name ? fill(t("rem_guide_s3_ok"), name) : t("rem_guide_s3_bad") },
    { title: t("rem_guide_s4"), ok: false, text: fill(t("rem_guide_s4_text"), vpn.port || "51820") },
    { title: t("rem_guide_s5"), ok: vpn.peers.length > 0, text: vpn.peers.length > 0 ? fill(t("rem_guide_s5_ok"), String(vpn.peers.length)) : t("rem_guide_s5_bad") },
    { title: t("rem_guide_s6"), ok: false, text: fill(t("rem_guide_s6_text"), address) },
  ];
  return <article className="stack-card sec-card" data-testid="remote-guide">
    <h4>{t("rem_guide_title")}</h4>
    <p className="muted">{t("rem_guide_help")}</p>
    <ol className="remote-steps">
      {steps.map((step, index) => <li key={index} className={step.ok ? "ok" : ""}>
        <strong>{step.ok ? "✓" : index === 3 || index === 5 ? "→" : "✗"} {step.title}</strong>
        {index !== 3 && index !== 5 && <span className="muted"> ({step.ok ? t("rem_guide_done") : t("rem_guide_todo")})</span>}
        <p className="muted">{step.text}</p>
      </li>)}
    </ol>
    <p className="muted">{t("rem_guide_note")}</p>
  </article>;
}

export function RemoteAccessSetup({ t, origin }: Props) {
  const [state, setState] = useState<RemoteSetupState | null | "unavailable">(null);
  const load = useCallback(async () => { try { setState(await remoteSetupState(origin)); } catch { setState("unavailable"); } }, [origin]);
  useEffect(() => { void load(); }, [load]);
  return <section className="sec-section" data-testid="security-group-outside">
    <h4 className="sec-section-title">{t("rem_title")}</h4>
    <p className="muted sec-section-note">{t("rem_help")}</p>
    {state === "unavailable" ? <article className="stack-card sec-card"><p className="muted">{t("rem_unavailable")}</p></article> : state && <>
      <Guide t={t} origin={origin} state={state} />
      <div className="sec-row"><Vpn t={t} origin={origin} state={state} reload={load} /><Ddns t={t} origin={origin} state={state} reload={load} /></div>
    </>}
    <PhonePairing t={t} origin={origin} />
    <NodePanels t={t} origin={origin} />
  </section>;
}
