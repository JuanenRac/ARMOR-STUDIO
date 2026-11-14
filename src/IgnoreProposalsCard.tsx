/**
 * Configuration > Security: the areas to ignore that the observation service proposes while the option to study the pictures is on. An administrator sees, for each camera, the rectangles
 * proposed on a small drawing of its picture and accepts or rejects them. Nothing is applied before; a rejected proposal is not made again.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useState } from "react";
import { decideIgnoreProposal, getIgnoreProposals } from "./api/ignoreProposals";
import { errorText } from "./apiErrorText";
import { proposalRects, type ProposalShown, proposalsShown } from "./ignoreProposalsView";

const EVERY_MS = 60_000;

export function IgnoreProposalsCard({ t, origin }: { t: (key: string) => string; origin: string }) {
  const [shown, setShown] = useState<ProposalShown[]>([]);
  const [message, setMessage] = useState({ text: "", bad: false });
  const [busy, setBusy] = useState(false);
  const read = useCallback(async () => {
    try { setShown(proposalsShown(await getIgnoreProposals(origin))); setMessage(previous => (previous.bad ? { text: "", bad: false } : previous)); }
    catch (error) { setMessage({ text: errorText(t, error, "ipc_err_"), bad: true }); }
  }, [origin, t]);
  useEffect(() => {
    void read();
    const timer = window.setInterval(() => void read(), EVERY_MS);
    return () => window.clearInterval(timer);
  }, [read]);
  const decide = async (cameraId: string, decision: "accept" | "reject") => {
    if (busy) return;
    setBusy(true);
    try {
      const done = await decideIgnoreProposal(origin, cameraId, decision);
      setMessage({ text: decision === "accept" ? t("ipc_accepted").replace("{0}", String(done.zones.length)) : t("ipc_rejected"), bad: false });
      setShown(await getIgnoreProposals(origin).then(proposalsShown));
    } catch (error) { setMessage({ text: errorText(t, error, "ipc_err_"), bad: true }); }
    finally { setBusy(false); }
  };
  return <article className="stack-card sec-card" data-testid="security-ignore-proposals">
    <h3>{t("ipc_title")}</h3>
    <p className="muted">{t("ipc_help")}</p>
    {message.text && <p className={message.bad ? "notice bad" : "notice"} role="status" data-testid="ignore-proposals-message">{message.text}</p>}
    {shown.length === 0
      ? <p className="muted" data-testid="ignore-proposals-none">{t("ipc_none")}</p>
      : <ul className="plain-list" data-testid="ignore-proposals-list">{shown.map(item => <li key={item.cameraId} data-testid={`ignore-proposal-${item.cameraId}`}>
        <strong>{item.cameraName}</strong> <span className="muted small">{t("ipc_areas").replace("{0}", String(item.rects.length))}</span>
        <svg viewBox="0 0 160 90" width="160" height="90" role="img" aria-label={`${item.cameraName}: ${t("ipc_areas").replace("{0}", String(item.rects.length))}`} className="ignore-preview">
          <rect x="0" y="0" width="160" height="90" fill="none" stroke="currentColor" strokeOpacity="0.4" />
          {proposalRects(item.rects, 160, 90).map((rect, index) => <rect key={index} x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill="currentColor" fillOpacity="0.3" stroke="currentColor" />)}
        </svg>
        <div className="users-actions">
          <button disabled={busy} onClick={() => void decide(item.cameraId, "accept")} data-testid={`ignore-proposal-accept-${item.cameraId}`}>{t("ipc_accept")}</button>
          <button disabled={busy} onClick={() => void decide(item.cameraId, "reject")} data-testid={`ignore-proposal-reject-${item.cameraId}`}>{t("ipc_reject")}</button>
        </div>
      </li>)}</ul>}
    <div className="users-actions"><button onClick={() => void read()} data-testid="ignore-proposals-refresh">{t("ipc_refresh")}</button></div>
  </article>;
}
