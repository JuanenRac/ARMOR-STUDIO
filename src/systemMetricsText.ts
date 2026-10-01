/**
 * The phrases of the live view of the machine (processor, memory, temperatures, disks, network cards) in the System menu, in the seven languages.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  sm_title: ["The machine, live", "La máquina, en directo", "Die Maschine, live", "La machine, en direct", "La macchina, in diretta", "マシンのライブ状況", "设备实时状态"],
  sm_help: ["What the computer the server runs on is doing right now, like a task manager: it is sampled every two seconds and the last five minutes are kept.", "Lo que está haciendo ahora el ordenador donde corre el servidor, como un administrador de tareas: se mide cada dos segundos y se guardan los últimos cinco minutos.", "Was der Rechner, auf dem der Server läuft, gerade tut, wie ein Task-Manager: alle zwei Sekunden gemessen, die letzten fünf Minuten bleiben erhalten.", "Ce que fait en ce moment l'ordinateur où tourne le serveur, comme un gestionnaire de tâches : mesuré toutes les deux secondes, les cinq dernières minutes sont gardées.", "Cosa sta facendo ora il computer su cui gira il server, come un task manager: misurato ogni due secondi, gli ultimi cinque minuti vengono conservati.", "サーバーが動作しているコンピューターの現在の状態をタスクマネージャーのように表示します。2秒ごとに測定し、直近5分を保持します。", "类似任务管理器，显示服务器所在计算机当前的运行情况：每两秒采样一次，保留最近五分钟。"],
  sm_cpu: ["Processor", "Procesador", "Prozessor", "Processeur", "Processore", "プロセッサー", "处理器"],
  sm_cores: ["cores", "núcleos", "Kerne", "cœurs", "core", "コア", "核心"],
  sm_load: ["load", "carga", "Last", "charge", "carico", "負荷", "负载"],
  sm_memory: ["Memory (RAM)", "Memoria (RAM)", "Arbeitsspeicher (RAM)", "Mémoire (RAM)", "Memoria (RAM)", "メモリー（RAM）", "内存（RAM）"],
  sm_swap: ["Swap", "Swap", "Auslagerung", "Swap", "Swap", "スワップ", "交换分区"],
  sm_temperature: ["Temperature", "Temperatura", "Temperatur", "Température", "Temperatura", "温度", "温度"],
  sm_temperatures: ["Temperatures", "Temperaturas", "Temperaturen", "Températures", "Temperature", "温度センサー", "温度传感器"],
  sm_no_temperature: ["This machine does not report temperatures.", "Esta máquina no informa de temperaturas.", "Diese Maschine meldet keine Temperaturen.", "Cette machine ne signale pas de températures.", "Questa macchina non riporta temperature.", "このマシンは温度を報告しません。", "此设备不报告温度。"],
  sm_network: ["Network", "Red", "Netzwerk", "Réseau", "Rete", "ネットワーク", "网络"],
  sm_network_cards: ["Network cards", "Tarjetas de red", "Netzwerkkarten", "Cartes réseau", "Schede di rete", "ネットワークカード", "网卡"],
  sm_disks: ["Disks and storage", "Discos y almacenamiento", "Datenträger und Speicher", "Disques et stockage", "Dischi e archiviazione", "ディスクとストレージ", "磁盘与存储"],
  sm_disk_sd: ["Memory card / eMMC", "Tarjeta de memoria / eMMC", "Speicherkarte / eMMC", "Carte mémoire / eMMC", "Scheda di memoria / eMMC", "メモリーカード / eMMC", "存储卡 / eMMC"],
  sm_disk_usb: ["USB or SATA disk", "Disco USB o SATA", "USB- oder SATA-Datenträger", "Disque USB ou SATA", "Disco USB o SATA", "USB / SATA ディスク", "USB 或 SATA 磁盘"],
  sm_disk_nvme: ["NVMe disk (PCIe)", "Disco NVMe (PCIe)", "NVMe-Datenträger (PCIe)", "Disque NVMe (PCIe)", "Disco NVMe (PCIe)", "NVMe ディスク（PCIe）", "NVMe 磁盘（PCIe）"],
  sm_disk_other: ["Disk", "Disco", "Datenträger", "Disque", "Disco", "ディスク", "磁盘"],
  sm_no_disks: ["No disk was reported.", "No se ha informado de ningún disco.", "Es wurde kein Datenträger gemeldet.", "Aucun disque n'a été signalé.", "Nessun disco segnalato.", "ディスクは報告されていません。", "未报告任何磁盘。"],
  sm_used: ["used", "usado", "belegt", "utilisé", "usato", "使用中", "已用"],
  sm_free: ["free", "libre", "frei", "libre", "libero", "空き", "可用"],
  sm_link_up: ["connected", "conectada", "verbunden", "connectée", "connessa", "接続中", "已连接"],
  sm_link_down: ["no link", "sin enlace", "keine Verbindung", "pas de lien", "nessun collegamento", "リンクなし", "无连接"],
  sm_rx: ["Receiving", "Recibiendo", "Empfang", "Réception", "Ricezione", "受信", "接收"],
  sm_tx: ["Sending", "Enviando", "Senden", "Envoi", "Invio", "送信", "发送"],
  sm_collecting: ["Collecting samples…", "Recogiendo muestras…", "Messwerte werden gesammelt…", "Collecte des mesures…", "Raccolta dei campioni…", "測定値を収集中…", "正在采集样本…"],
  sm_last5: ["last 5 minutes", "últimos 5 minutos", "letzte 5 Minuten", "5 dernières minutes", "ultimi 5 minuti", "直近5分", "最近5分钟"],
  sm_unavailable: ["The live view of the machine is not available from this server.", "La vista en directo de la máquina no está disponible en este servidor.", "Die Live-Ansicht der Maschine ist auf diesem Server nicht verfügbar.", "La vue en direct de la machine n'est pas disponible sur ce serveur.", "La vista in diretta della macchina non è disponibile su questo server.", "このサーバーではマシンのライブ表示は利用できません。", "此服务器不提供设备实时视图。"],
};
export const systemMetricsCatalogues = cataloguesFromRows(ROWS);
