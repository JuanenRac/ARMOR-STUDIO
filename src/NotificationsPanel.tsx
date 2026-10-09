/**
 * Configuration > Notifications: where the alarms are sent (the signed webhook, MQTT, Telegram, Home Assistant) - which are set up, never their secrets - and a test of each,
 * so a wrong token or a wrong address shows up now and not on the night of an alarm. How to set Telegram and Home Assistant up is on the right. An administrator's.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useCallback, useEffect, useState } from "react";
import { ApiError, notificationsStatus, notificationsTest, type NotificationsStatus, type NotificationTestResult } from "./api";

type Translate = (key: string) => string;
type Props = { t: Translate; origin: string; isAdmin: boolean };

const PLACES = ["webhook", "mqtt", "telegram", "homeassistant"] as const;

const explain = (t: Translate, error: unknown): string => {
  const code = error instanceof ApiError ? error.code : "generic";
  const text = t(`nt_err_${code}`);
  return text === `nt_err_${code}` ? t("nt_err_generic") : text;
};

export function NotificationsPanel({ t, origin, isAdmin }: Props) {
  const [status, setStatus] = useState<NotificationsStatus | null>(null);
  const [results, setResults] = useState<Record<string, NotificationTestResult>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => { try { setStatus(await notificationsStatus(origin)); } catch (error) { setMessage(explain(t, error)); } }, [origin]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);
  if (!isAdmin) return <article className="stack-card"><h3>{t("nt_title")}</h3><p className="muted">{t("cs_admin_only")}</p></article>;

  const test = async (channel?: string) => {
    setBusy(channel ?? "all"); setMessage("");
    try {
      const answer = await notificationsTest(origin, channel);
      setResults(current => ({ ...(channel ? current : {}), ...Object.fromEntries(answer.results.map(item => [item.channel, item])) }));
    } catch (error) { setMessage(explain(t, error)); } finally { setBusy(""); }
  };
  const anything = status !== null && PLACES.some(place => status[place]);

  return <div className="fw-page">
    <article className="stack-card fw-head"><h3>{t("nt_title")}</h3><p className="muted">{t("nt_help")}</p></article>
    <div className="fw-grid">
      <div className="fw-col">
        <article className="stack-card fw-card">
          <ul className="node-finder-list">
            {PLACES.map(place => {
              const on = status?.[place] === true, result = results[place];
              return <li key={place} className={on ? "" : "off"}>
                <span className="state-dot" aria-hidden />
                <div><strong>{t(`nt_${place}`)}</strong>
                  <small>{on ? t("nt_on") : t("nt_off")}{result ? ` · ${result.ok ? t("nt_result_ok") : `${t("nt_result_fail")}: ${result.detail}`}` : ""}</small></div>
                {on && <button type="button" onClick={() => void test(place)} disabled={busy !== ""}>{busy === place ? "…" : t("nt_test_one")}</button>}
              </li>;
            })}
          </ul>
          {status && <p className="muted small">{t("nt_language")}: <b>{status.language}</b> (ARMOR_ALERT_LANGUAGE)</p>}
          <div className="camera-form-actions">
            <button className="primary" type="button" onClick={() => void test()} disabled={busy !== "" || !anything}>{busy === "all" ? "…" : t("nt_test_all")}</button>
          </div>
          {status && !anything && <p className="notice">{t("nt_nothing")}</p>}
          {message && <p className="notice bad" role="status">{message}</p>}
        </article>
      </div>
      <div className="fw-col">
        <article className="stack-card fw-card">
          <h3>{t("nt_howto")}</h3>
          <p className="muted small">{t("nt_file")}</p>
          <h4 className="fw-flow-title">Telegram</h4>
          <p className="small">{t("nt_telegram_steps")}</p>
          <h4 className="fw-flow-title">Home Assistant</h4>
          <p className="small">{t("nt_ha_steps")}</p>
        </article>
      </div>
    </div>
  </div>;
}
