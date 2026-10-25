/**
 * The way out of the example readings: a made-up reading tries a menu before a gateway node reports, and when the real ones are wanted this takes every example away, so that the devices
 * wait for their first real reading. Nothing is drawn when there is no example. Operators and administrators only.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState } from "react";
import { removeSolarExamples } from "../api";
import type { Translate } from "../components/camera";
import { fillAll } from "../nodeHealthModel";

export function ExamplesBar({ t, origin, count, reload }: { t: Translate; origin: string; count: number; reload: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (count === 0) return null;
  const remove = async () => {
    setBusy(true);
    setFailed(false);
    try { await removeSolarExamples(origin); reload(); } catch { setFailed(true); } finally { setBusy(false); }
  };
  return <div className="bat-examples" role="status">
    <span className="solar-pill warn">{t("solarExampleBadge")}</span>
    <button type="button" disabled={busy} onClick={() => void remove()}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></svg>
      {fillAll(t("bat_remove_examples"), count)}
    </button>
    {failed && <span className="solar-notice bad" role="alert">{t("solarSaveFailed")}</span>}
  </div>;
}
