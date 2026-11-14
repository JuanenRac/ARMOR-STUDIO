/**
 * Interface text of the staged rollout of the firmware: the security switch (Configuration > Security) and the card in Configuration > Node firmware.
 * One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  sec_opt_fwrollout: ["Staged firmware rollout", "Actualización escalonada del firmware", "Gestaffelte Firmware-Verteilung", "Déploiement progressif du firmware", "Distribuzione graduale del firmware", "ファームウェアの段階的展開", "固件分阶段推送"],
  sec_opt_fwrollout_help: [
    "A firmware job from GitHub follows the settings of Configuration > Node firmware: the channel (stable or beta), the share of the nodes that take the version now, and the way back for a node that does not return. Off, a job updates every node it was given with the latest release.",
    "Un trabajo de firmware desde GitHub sigue los ajustes de Configuración > Firmware de nodos: el canal (estable o beta), el porcentaje de nodos que toman la versión ahora y la vuelta atrás de un nodo que no regresa. Desactivado, un trabajo actualiza todos los nodos indicados con la última versión.",
    "Ein Firmware-Auftrag von GitHub folgt den Einstellungen unter Konfiguration > Knoten-Firmware: Kanal (stabil oder Beta), Anteil der Knoten, die die Version jetzt erhalten, und der Rückweg für einen Knoten, der nicht zurückkehrt. Ausgeschaltet aktualisiert ein Auftrag alle angegebenen Knoten mit der neuesten Version.",
    "Une tâche de firmware depuis GitHub suit les réglages de Configuration > Firmware des nœuds : le canal (stable ou bêta), la part des nœuds qui reçoivent la version maintenant et le retour arrière d'un nœud qui ne revient pas. Désactivé, une tâche met à jour tous les nœuds indiqués avec la dernière version.",
    "Un'attività di firmware da GitHub segue le impostazioni di Configurazione > Firmware dei nodi: il canale (stabile o beta), la quota di nodi che ricevono ora la versione e il ritorno indietro di un nodo che non torna. Disattivato, un'attività aggiorna tutti i nodi indicati con l'ultima versione.",
    "GitHub からのファームウェア更新は、設定 > ノードのファームウェアの設定に従います。チャンネル（安定版またはベータ版）、今回バージョンを受け取るノードの割合、戻ってこないノードのロールバックです。オフの場合、指定したすべてのノードを最新版に更新します。",
    "来自 GitHub 的固件任务将遵循“配置 > 节点固件”中的设置：渠道（稳定版或测试版）、本次接收新版本的节点比例，以及未恢复上线的节点的回退。关闭时，任务会用最新版本更新所有指定节点。",
  ],
  sec_opt_fwrollout_warn: [
    "It only makes an update gentler: fewer nodes at a time and a way back. Turning it on sends nothing by itself.",
    "Solo hace más suave una actualización: menos nodos a la vez y una vuelta atrás. Al activarlo no se envía nada por sí solo.",
    "Es macht ein Update nur schonender: weniger Knoten gleichzeitig und ein Rückweg. Das Einschalten sendet von selbst nichts.",
    "Cela rend seulement une mise à jour plus douce : moins de nœuds à la fois et un retour arrière. L'activer n'envoie rien de lui-même.",
    "Rende solo più dolce un aggiornamento: meno nodi alla volta e un ritorno indietro. Attivarlo non invia nulla da solo.",
    "更新を穏やかにするだけです（一度に更新するノードを減らし、元に戻せるようにします）。オンにしても自動では何も送信されません。",
    "它只会让更新更平缓：一次更新更少的节点，并提供回退。开启本身不会发送任何内容。",
  ],
  fwr_title: ["Staged rollout", "Actualización escalonada", "Gestaffelte Verteilung", "Déploiement progressif", "Distribuzione graduale", "段階的展開", "分阶段推送"],
  fwr_help: [
    "Applies to updates from GitHub, not to a file you choose. The nodes of a job go in a fixed order for each version; the ones left out are listed as deferred and a later job with a larger share takes them.",
    "Se aplica a las actualizaciones desde GitHub, no a un archivo que elijas. Los nodos de un trabajo van en un orden fijo para cada versión; los que quedan fuera se listan como aplazados y un trabajo posterior con un porcentaje mayor los toma.",
    "Gilt für Updates von GitHub, nicht für eine gewählte Datei. Die Knoten eines Auftrags kommen pro Version in fester Reihenfolge dran; die übrigen werden als zurückgestellt aufgeführt und von einem späteren Auftrag mit größerem Anteil übernommen.",
    "S'applique aux mises à jour depuis GitHub, pas à un fichier que vous choisissez. Les nœuds d'une tâche passent dans un ordre fixe pour chaque version ; les autres sont listés comme différés et une tâche ultérieure avec une part plus grande les prend.",
    "Vale per gli aggiornamenti da GitHub, non per un file scelto. I nodi di un'attività vanno in un ordine fisso per ogni versione; gli altri sono elencati come rinviati e un'attività successiva con una quota maggiore li prende.",
    "GitHub からの更新に適用され、選択したファイルには適用されません。ジョブのノードはバージョンごとに固定の順序で処理され、残りは延期として表示され、割合を増やした次のジョブで更新されます。",
    "适用于来自 GitHub 的更新，不适用于您选择的文件。任务中的节点按每个版本固定的顺序进行；未处理的节点列为已推迟，之后以更大比例启动的任务会更新它们。",
  ],
  fwr_off: [
    "The option is off: a job updates every node it was given. Turn it on in Configuration > Security.",
    "La opción está desactivada: un trabajo actualiza todos los nodos indicados. Actívala en Configuración > Seguridad.",
    "Die Option ist aus: Ein Auftrag aktualisiert alle angegebenen Knoten. Einschalten unter Konfiguration > Sicherheit.",
    "L'option est désactivée : une tâche met à jour tous les nœuds indiqués. Activez-la dans Configuration > Sécurité.",
    "L'opzione è disattivata: un'attività aggiorna tutti i nodi indicati. Attivala in Configurazione > Sicurezza.",
    "このオプションはオフです。ジョブは指定したすべてのノードを更新します。設定 > セキュリティでオンにできます。",
    "该选项已关闭：任务会更新所有指定的节点。可在“配置 > 安全”中开启。",
  ],
  fwr_channel: ["Channel", "Canal", "Kanal", "Canal", "Canale", "チャンネル", "渠道"],
  fwr_channel_stable: ["Stable (the latest release)", "Estable (la última versión)", "Stabil (die neueste Version)", "Stable (la dernière version)", "Stabile (l'ultima versione)", "安定版（最新リリース）", "稳定版（最新发布）"],
  fwr_channel_beta: ["Beta (the newest, pre-releases included)", "Beta (la más reciente, con preversiones)", "Beta (die neueste, mit Vorabversionen)", "Bêta (la plus récente, préversions comprises)", "Beta (la più recente, con pre-release)", "ベータ版（プレリリースを含む最新）", "测试版（最新，含预发布）"],
  fwr_percent: ["Share of the nodes now (%)", "Porcentaje de nodos ahora (%)", "Anteil der Knoten jetzt (%)", "Part des nœuds maintenant (%)", "Quota di nodi ora (%)", "今回更新するノードの割合（%）", "本次更新的节点比例（%）"],
  fwr_rollback: ["Send a node back to its previous version if it does not return", "Devolver un nodo a su versión anterior si no regresa", "Einen Knoten auf seine vorherige Version zurücksetzen, wenn er nicht zurückkehrt", "Remettre un nœud sur sa version précédente s'il ne revient pas", "Riportare un nodo alla versione precedente se non torna", "戻ってこないノードを以前のバージョンに戻す", "节点未恢复上线时回退到之前的版本"],
  fwr_halt: ["Stop before the next nodes after a failure", "Parar antes de los siguientes nodos tras un fallo", "Nach einem Fehler vor den nächsten Knoten anhalten", "S'arrêter avant les nœuds suivants après un échec", "Fermarsi prima dei nodi successivi dopo un errore", "失敗した場合は次のノードの前で停止する", "失败后在后续节点之前停止"],
  fwr_save: ["Save the rollout", "Guardar la actualización escalonada", "Verteilung speichern", "Enregistrer le déploiement", "Salva la distribuzione", "段階的展開を保存", "保存分阶段推送"],
  fwr_saved: ["Saved.", "Guardado.", "Gespeichert.", "Enregistré.", "Salvato.", "保存しました。", "已保存。"],
  fwr_deferred: [
    "{0} node(s) left for a later job with a larger share.",
    "{0} nodo(s) quedan para un trabajo posterior con un porcentaje mayor.",
    "{0} Knoten bleiben für einen späteren Auftrag mit größerem Anteil.",
    "{0} nœud(s) restent pour une tâche ultérieure avec une part plus grande.",
    "{0} nodo/i restano per un'attività successiva con una quota maggiore.",
    "{0} 個のノードは、割合を増やした後のジョブに残されています。",
    "{0} 个节点留待之后以更大比例启动的任务处理。",
  ],
  fwr_halted: [
    "A node failed, so the next nodes were not touched.",
    "Un nodo falló, por lo que no se tocaron los siguientes.",
    "Ein Knoten ist fehlgeschlagen, daher wurden die nächsten nicht angefasst.",
    "Un nœud a échoué : les suivants n'ont pas été touchés.",
    "Un nodo ha fallito, quindi i successivi non sono stati toccati.",
    "ノードが失敗したため、後続のノードには手を付けていません。",
    "有节点失败，因此未处理后续节点。",
  ],
  fwr_skipped: ["already has this version", "ya tiene esta versión", "hat diese Version bereits", "a déjà cette version", "ha già questa versione", "すでにこのバージョンです", "已是此版本"],
  fwr_rolled_back: ["did not return; sent back to its previous version", "no regresó; devuelto a su versión anterior", "kehrte nicht zurück; auf die vorherige Version zurückgesetzt", "n'est pas revenu ; remis sur sa version précédente", "non è tornato; riportato alla versione precedente", "戻ってこなかったため、以前のバージョンに戻しました", "未恢复上线；已回退到之前的版本"],
  fwr_rollback_failed: ["did not return and could not be sent back ({0})", "no regresó y no se pudo devolver ({0})", "kehrte nicht zurück und konnte nicht zurückgesetzt werden ({0})", "n'est pas revenu et n'a pas pu être remis en arrière ({0})", "non è tornato e non è stato possibile riportarlo indietro ({0})", "戻ってこず、元に戻すこともできませんでした（{0}）", "未恢复上线且无法回退（{0}）"],
  fw_err_invalid_settings: ["A value of the rollout is not valid.", "Un valor de la actualización escalonada no es válido.", "Ein Wert der gestaffelten Verteilung ist ungültig.", "Une valeur du déploiement progressif n'est pas valide.", "Un valore della distribuzione graduale non è valido.", "段階的展開の値が正しくありません。", "分阶段推送的某个值无效。"],
};

const PT: Record<string, string> = {
  sec_opt_fwrollout: "Atualização escalonada do firmware",
  sec_opt_fwrollout_help: "Uma tarefa de firmware a partir do GitHub segue as definições de Configuração > Firmware dos nós: o canal (estável ou beta), a percentagem de nós que recebem a versão agora e o regresso à versão anterior de um nó que não volta. Desligado, uma tarefa atualiza todos os nós indicados com a versão mais recente.",
  sec_opt_fwrollout_warn: "Apenas torna uma atualização mais suave: menos nós de cada vez e um caminho de volta. Ao ligá-lo não se envia nada por si só.",
  fwr_title: "Atualização escalonada",
  fwr_help: "Aplica-se às atualizações a partir do GitHub, não a um ficheiro que escolha. Os nós de uma tarefa seguem uma ordem fixa para cada versão; os que ficam de fora são listados como adiados e uma tarefa posterior com uma percentagem maior toma-os.",
  fwr_off: "A opção está desligada: uma tarefa atualiza todos os nós indicados. Ligue-a em Configuração > Segurança.",
  fwr_channel: "Canal",
  fwr_channel_stable: "Estável (a versão mais recente)",
  fwr_channel_beta: "Beta (a mais recente, com pré-versões)",
  fwr_percent: "Percentagem de nós agora (%)",
  fwr_rollback: "Devolver um nó à versão anterior se não voltar",
  fwr_halt: "Parar antes dos nós seguintes após uma falha",
  fwr_save: "Guardar a atualização escalonada",
  fwr_saved: "Guardado.",
  fwr_deferred: "{0} nó(s) ficam para uma tarefa posterior com uma percentagem maior.",
  fwr_halted: "Um nó falhou, pelo que os seguintes não foram tocados.",
  fwr_skipped: "já tem esta versão",
  fwr_rolled_back: "não voltou; devolvido à versão anterior",
  fwr_rollback_failed: "não voltou e não foi possível devolvê-lo à versão anterior ({0})",
  fw_err_invalid_settings: "Um valor da atualização escalonada não é válido.",
};

export const firmwareRolloutCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
