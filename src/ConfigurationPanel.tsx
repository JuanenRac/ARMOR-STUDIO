import { useEffect, useState } from "react";
import { readConnection, saveConnection, type ConnectionState } from "./api";
import { UsersPanel } from "./UsersPanel";
import "./configuration.css";
import { MenuTitle } from "./menuLogos";

type Tab = "general" | "users" | "server";
type Props = {
  t: (key: string) => string;
  origin: string; setOrigin: (value: string) => void;
  theme: string; themes: readonly string[]; setTheme: (value: string) => void;
  language: string; languages: readonly { code: string; name: string }[]; setLanguage: (value: string) => void;
  connection: string; savePreferences: () => void; exportSite: () => void;
  operatorUnlocked: boolean; isAdmin: boolean;
};

const tabs: Tab[] = ["general", "users", "server"];

/** The technical settings of the server: where it listens and where Studio is served (an administrator's). */
function ServerSettings({ t, origin, isAdmin }: { t: (key: string) => string; origin: string; isAdmin: boolean }) {
  const [state, setState] = useState<ConnectionState | null>(null);
  const [form, setForm] = useState({ host: "", port: "", studio_port: "" });
  const [message, setMessage] = useState("");
  const apply = (next: ConnectionState) => {
    setState(next);
    setForm({ host: next.saved.host ?? "", port: next.saved.port === undefined ? "" : String(next.saved.port), studio_port: next.saved.studio_port === undefined ? "" : String(next.saved.studio_port) });
  };
  useEffect(() => { if (isAdmin) void readConnection(origin).then(apply).catch(() => setMessage(t("cs_admin_only"))); }, [origin, isAdmin]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!isAdmin) return <article className="stack-card"><h3>{t("cs_title")}</h3><p className="muted">{t("cs_admin_only")}</p></article>;
  const save = async () => {
    const number = (value: string) => value.trim() === "" ? undefined : Number(value);
    try { apply(await saveConnection(origin, { host: form.host.trim() || undefined, port: number(form.port), studio_port: number(form.studio_port) })); setMessage(t("cs_done")); }
    catch (error) { setMessage(t("cs_error") + (error instanceof Error ? error.message : "")); }
  };
  const field = (key: "host" | "port" | "studio_port", label: string, help?: string) => <div className="camera-field"><label><span>{label}</span><input value={form[key]} inputMode={key === "host" ? "text" : "numeric"} placeholder={t("cs_leave_empty")} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} /></label>{help && <p className="field-help">{help}</p>}</div>;
  return <article className="stack-card camera-form"><h3>{t("cs_title")}</h3><p className="muted">{t("cs_help")}</p>
    {state && <p className="notice"><b>{t("cs_active")}:</b> {state.active.host}:{state.active.port}{state.active.tls ? " (https)" : ""}</p>}
    {field("host", t("cs_host"), t("cs_host_help"))}{field("port", t("cs_port"))}{field("studio_port", t("cs_studio_port"))}
    <div className="camera-form-actions"><button className="primary" onClick={() => void save()}>{t("cs_save")}</button></div>
    {state?.restart_required && <p className="notice">{t("cs_restart")}</p>}<p className="notice">{message}</p>
  </article>;
}

export function ConfigurationPanel(props: Props) {
  const { t } = props;
  const [tab, setTab] = useState<Tab>("general");
  const tabLabel = (item: Tab) => t("tab" + item[0].toUpperCase() + item.slice(1));

  return <section className="configuration">
    <div className="panel-heading"><MenuTitle kind="configuration"><p className="eyebrow">{t("systemConfiguration")}</p><h2>{t("configuration")}</h2><p className="muted">{t("configurationHelp")}</p></MenuTitle></div>
    <div className="config-tabs" role="tablist" aria-label={t("configuration")}>
      {tabs.map(item => <button key={item} className={tab === item ? "active" : ""} role="tab" aria-selected={tab === item} onClick={() => setTab(item)}>{tabLabel(item)}</button>)}
    </div>
    {tab === "general" && <div className="config-grid">
      <article className="stack-card"><h3>{t("serverOrigin")}</h3><label>{t("serverOrigin")}<input value={props.origin} onChange={event => props.setOrigin(event.target.value)} inputMode="url" /></label><small>{props.connection}</small><p className={`operator-session ${props.operatorUnlocked ? "ready" : ""}`}>{props.operatorUnlocked ? t("studioAccessActive") : t("studioAccessWaiting")}</p><small>{t("studioAccessNotice")}</small><button onClick={props.savePreferences}>{t("savePreferences")}</button><button onClick={props.exportSite}>{t("exportSite")}</button></article>
      <article className="stack-card"><h3>{t("interface")}</h3><label>{t("theme")}<select value={props.theme} onChange={event => props.setTheme(event.target.value)}>{props.themes.map(item => <option key={item}>{item}</option>)}</select></label><label>{t("language")}<select value={props.language} onChange={event => props.setLanguage(event.target.value)}>{props.languages.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><button onClick={props.savePreferences}>{t("saveUi")}</button></article>
    </div>}
    {tab === "users" && <UsersPanel t={t} origin={props.origin} />}
    {tab === "server" && <ServerSettings t={t} origin={props.origin} isAdmin={props.isAdmin} />}
  </section>;
}
