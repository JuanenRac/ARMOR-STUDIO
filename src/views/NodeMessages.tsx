/**
 * What the nodes send, per topic: how many messages the server took and refused, the fields of a newer firmware it ignores and the last refusal with the start of what was sent.
 * It is what to look at when a node does not show up in its menu.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { readIngest } from "../api";
import type { Translate } from "../components/camera";
import { usePolled } from "../hooks";

export function NodeMessages({ t, origin }: { t: Translate; origin: string }) {
  const topics = usePolled(() => readIngest(origin), 5000, origin).data?.topics ?? null;
  return <article className="stack-card ingest-card">
    <h3>{t("ing_title")}</h3>
    <p className="muted">{t("ing_help")}</p>
    {topics === null ? null : topics.length === 0 ? <p className="muted">{t("ing_empty")}</p> : <div className="ingest-table" role="table">
      <div className="ingest-row head" role="row"><span>{t("ing_topic")}</span><span>{t("ing_ok")}</span><span>{t("ing_bad")}</span><span>{t("ing_last")}</span></div>
      {topics.map(item => <div key={item.topic} className={`ingest-item ${item.rejected > 0 ? "has-bad" : ""}`}>
        <div className="ingest-row" role="row"><span><b>{item.topic}</b></span><span>{item.accepted}</span><span className={item.rejected > 0 ? "bad" : ""}>{item.rejected}</span><span>{item.last_ok_at ? new Date(item.last_ok_at).toLocaleTimeString() : "—"}</span></div>
        {item.ignored_fields.length > 0 && <p className="ingest-note"><small>{t("ing_ignored")}: {item.ignored_fields.join(", ")}</small></p>}
        {item.last_error && <p className="ingest-note bad"><small>{t("ing_why")}{item.last_error_at ? ` (${new Date(item.last_error_at).toLocaleTimeString()})` : ""}: <b>{item.last_error}</b></small>{item.last_payload && <code title={t("ing_payload")}>{item.last_payload}</code>}</p>}
      </div>)}
    </div>}
  </article>;
}
