/**
 * System > Health of the nodes: which version of the shared contracts each node says its firmware was checked against, beside the one the server speaks (GET /api/v1/contract). A node
 * that is behind the server needs its firmware updated; one that is ahead is told apart from one that does not say. Nothing is warned about a node that does not say its version.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { useEffect, useState } from "react";
import { readContractStatus } from "../api";
import type { ContractStatus } from "../api/contract/armor-rest";
import type { Translate } from "../components/camera";

const WORD: Record<ContractStatus["nodes"][number]["status"], string> = { current: "ctrs_current", older: "ctrs_older", newer: "ctrs_newer", unknown: "ctrs_unknown" };

export function ContractSummary({ t, origin }: { t: Translate; origin: string }) {
  const [state, setState] = useState<ContractStatus | null>(null);
  useEffect(() => { let live = true; void readContractStatus(origin).then(value => { if (live) setState(value); }, () => { if (live) setState(null); }); return () => { live = false; }; }, [origin]);
  if (!state || state.nodes.length === 0) return null;
  const behind = state.nodes.filter(node => node.status === "older");
  const ahead = state.nodes.filter(node => node.status === "newer");
  return <section className="nh-contract" data-testid="contract-summary" aria-label={t("ctrs_title")}>
    <h4>{t("ctrs_title")}</h4>
    <p className="muted">{t("ctrs_help").replace("{server}", state.server)}</p>
    <div className="nh-totals">
      <span className="el-pill good">{t("ctrs_current")}: {state.totals.current}</span>
      <span className={`el-pill ${state.totals.older > 0 ? "warn" : "good"}`}>{t("ctrs_older")}: {state.totals.older}</span>
      {state.totals.newer > 0 && <span className="el-pill warn">{t("ctrs_newer")}: {state.totals.newer}</span>}
      {state.totals.unknown > 0 && <span className="el-pill">{t("ctrs_unknown")}: {state.totals.unknown}</span>}
    </div>
    {(behind.length > 0 || ahead.length > 0) && <ul className="adm-list" data-testid="contract-nodes">{[...behind, ...ahead].map(node => <li key={node.node_id} className="adm-account">
      <div className="adm-service-main"><strong>{node.node_id}</strong><small>{t(WORD[node.status])} - {node.contract ?? "-"}</small></div>
      {node.status === "older" && <small className="muted">{t("ctrs_update")}</small>}
    </li>)}</ul>}
  </section>;
}
