/**
 * The labels of the facts an alarm carries (which device, which address, which port...) and the words of the alarm controls, in seven languages (the eighth, Portuguese, is in ptCatalogue.ts).
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  alarmDetails: ["Details", "Detalles", "Details", "Détails", "Dettagli", "詳細", "详情"],
  alarmHideDetails: ["Hide details", "Ocultar detalles", "Details ausblenden", "Masquer les détails", "Nascondi dettagli", "詳細を隠す", "隐藏详情"],
  alarmNoDetails: ["This alarm carries no further details.", "Esta alarma no trae más detalles.", "Dieser Alarm enthält keine weiteren Details.", "Cette alarme ne contient pas d'autres détails.", "Questo allarme non contiene altri dettagli.", "このアラームに追加の詳細はありません。", "此警报没有更多详情。"],
  alarmDelete: ["Delete", "Borrar", "Löschen", "Supprimer", "Elimina", "削除", "删除"],
  alarmDeleteTitle: ["Delete this alarm", "Borrar esta alarma", "Diesen Alarm löschen", "Supprimer cette alarme", "Elimina questo allarme", "このアラームを削除", "删除此警报"],
  alarmDeleteQuestion: ["Delete this alarm from the list? If its cause is still going on it comes back only when it happens again.", "¿Borrar esta alarma de la lista? Si su causa sigue, solo volverá a aparecer cuando vuelva a ocurrir.", "Diesen Alarm aus der Liste löschen? Dauert die Ursache an, kommt er erst wieder, wenn sie erneut eintritt.", "Supprimer cette alarme de la liste ? Si sa cause continue, elle ne reviendra que lorsqu'elle se reproduira.", "Eliminare questo allarme dall'elenco? Se la causa continua, tornerà solo quando si ripresenterà.", "このアラームを一覧から削除しますか？原因が続いていても、再発したときにだけ再び表示されます。", "从列表中删除此警报？如果原因仍在持续，只有再次发生时才会重新出现。"],
  alarmClearQuestion: ["Delete every alarm that has been acknowledged (ended or not)? The ones nobody has seen stay.", "¿Borrar todas las alarmas que ya se han reconocido (hayan terminado o no)? Las que nadie ha visto se quedan.", "Alle quittierten Alarme löschen (beendet oder nicht)? Die, die niemand gesehen hat, bleiben.", "Supprimer toutes les alarmes déjà acquittées (terminées ou non) ? Celles que personne n'a vues restent.", "Eliminare tutti gli allarmi già confermati (terminati o no)? Quelli che nessuno ha visto restano.", "確認済みのアラームをすべて削除しますか（終了済みかどうかに関係なく）？誰も見ていないものは残ります。", "删除所有已确认的警报（无论是否已结束）？无人查看过的会保留。"],
  alarmCleared: ["alarms removed", "alarmas eliminadas", "Alarme entfernt", "alarmes supprimées", "allarmi rimossi", "件のアラームを削除しました", "条警报已删除"],
  alarmFailedWhy: ["The action could not be done: ", "No se ha podido hacer la acción: ", "Die Aktion ließ sich nicht ausführen: ", "L'action n'a pas pu être faite : ", "Non è stato possibile eseguire l'azione: ", "操作を実行できませんでした：", "无法完成该操作："],
  alarmFilterAll: ["All", "Todas", "Alle", "Toutes", "Tutte", "すべて", "全部"],
  alarmFilterSource: ["Source", "Origen", "Quelle", "Source", "Origine", "発生元", "来源"],
  alarmFilterSeverity: ["Severity", "Gravedad", "Schweregrad", "Gravité", "Gravità", "重大度", "严重程度"],
  alarmSearch: ["Search an alarm, a device, an address…", "Buscar una alarma, un dispositivo, una dirección…", "Alarm, Gerät, Adresse suchen…", "Chercher une alarme, un appareil, une adresse…", "Cerca un allarme, un dispositivo, un indirizzo…", "アラーム、デバイス、アドレスを検索…", "搜索警报、设备、地址…"],
  alarmShowing: ["showing", "mostrando", "angezeigt", "affichées", "visualizzati", "表示中", "显示"],
  alarmMarkKnown: ["Mark the device as known", "Marcar el dispositivo como conocido", "Gerät als bekannt markieren", "Marquer l'appareil comme connu", "Segna il dispositivo come noto", "デバイスを既知にする", "将设备标记为已知"],
  alarmMarkedKnown: ["The device is marked as known.", "El dispositivo está marcado como conocido.", "Das Gerät ist als bekannt markiert.", "L'appareil est marqué comme connu.", "Il dispositivo è segnato come noto.", "デバイスを既知にしました。", "设备已标记为已知。"],
  alarmYes: ["yes", "sí", "ja", "oui", "sì", "はい", "是"],
  alarmNo: ["no", "no", "nein", "non", "no", "いいえ", "否"],
  source_node: ["Radar nodes", "Nodos de radar", "Radarknoten", "Nœuds radar", "Nodi radar", "レーダーノード", "雷达节点"],
  source_camera: ["Cameras", "Cámaras", "Kameras", "Caméras", "Telecamere", "カメラ", "摄像头"],
  source_device: ["Devices", "Dispositivos", "Geräte", "Appareils", "Dispositivi", "デバイス", "设备"],
  source_solar: ["Solar", "Solar", "Solar", "Solaire", "Solare", "ソーラー", "太阳能"],
  source_electrical: ["Electrical", "Eléctrico", "Elektrik", "Électrique", "Elettrico", "電気", "电气"],
  source_alarm: ["Alarm panels", "Centrales de alarma", "Alarmzentralen", "Centrales d'alarme", "Centrali d'allarme", "警報盤", "报警主机"],
  source_network: ["Network", "Red", "Netzwerk", "Réseau", "Rete", "ネットワーク", "网络"],
};
export const alarmDetailCatalogues = cataloguesFromRows(ROWS);
