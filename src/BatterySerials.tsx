/**
 * Batteries by serial number: every module with its serial number, model, chip, Board and specification, and the button that saves the list as a CSV file.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Translate } from "./components/camera";
import { downloadText } from "./download";
import type { SolarDeviceView } from "./solarModel";
import { chipKey, serialRows, serialsCsv } from "./solarSerials";

export function BatterySerials({ t, devices }: { t: Translate; devices: readonly SolarDeviceView[] }) {
  const rows = serialRows(devices);
  if (rows.length === 0) return null;
  const known = rows.filter(row => row.data.serial).length;
  const save = () => downloadText(`armor-battery-serials-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${serialsCsv(rows, t)}`, "text/csv;charset=utf-8");
  return <details className="bat-section" data-testid="battery-serials">
    <summary><b>{t("solx_serials_title")}</b><span className="muted">{known} / {rows.length}</span></summary>
    <div className="bat-section-body">
      <p className="muted small">{t("solx_serials_note")}</p>
      <p><button type="button" onClick={save}>{t("solx_csv")}</button></p>
      <div className="scroll"><table className="solar-events">
        <thead><tr><th>{t("bat_node_col")}</th><th>{t("solx_serial_stack")}</th><th>{t("solarModule")}</th><th>{t("solarModuleModel")}</th><th>{t("solx_serial")}</th><th>{t("solx_chip")}</th><th>{t("solx_board")}</th><th>{t("solx_spec")}</th></tr></thead>
        <tbody>{rows.map(row => <tr key={`${row.node}/${row.stack}/${row.module}`}>
          <td>{row.node}</td><td>{row.stack}</td><td>{row.module}</td><td>{row.data.model ?? "–"}</td><td className="mono">{row.data.serial ?? "–"}</td>
          <td>{row.data.chip ? t(chipKey(row.data.chip)) : "–"}</td><td className="mono">{row.data.board ?? "–"}</td><td>{row.data.specification ?? "–"}</td>
        </tr>)}</tbody>
      </table></div>
    </div>
  </details>;
}
