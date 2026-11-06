/**
 * The state of the optional copy of the node traffic (System menu, administrators): whether it is on, how big the file is, how many messages were taken and refused, and a download of each file.
 * The switch itself is in Configuration > Security; the server answers the download only while the copy is on and writes every download in the audit trail.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useState } from "react";
import { downloadIngestRecording, readIngestRecording } from "../api";
import { errorText } from "../apiErrorText";
import type { Translate } from "../components/camera";
import { downloadText } from "../download";
import { usePolled } from "../hooks";
import { fillAll, formatBytes } from "../nodeHealthModel";

export function IngestRecording({ t, origin }: { t: Translate; origin: string }) {
  const state = usePolled(() => readIngestRecording(origin), 10_000, origin).data;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const save = async (index: number) => {
    setBusy(true); setMessage("");
    try {
      const text = await downloadIngestRecording(origin, index);
      downloadText(index === 0 ? "armor-ingest.jsonl" : `armor-ingest.${index}.jsonl`, text, "application/x-ndjson");
      setMessage(t("rec_done"));
    } catch (error) { setMessage(errorText(t, error, "rec_err_")); } finally { setBusy(false); }
  };
  return <article className="stack-card ingest-card" data-testid="ingest-recording">
    <div className="log-head"><h3>{t("rec_title")}</h3></div>
    <p className="muted">{t("rec_help")}</p>
    {state && <>
      <p className={state.enabled ? "" : "muted"}><b>{state.enabled ? t("rec_on") : t("rec_off")}</b></p>
      <p data-testid="rec-stats">{fillAll(t("rec_stats"), state.lines, state.accepted, state.rejected, state.skipped)}</p>
      <p className="muted"><small>{fillAll(t("rec_size"), formatBytes(state.bytes), formatBytes(state.max_bytes), state.files, state.max_files, state.rotations)}{state.since ? ` · ${t("rec_since")}: ${new Date(state.since).toLocaleString()}` : ""}</small></p>
      {state.file_list.length > 0 && <ul className="ingest-files">
        {state.file_list.map(file => <li key={file.index}>
          <span>{file.index === 0 ? t("rec_file_now") : fillAll(t("rec_file_old"), file.index)} · {formatBytes(file.bytes)}</span>{" "}
          <button disabled={busy || !state.enabled} onClick={() => void save(file.index)}>{t("rec_download")}</button>
        </li>)}
      </ul>}
    </>}
    {message && <p role="status" className="muted">{message}</p>}
  </article>;
}
