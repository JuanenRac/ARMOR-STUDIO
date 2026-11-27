/**
 * Configuration > Battery maintenance > Firmware of a whole stack: one module at a time, with the console cable moved to each one. The list is the one read from the first battery of the
 * stack; for each module the person moves the cable, asks to check it (nothing is written), types its serial number and confirms; a module that fails stops the campaign; at the end the
 * cable goes back to the first battery. The server and the node apply every lock; nothing here can force a module. See ARMOR-SERVER src/battery_campaign.ts.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { ApiError, batteryImageUpload, listSolar } from "./api";
import { batteryCampaignCreate, batteryCampaigns, batteryCampaignStep, type BatteryCampaign as Campaign, type BatteryImage } from "./api/battery";
import { fill } from "./FirmwarePanel";
import { errorKey } from "./batteryModel";

type Translate = (key: string) => string;
type Props = { t: Translate; origin: string; enabled: boolean };

/** The sentence for why a module is not done: what the campaign itself can say first, else the sentences of the refusals. */
export function campaignCodeKey(code: string, known: (key: string) => boolean): string {
  const head = code.startsWith("firmware:") ? "firmware" : code.startsWith("verify:") ? code.slice(7) : code === "step_failed:barcode" ? "barcode" : code;
  return known(`bc_code_${head}`) ? `bc_code_${head}` : errorKey(head, known);
}

const OPEN: Campaign["state"][] = ["active", "stopped", "return_cable"];

