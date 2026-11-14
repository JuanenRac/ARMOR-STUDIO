/**
 * Configuration > Administration > Key of a node for the signed commands: an administrator types the id of a node and reads its `command_key` (the key the node checks the signature of the
 * critical commands with), to paste it in the settings of that node (`server.command_key` of an alarm panel, `command_key` of an electrical node). It is there only while the security option
 * `commands.require_sig` is on; it is shown for a minute and then forgotten by the screen, never stored, and the master key of the server is never in it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useState } from "react";
import { ApiError, readNodeKey } from "./api";

type Translate = (key: string) => string;
export const NODE_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
/** How long the key stays on the screen. */
export const SHOWN_MS = 60_000;

export function NodeKeyCard({ t, origin, isAdmin }: { t: Translate; origin: string; isAdmin: boolean }) {
  const [id, setId] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [absent, setAbsent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (key === null) return;
    const timer = window.setTimeout(() => { setKey(null); setCopied(false); }, SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [key]);
  if (!isAdmin) return null;
  const read = async () => {
    setMessage(""); setKey(null); setAbsent(false); setCopied(false);
    try {
      const answer = await readNodeKey(origin, id);
      if (answer.command_key) setKey(answer.command_key); else setAbsent(true);
    } catch (error) { setMessage(error instanceof ApiError && error.status === 422 ? t("nk_bad_id") : t("adm_err_generic")); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(key ?? ""); setCopied(true); } catch { setMessage(t("adm_err_generic")); } };
  return <article className="stack-card adm-card" data-testid="nodekey"><h3>{t("nk_title")}</h3><p className="muted">{t("nk_help")}</p>
    <label>{t("nk_id")}<input value={id} placeholder="alarm-1" autoComplete="off" onChange={event => setId(event.target.value.trim())} /></label>
    <div className="adm-foot"><button data-testid="nodekey-read" disabled={!NODE_ID.test(id)} onClick={() => void read()}>{t("nk_read")}</button></div>
    {absent && <p className="notice" role="note" data-testid="nodekey-off">{t("nk_off")}</p>}
    {key && <div className="notice" role="status" data-testid="nodekey-shown">
      <label>{t("nk_key")}<input readOnly value={key} onFocus={event => event.target.select()} /></label>
      <small className="hint">{t("nk_clears")}</small>
      <div className="adm-foot"><button data-testid="nodekey-copy" onClick={() => void copy()}>{copied ? t("nk_copied") : t("nk_copy")}</button></div>
    </div>}
    {message && <p className="notice bad" role="status">{message}</p>}
  </article>;
}
