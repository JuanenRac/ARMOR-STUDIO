/**
 * Interface text of the card "Programs of the machine from the phone" (Configuration > Updates): the state of the switch that lets administrators check and update the programs of this
 * machine from the phone apps, why it is off, how it is turned on and the latest activity. One row per phrase in seven languages; the eighth, Portuguese (Portugal), is PT below.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  mu_title: ["Programs of the machine, from the phone", "Programas del equipo, desde el móvil", "Programme der Maschine, vom Handy aus", "Programmes de la machine, depuis le téléphone", "Programmi della macchina, dal telefono", "マシンのプログラム（スマートフォンから）", "从手机更新本机程序"],
  mu_help: [
    "Administrators can check which version of each program is installed on this machine and update it from the phone apps (More > Update the machine). It is off until the owner turns it on, and the switch is not in the apps or here: it lives in the environment of the server and of the maintenance helper, so it cannot be turned on from a phone. Only a signed release is ever put in place.",
    "Los administradores pueden ver qué versión de cada programa hay instalada en esta máquina y actualizarla desde las apps del móvil (Más > Actualizar el equipo). Está apagado hasta que el dueño lo enciende, y el interruptor no está en las apps ni aquí: vive en el entorno del servidor y del ayudante de mantenimiento, así que no se puede encender desde un móvil. Solo se instala una versión firmada.",
    "Administratoren können in den Handy-Apps (Mehr > Gerät aktualisieren) sehen, welche Version jedes Programms auf dieser Maschine installiert ist, und es aktualisieren. Es ist aus, bis der Besitzer es einschaltet, und der Schalter ist weder in den Apps noch hier: Er liegt in der Umgebung des Servers und des Wartungshelfers und lässt sich daher nicht vom Handy aus einschalten. Es wird nur eine signierte Version installiert.",
    "Les administrateurs peuvent voir quelle version de chaque programme est installée sur cette machine et la mettre à jour depuis les applications du téléphone (Plus > Mettre à jour la machine). C'est désactivé tant que le propriétaire ne l'active pas, et l'interrupteur n'est ni dans les applications ni ici : il se trouve dans l'environnement du serveur et de l'assistant de maintenance, donc il ne peut pas être activé depuis un téléphone. Seule une version signée est installée.",
    "Gli amministratori possono vedere quale versione di ogni programma è installata su questa macchina e aggiornarla dalle app del telefono (Altro > Aggiorna la macchina). È spento finché il proprietario non lo accende, e l'interruttore non è nelle app né qui: si trova nell'ambiente del server e dell'assistente di manutenzione, quindi non si può accendere da un telefono. Viene installata solo una versione firmata.",
    "管理者は、スマートフォンのアプリ（その他 > 本体を更新）から、このマシンにインストールされている各プログラムのバージョンを確認して更新できます。所有者が有効にするまでオフで、スイッチはアプリにもここにもありません。サーバーとメンテナンスヘルパーの環境にあるため、スマートフォンからはオンにできません。署名済みのリリースだけがインストールされます。",
    "管理员可以在手机应用（更多 > 更新设备）中查看本机各程序已安装的版本并进行更新。在所有者开启之前默认关闭，开关既不在应用里也不在这里：它位于服务器和维护助手的环境中，因此无法通过手机开启。只会安装已签名的版本。",
  ],
  mu_state_on: ["On: the server and the maintenance helper both allow it.", "Encendido: el servidor y el ayudante de mantenimiento lo permiten.", "Ein: Server und Wartungshelfer erlauben es.", "Activé : le serveur et l'assistant de maintenance l'autorisent.", "Acceso: il server e l'assistente di manutenzione lo consentono.", "オン：サーバーとメンテナンスヘルパーの両方が許可しています。", "已开启：服务器和维护助手都允许。"],
  mu_state_off: ["Off", "Apagado", "Aus", "Désactivé", "Spento", "オフ", "已关闭"],
  mu_reason_switched_off: ["The server has it switched off (ARMOR_CM5_UPDATE is not 1).", "El servidor lo tiene apagado (ARMOR_CM5_UPDATE no vale 1).", "Der Server hat es ausgeschaltet (ARMOR_CM5_UPDATE ist nicht 1).", "Le serveur l'a désactivé (ARMOR_CM5_UPDATE ne vaut pas 1).", "Il server lo ha spento (ARMOR_CM5_UPDATE non vale 1).", "サーバー側でオフになっています（ARMOR_CM5_UPDATE が 1 ではありません）。", "服务器已将其关闭（ARMOR_CM5_UPDATE 不为 1）。"],
  mu_reason_not_configured: ["The server has no maintenance helper set up.", "El servidor no tiene configurado el ayudante de mantenimiento.", "Auf dem Server ist kein Wartungshelfer eingerichtet.", "Le serveur n'a pas d'assistant de maintenance configuré.", "Il server non ha un assistente di manutenzione configurato.", "サーバーにメンテナンスヘルパーが設定されていません。", "服务器未配置维护助手。"],
  mu_reason_agent_switched_off: ["The maintenance helper has it switched off (ARMOR_MAINT_UPDATER is not 1).", "El ayudante de mantenimiento lo tiene apagado (ARMOR_MAINT_UPDATER no vale 1).", "Der Wartungshelfer hat es ausgeschaltet (ARMOR_MAINT_UPDATER ist nicht 1).", "L'assistant de maintenance l'a désactivé (ARMOR_MAINT_UPDATER ne vaut pas 1).", "L'assistente di manutenzione lo ha spento (ARMOR_MAINT_UPDATER non vale 1).", "メンテナンスヘルパー側でオフになっています（ARMOR_MAINT_UPDATER が 1 ではありません）。", "维护助手已将其关闭（ARMOR_MAINT_UPDATER 不为 1）。"],
  mu_reason_not_answering: ["The maintenance helper does not answer.", "El ayudante de mantenimiento no contesta.", "Der Wartungshelfer antwortet nicht.", "L'assistant de maintenance ne répond pas.", "L'assistente di manutenzione non risponde.", "メンテナンスヘルパーが応答しません。", "维护助手没有响应。"],
  mu_reason_refused: ["The maintenance helper refused the request.", "El ayudante de mantenimiento rechazó la consulta.", "Der Wartungshelfer hat die Anfrage abgelehnt.", "L'assistant de maintenance a refusé la requête.", "L'assistente di manutenzione ha rifiutato la richiesta.", "メンテナンスヘルパーが要求を拒否しました。", "维护助手拒绝了该请求。"],
  mu_reason_generic: ["Updating from the phone is not available.", "La actualización desde el móvil no está disponible.", "Das Aktualisieren vom Handy aus ist nicht verfügbar.", "La mise à jour depuis le téléphone n'est pas disponible.", "L'aggiornamento dal telefono non è disponibile.", "スマートフォンからの更新は利用できません。", "无法通过手机更新。"],
  mu_how_title: ["How to turn it on", "Cómo encenderlo", "So schaltet man es ein", "Comment l'activer", "Come accenderlo", "オンにする方法", "如何开启"],
  mu_how: [
    "Set ARMOR_CM5_UPDATE=1 in the environment of the server and ARMOR_MAINT_UPDATER=1 in the environment of the maintenance helper, then restart both. To turn it off again, remove them. Nothing on this screen or in the apps can change them.",
    "Pon ARMOR_CM5_UPDATE=1 en el entorno del servidor y ARMOR_MAINT_UPDATER=1 en el entorno del ayudante de mantenimiento, y reinicia los dos. Para apagarlo otra vez, quítalos. Nada de esta pantalla ni de las apps puede cambiarlos.",
    "Setzen Sie ARMOR_CM5_UPDATE=1 in der Umgebung des Servers und ARMOR_MAINT_UPDATER=1 in der Umgebung des Wartungshelfers und starten Sie beide neu. Zum Ausschalten entfernen Sie sie wieder. Nichts auf diesem Bildschirm und in den Apps kann sie ändern.",
    "Mettez ARMOR_CM5_UPDATE=1 dans l'environnement du serveur et ARMOR_MAINT_UPDATER=1 dans celui de l'assistant de maintenance, puis redémarrez les deux. Pour le désactiver, retirez-les. Rien sur cet écran ni dans les applications ne peut les modifier.",
    "Imposta ARMOR_CM5_UPDATE=1 nell'ambiente del server e ARMOR_MAINT_UPDATER=1 nell'ambiente dell'assistente di manutenzione, poi riavvia entrambi. Per spegnerlo di nuovo, rimuovili. Niente su questa schermata o nelle app può modificarli.",
    "サーバーの環境に ARMOR_CM5_UPDATE=1、メンテナンスヘルパーの環境に ARMOR_MAINT_UPDATER=1 を設定し、両方を再起動してください。オフに戻すには削除します。この画面やアプリからは変更できません。",
    "在服务器环境中设置 ARMOR_CM5_UPDATE=1，在维护助手环境中设置 ARMOR_MAINT_UPDATER=1，然后重启两者。要再次关闭，请删除它们。本页面和应用都无法更改这些设置。",
  ],
  mu_projects: ["Programs the helper can update", "Programas que el ayudante puede actualizar", "Programme, die der Helfer aktualisieren kann", "Programmes que l'assistant peut mettre à jour", "Programmi che l'assistente può aggiornare", "ヘルパーが更新できるプログラム", "助手可更新的程序"],
  mu_no_projects: ["The helper offers no program.", "El ayudante no ofrece ningún programa.", "Der Helfer bietet kein Programm an.", "L'assistant n'offre aucun programme.", "L'assistente non offre alcun programma.", "ヘルパーが提供するプログラムはありません。", "助手没有提供任何程序。"],
  mu_signed: ["Only signed releases are installed: what is not signed is never put in place.", "Solo se instalan versiones firmadas: lo que no está firmado no se toca.", "Es werden nur signierte Versionen installiert: Was nicht signiert ist, wird nie eingespielt.", "Seules les versions signées sont installées : ce qui n'est pas signé n'est jamais mis en place.", "Si installano solo versioni firmate: ciò che non è firmato non viene mai messo in opera.", "署名済みのリリースだけがインストールされます。署名のないものは適用されません。", "只安装已签名的版本：未签名的内容绝不会被安装。"],
  mu_unsigned: ["The helper does not ask for a signature. Turn that on before using this.", "El ayudante no exige firma. Actívalo antes de usar esto.", "Der Helfer verlangt keine Signatur. Schalten Sie das ein, bevor Sie dies nutzen.", "L'assistant n'exige pas de signature. Activez-le avant d'utiliser ceci.", "L'assistente non richiede la firma. Attivalo prima di usare questa funzione.", "ヘルパーは署名を要求していません。使う前に有効にしてください。", "助手不要求签名。使用前请先开启。"],
  mu_activity: ["Recent activity", "Actividad reciente", "Letzte Aktivität", "Activité récente", "Attività recente", "最近のアクティビティ", "最近活动"],
  mu_activity_none: ["Nothing has been checked or updated from Studio or the phone yet.", "Todavía no se ha comprobado ni actualizado nada desde Studio o el móvil.", "Von Studio oder vom Handy aus wurde noch nichts geprüft oder aktualisiert.", "Rien n'a encore été vérifié ni mis à jour depuis Studio ou le téléphone.", "Finora nulla è stato controllato o aggiornato da Studio o dal telefono.", "Studio またはスマートフォンからの確認・更新はまだありません。", "尚未通过 Studio 或手机检查或更新任何内容。"],
  mu_act_preview: ["checked", "comprobó", "geprüft", "vérifié", "controllato", "確認", "检查"],
  mu_act_apply: ["asked to update", "pidió actualizar", "Aktualisierung angefordert", "a demandé la mise à jour", "ha chiesto l'aggiornamento", "更新を要求", "请求更新"],
  mu_out_allowed: ["done", "hecho", "erledigt", "fait", "fatto", "完了", "完成"],
  mu_out_denied: ["refused", "rechazado", "abgelehnt", "refusé", "rifiutato", "拒否", "已拒绝"],
  mu_out_failed: ["failed", "falló", "fehlgeschlagen", "échec", "non riuscito", "失敗", "失败"],
  mu_unreadable: ["The state of the switch could not be read.", "No se pudo leer el estado del interruptor.", "Der Zustand des Schalters konnte nicht gelesen werden.", "L'état de l'interrupteur n'a pas pu être lu.", "Non è stato possibile leggere lo stato dell'interruttore.", "スイッチの状態を読み取れませんでした。", "无法读取开关状态。"],
  mu_refresh: ["Check again", "Comprobar otra vez", "Erneut prüfen", "Vérifier à nouveau", "Controlla di nuovo", "再確認", "重新检查"],
};

const PT: Record<string, string> = {
  mu_title: "Programas do equipamento, a partir do telemóvel",
  mu_help: "Os administradores podem ver que versão de cada programa está instalada nesta máquina e atualizá-la a partir das apps do telemóvel (Mais > Atualizar o equipamento). Está desligado até o dono o ligar, e o interruptor não está nas apps nem aqui: vive no ambiente do servidor e do assistente de manutenção, por isso não se pode ligar a partir de um telemóvel. Só se instala uma versão assinada.",
  mu_state_on: "Ligado: o servidor e o assistente de manutenção permitem-no.",
  mu_state_off: "Desligado",
  mu_reason_switched_off: "O servidor tem-no desligado (ARMOR_CM5_UPDATE não vale 1).",
  mu_reason_not_configured: "O servidor não tem configurado o assistente de manutenção.",
  mu_reason_agent_switched_off: "O assistente de manutenção tem-no desligado (ARMOR_MAINT_UPDATER não vale 1).",
  mu_reason_not_answering: "O assistente de manutenção não responde.",
  mu_reason_refused: "O assistente de manutenção recusou o pedido.",
  mu_reason_generic: "A atualização a partir do telemóvel não está disponível.",
  mu_how_title: "Como o ligar",
  mu_how: "Ponha ARMOR_CM5_UPDATE=1 no ambiente do servidor e ARMOR_MAINT_UPDATER=1 no ambiente do assistente de manutenção, e reinicie os dois. Para o desligar outra vez, retire-os. Nada neste ecrã nem nas apps os pode alterar.",
  mu_projects: "Programas que o assistente pode atualizar",
  mu_no_projects: "O assistente não oferece nenhum programa.",
  mu_signed: "Só se instalam versões assinadas: o que não está assinado nunca é aplicado.",
  mu_unsigned: "O assistente não exige assinatura. Ative-o antes de usar isto.",
  mu_activity: "Atividade recente",
  mu_activity_none: "Ainda não se verificou nem atualizou nada a partir do Studio ou do telemóvel.",
  mu_act_preview: "verificou",
  mu_act_apply: "pediu para atualizar",
  mu_out_allowed: "feito",
  mu_out_denied: "recusado",
  mu_out_failed: "falhou",
  mu_unreadable: "Não foi possível ler o estado do interruptor.",
  mu_refresh: "Verificar outra vez",
};

export const machineUpdateCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