export function BatteryCampaign({ t, origin, enabled }: Props) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stacks, setStacks] = useState<{ node: string; device: string }[]>([]);
  const [stack, setStack] = useState("");
  const [port, setPort] = useState("1");
  const [image, setImage] = useState<BatteryImage | null>(null);
  const [serial, setSerial] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const known = useCallback((key: string) => t(key) !== key, [t]);
  const explain = useCallback((error: unknown) => t(campaignCodeKey(error instanceof ApiError ? error.code : "generic", known)), [t, known]);

  const refresh = useCallback(async () => {
    try {
      const [list, solar] = await Promise.all([batteryCampaigns(origin), listSolar(origin)]);
      const found = list.campaigns.find(item => OPEN.includes(item.state)) ?? list.campaigns[0] ?? null;
      setCampaign(found);
      const batteries = solar.devices.filter(item => item.kind === "battery" && !item.example).map(item => ({ node: item.node_id, device: item.device }));
      setStacks(batteries);
      setStack(current => current || (batteries[0] ? `${batteries[0].node}/${batteries[0].device}` : ""));
    } catch (error) { setMessage(explain(error)); }
  }, [origin, explain]);
  useEffect(() => { void refresh(); }, [refresh]);

  const waiting = campaign?.state === "active" && ["checking", "ready", "updating"].includes(campaign.modules[campaign.current]?.status ?? "");
  useEffect(() => {
    if (!waiting) return;
    const timer = window.setInterval(() => { void refresh(); }, 2000);
    return () => window.clearInterval(timer);
  }, [waiting, refresh]);

  const run = async (action: () => Promise<Campaign>) => {
    setBusy(true); setMessage("");
    try { setCampaign(await action()); setSerial(""); } catch (error) { setMessage(explain(error)); } finally { setBusy(false); }
  };
  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true); setMessage(t("bm_image_sending"));
    try { setImage(await batteryImageUpload(origin, file)); setMessage(""); } catch (error) { setMessage(explain(error)); } finally { setBusy(false); }
  };

  const open = campaign !== null && OPEN.includes(campaign.state);
  const module = campaign?.modules[campaign.current];
  const [node = "", device = ""] = stack.split("/");

  return <article className="stack-card full-card" data-testid="battery-campaign">
    <h3>{t("bc_title")}</h3>
    <p className="muted">{t("bc_help")}</p>
    {message && <p className="login-notice" role="alert">{message}</p>}
    {!open && <div className="form-grid">
      <label>{t("bc_stack")}<select value={stack} onChange={event => setStack(event.target.value)}>{stacks.map(item => <option key={`${item.node}/${item.device}`} value={`${item.node}/${item.device}`}>{item.node} · {item.device}</option>)}</select></label>
      <label>{t("bm_port")}<input type="number" min={1} max={10} value={port} onChange={event => setPort(event.target.value)} /></label>
      <label>{t("bm_image_file")}<input type="file" accept=".bin,application/octet-stream" onChange={event => void pick(event)} disabled={busy || !enabled} /></label>
      {image && <p className="mono">{fill(t("bm_image_read"), image.board, image.version, Math.round(image.size / 1024))}<br />SHA-256 {image.sha256}</p>}
      <div className="confirm-actions"><button className="primary" disabled={busy || !enabled || !image || !stack} onClick={() => void run(() => batteryCampaignCreate(origin, { node, port: Number(port), device, image_id: image!.image_id }))}>{t("bc_start")}</button></div>
    </div>}
    {campaign && <>
      <p><strong>{t(`bc_state_${campaign.state}`)}</strong> · {campaign.node}/{campaign.port} · {campaign.image.board} {campaign.image.version}</p>
      <div className="scroll"><table>
        <thead><tr><th>#</th><th>{t("bm_serial")}</th><th>{t("bc_model")}</th><th>{t("bc_chip")}</th><th>{t("bc_version")}</th><th>{t("bm_col_result")}</th></tr></thead>
        <tbody>{campaign.modules.map((item, index) => <tr key={item.number} aria-current={open && index === campaign.current ? "step" : undefined}>
          <td>{item.number}</td><td className="mono">{item.serial}</td><td>{item.model} {item.board}</td><td>{t(`bc_chip_${item.chip}`)}</td>
          <td>{item.version ?? "—"}{item.version_after ? ` → ${item.version_after}` : ""}</td><td>{t(`bc_module_${item.status}`)}</td>
        </tr>)}</tbody>
      </table></div>
      {open && module?.code && <p className="login-notice" role="alert">{t(campaignCodeKey(module.code, known))} {fill(t("bm_code"), module.code)}</p>}
      {campaign.state === "active" && module && module.status === "pending" && <>
        <p className="login-notice" role="note">{fill(t("bc_connect"), module.number, module.serial)}</p>
        {module.resume && <p className="login-notice">{t("bc_resume_note")}</p>}
        {image && <p className="hint">{t("bc_image_again")}</p>}
        <label>{t("bm_image_file")}<input type="file" accept=".bin,application/octet-stream" onChange={event => void pick(event)} disabled={busy} /></label>
        <div className="confirm-actions"><button className="primary" disabled={busy || !enabled} onClick={() => void run(() => batteryCampaignStep(origin, campaign.id, "check", image ? { image_id: image.image_id } : {}))}>{t("bc_check")}</button></div>
      </>}
      {campaign.state === "active" && module?.status === "checking" && <p className="muted">{t("bc_checking")}</p>}
      {campaign.state === "active" && module?.status === "ready" && <>
        <p className="login-notice" role="alert">{fill(t("bc_confirm"), module.number, module.serial, campaign.image.version)}</p>
        <label>{t("bm_serial_again")}<input className="mono" data-testid="campaign-serial" value={serial} onChange={event => setSerial(event.target.value)} autoComplete="off" spellCheck={false} /></label>
        <div className="confirm-actions"><button className="primary" disabled={busy || serial.trim() !== module.serial} onClick={() => void run(() => batteryCampaignStep(origin, campaign.id, "execute", { serial: serial.trim() }))}>{t("bm_execute")}</button></div>
      </>}
      {campaign.state === "active" && module?.status === "updating" && <p className="login-notice" role="status">{t("bc_updating")}</p>}
      {campaign.state === "stopped" && <>
        <p className="login-notice" role="alert">{t("bc_stopped")}</p>
        <div className="confirm-actions"><button disabled={busy || !enabled} onClick={() => void run(() => batteryCampaignStep(origin, campaign.id, "retry", {}))}>{t("bc_retry")}</button></div>
      </>}
      {campaign.state === "return_cable" && <>
        <p className="login-notice" role="note">{t("bc_return")}</p>
        <div className="confirm-actions"><button className="primary" disabled={busy} onClick={() => void run(() => batteryCampaignStep(origin, campaign.id, "finish", {}))}>{t("bc_finish")}</button></div>
      </>}
      {open && module?.status !== "updating" && campaign.state !== "return_cable" && <button disabled={busy} onClick={() => void run(() => batteryCampaignStep(origin, campaign.id, "cancel", {}))}>{t("bc_cancel")}</button>}
    </>}
  </article>;
}
