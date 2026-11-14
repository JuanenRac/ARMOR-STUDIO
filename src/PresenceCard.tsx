/**
 * Configuration > Security: who is at home. An administrator sees the people whose phone told the server a word of the last day (home or away) and the sum the automations with a presence
 * trigger follow. It reads the server every half minute and on demand; while the option "presence by person" is off the server answers 404 and the card says how to turn it on.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useState } from "react";
import { getPresence } from "./api/presence";
import { errorText } from "./apiErrorText";
import { presenceShown, presenceSince, type PresenceShown } from "./presenceView";

const EVERY_MS = 30_000;

export function PresenceCard({ t, origin }: { t: (key: string) => string; origin: string }) {
  const [shown, setShown] = useState<PresenceShown | null>(null);
  const [problem, setProblem] = useState("");
  const read = useCallback(async () => {
    try { setShown(presenceShown(await getPresence(origin))); setProblem(""); }
    catch (error) { setShown(null); setProblem(errorText(t, error, "prc_err_")); }
  }, [origin, t]);
  useEffect(() => {
    void read();
    const timer = window.setInterval(() => void read(), EVERY_MS);
    return () => window.clearInterval(timer);
  }, [read]);
  return <article className="stack-card sec-card" data-testid="security-presence">
    <h3>{t("prc_title")}</h3>
    <p className="muted">{t("prc_help")}</p>
    {problem && <p className="notice bad" role="status" data-testid="presence-problem">{problem}</p>}
    {shown && <>
      <p data-testid="presence-sum"><strong>{t(shown.stateKey)}</strong></p>
      {shown.people.length === 0
        ? <p className="muted" data-testid="presence-nobody">{t("prc_nobody")}</p>
        : <ul data-testid="presence-people">{shown.people.map(person => <li key={person.user}>{`${person.user}: ${t(person.word === "home" ? "prc_home" : "prc_away")}`}{person.since && <span className="muted small">{` (${t("prc_since")} ${presenceSince(person.since)})`}</span>}</li>)}</ul>}
    </>}
    <div className="users-actions"><button onClick={() => void read()} data-testid="presence-refresh">{t("prc_refresh")}</button></div>
  </article>;
}
