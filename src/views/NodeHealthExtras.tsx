/**
 * What the health card adds for the newer firmware: why the node last started when that was a fault, the gate that keeps it from taking work when its memory is short, whether it holds a
 * core dump, what its settings check did and, for a radar node, its sensors (with the state of their Bluetooth) and the state of its perimeter engine. Every part is drawn only when the node
 * told it. The Bluetooth address of a sensor is shown to administrators only.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { NodeHealthReport, RadarFacts } from "../api";
import type { Translate } from "../components/camera";
import { bluetoothAlert, bootLines, configCheckLines, fillAll, formatBytes, sensorAddress, sensorModelName, sortedSensors } from "../nodeHealthModel";

const yesNo = (t: Translate, value: boolean): string => t(value ? "nc_yes" : "nc_no");

/** The last dirty start, the memory gate, the core dump and the settings check: a short list under the facts of the card. */
export function StartInfo({ t, report }: { t: Translate; report: NodeHealthReport }) {
  const gate = report.memory_gate, core = report.coredump, check = configCheckLines(report.config_check, t);
  if (!report.boot && !gate && !core && check.length === 0) return null;
  return <div className="nh-start" data-testid="nh-start">
    {report.boot && <section className="nh-note bad" data-testid="nh-boot">
      <h5>{t("nh_boot_title")}</h5>
      {bootLines(report.boot, t).map(line => <p key={line}>{line}</p>)}
    </section>}
    {(gate || core) && <dl className="nh-facts">
      {gate && <div className="wide" data-testid="nh-gate"><dt>{t("nh_gate")}</dt><dd className={gate.closed ? "bad" : ""}>
        {t(gate.closed ? "nh_gate_closed" : "nh_gate_open")}{gate.transitions > 0 ? ` · ${fillAll(t("nh_gate_times"), gate.transitions)}` : ""}
        <br /><small className="muted">{fillAll(t("nh_gate_detail"), formatBytes(gate.close_free), formatBytes(gate.close_block), formatBytes(gate.open_free), formatBytes(gate.open_block))}</small>
      </dd></div>}
      {core && <div data-testid="nh-coredump"><dt>{t("nh_coredump")}</dt><dd className={core.present ? "bad" : ""}>{core.present ? fillAll(t("nh_coredump_present"), core.size !== undefined ? formatBytes(core.size) : "–") : t("nh_coredump_none")}</dd></div>}
    </dl>}
    {check.length > 0 && <section className="nh-note" data-testid="nh-config-check">
      <h5>{t("nh_cfg_title")}</h5>
      {check.map(line => <p key={line.text} className={line.bad ? "bad" : ""}>{line.text}</p>)}
    </section>}
  </div>;
}

/** The sensors a radar node reads, with the state of the Bluetooth of each one: an open Bluetooth is a chip of alert, and a LD2412 with a faulty or unknown firmware says so. */
export function SensorTable({ t, report, isAdmin }: { t: Translate; report: NodeHealthReport; isAdmin: boolean }) {
  if (!report.sensors || report.sensors.length === 0) return null;
  const sensors = sortedSensors(report.sensors);
  return <section className="nh-sensors" data-testid="nh-sensors">
    <h5>{t("nh_sensors_title")}</h5>
    <table>
      <thead><tr><th scope="col">{t("nh_sensor_id")}</th><th scope="col">{t("nh_sensor_model")}</th><th scope="col">{t("nh_sensor_state")}</th><th scope="col">{t("nh_firmware")}</th><th scope="col">{t("nh_sensor_bluetooth")}</th></tr></thead>
      <tbody>{sensors.map(sensor => {
        const address = sensorAddress(sensor, isAdmin);
        return <tr key={sensor.sensor_id} data-testid={`nh-sensor-${sensor.sensor_id}`}>
          <td>{sensor.sensor_id}</td>
          <td>{sensorModelName(sensor.model)}</td>
          <td className={sensor.state === "reporting" || sensor.state === "bridge" ? "" : "bad"}>{t(`nh_sstate_${sensor.state}`)}</td>
          <td className="mono">{sensor.firmware ?? t("nh_sensor_fw_unknown")}</td>
          <td>
            <span className={`nh-bt ${sensor.bluetooth}`}>{t(`nh_sbt_${sensor.bluetooth}`)}</span>
            {bluetoothAlert(sensor) && <span className="el-pill bad nh-bt-alert" role="status">{t("nh_sensor_bt_alert")}</span>}
            {address && <small className="mono muted" data-testid="nh-sensor-mac"> {fillAll(t("nh_sensor_mac"), address)}</small>}
          </td>
        </tr>;
      })}</tbody>
    </table>
    {sensors.filter(sensor => sensor.quirk).map(sensor => <p key={sensor.sensor_id} className="nh-note-line bad" data-testid={`nh-quirk-${sensor.sensor_id}`}>{sensor.sensor_id}: {t(`nh_quirk_${sensor.quirk}`)}</p>)}
  </section>;
}

/** The facts the perimeter engine of a radar node reports. */
export function RadarFactsInfo({ t, radar }: { t: Translate; radar: RadarFacts }) {
  return <dl className="nh-facts nh-radar" data-testid="nh-radar">
    <div className="wide"><dt>{t("nh_radar_title")}</dt></div>
    <div><dt>{t("nh_radar_perimeter")}</dt><dd>{t(radar.perimeter_enabled ? "nh_radar_on" : "nh_radar_off")}</dd></div>
    <div><dt>{t("nh_radar_masked")}</dt><dd className={radar.masked ? "bad" : ""}>{yesNo(t, radar.masked)}</dd></div>
    <div><dt>{t("nh_radar_jam")}</dt><dd className={radar.wifi_jam ? "bad" : ""}>{yesNo(t, radar.wifi_jam)}</dd></div>
    <div><dt>{t("nh_radar_bridge")}</dt><dd>{yesNo(t, radar.bridge_open)}</dd></div>
    <div><dt>{t("nh_radar_buffered")}</dt><dd>{radar.events_buffered}</dd></div>
    <div><dt>{t("nh_radar_btrule")}</dt><dd>{t(radar.sensor_bluetooth_off ? "nh_radar_btrule_off" : "nh_radar_btrule_free")}</dd></div>
  </dl>;
}
