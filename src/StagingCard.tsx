/**
 * Configuration > Updates > Try a new server before switching: whether an update of the server first starts the new one on the side and asks if it answers (the maintenance
 * helper's ARMOR_MAINT_STAGING), before the running server is replaced. Off by default. The work is the helper's; this card only shows the choice and sends it.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useState } from "react";
import { changeStaging, readStaging, type StagingState } from "./api";
import { explainMaintenance } from "./UpdatesPanel";

export function StagingCard({ t, origin }: { t: (key: string) => string; origin: string }) {
  const [state, setState] = useState<StagingState | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    readStaging(origin).then(found => { if (!cancelled) setState(found); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [origin]);
  if (!state) return null;
  const send = async (enabled: boolean) => {
    setBusy(true); setMessage("");
    try { setState(await changeStaging(origin, enabled)); setMessage(t("mt_au_saved")); }
    catch (error) { setMessage(explainMaintenance(t, error)); }
    finally { setBusy(false); }
  };
  return <article className="stack-card mt-auto" data-testid="staging-card">
    <h3>{t("mt_staging")}</h3>
    <p className="muted">{t("mt_staging_help")}</p>
    <label className="check"><input type="checkbox" checked={state.enabled} disabled={busy} onChange={event => void send(event.target.checked)} /> {t("mt_staging_label")}</label>
    {state.source === "env" && <p className="hint">{t("mt_staging_env")}</p>}
    {message && <p className="muted" role="status">{message}</p>}
  </article>;
}
