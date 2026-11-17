/**
 * Interface text of the switch that makes a disarm under duress leave the trace of a normal disarm (Configuration > Security).
 * One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  sec_opt_duresstrail: ["Disarm under duress leaves no trace", "El desarme bajo coacción no deja rastro", "Entschärfen unter Zwang hinterlässt keine Spur", "Un désarmement sous la contrainte ne laisse aucune trace", "Il disarmo sotto coercizione non lascia tracce", "脅迫下の解除は痕跡を残さない", "胁迫下的撤防不留痕迹"],
  sec_opt_duresstrail_help: [
    "A disarm with the duress PIN is written in the audit trail and the history exactly like a normal disarm, and the person who disarmed sees an ordinary disarmed system. The silent alarm is shown on the wall panels and to every other session, and reaches the phones of everybody else and the places the alarms go to. What tells it from a normal disarm is kept in a record only an administrator reads. Off, the duress disarm is recorded as it always was.",
    "Un desarme con el PIN de coacción se escribe en el registro de auditoría y en el historial igual que un desarme normal, y quien desarmó ve un sistema desarmado corriente. La alarma silenciosa se muestra en los paneles de pared y a todas las demás sesiones, y llega a los móviles de los demás y a los destinos de las alarmas. Lo que la distingue de un desarme normal se guarda en un registro que solo lee un administrador. Desactivado, el desarme bajo coacción se registra como siempre.",
    "Ein Entschärfen mit der Zwangs-PIN wird im Audit-Protokoll und im Verlauf genau wie ein normales Entschärfen eingetragen, und wer entschärft hat, sieht ein gewöhnlich entschärftes System. Der stille Alarm wird auf den Wandpanels und allen anderen Sitzungen angezeigt und erreicht die Telefone aller anderen und die Ziele der Alarme. Was ihn von einem normalen Entschärfen unterscheidet, steht in einem Protokoll, das nur ein Administrator liest. Ausgeschaltet wird das Entschärfen unter Zwang wie bisher aufgezeichnet.",
    "Un désarmement avec le PIN de contrainte est écrit dans le journal d'audit et l'historique exactement comme un désarmement normal, et la personne qui a désarmé voit un système désarmé ordinaire. L'alarme silencieuse est affichée sur les panneaux muraux et à toutes les autres sessions, et atteint les téléphones de tous les autres et les destinations des alarmes. Ce qui la distingue d'un désarmement normal est conservé dans un registre que seul un administrateur lit. Désactivé, le désarmement sous la contrainte est enregistré comme toujours.",
    "Un disarmo con il PIN di coercizione viene scritto nel registro di audit e nella cronologia esattamente come un disarmo normale, e chi ha disarmato vede un sistema normalmente disarmato. L'allarme silenzioso è mostrato sui pannelli a muro e a tutte le altre sessioni, e raggiunge i telefoni di tutti gli altri e le destinazioni degli allarmi. Ciò che lo distingue da un disarmo normale è conservato in un registro che legge solo un amministratore. Disattivato, il disarmo sotto coercizione è registrato come sempre.",
    "脅迫用 PIN での解除は、監査記録と履歴に通常の解除とまったく同じように記録され、解除した本人には通常どおり解除済みのシステムが表示されます。無音の警報は壁面パネルとほかのすべてのセッションに表示され、ほかの人のスマートフォンと警報の通知先に届きます。通常の解除との違いは、管理者だけが読める別の記録に保存されます。オフの間は、これまでどおり脅迫下の解除として記録されます。",
    "使用胁迫 PIN 撤防时，审计记录和历史中的写法与普通撤防完全相同，撤防的人看到的是正常撤防的系统。静默警报会显示在墙面面板和其他所有会话上，并送达其他人的手机和警报的接收处。它与普通撤防的区别保存在只有管理员才能读取的单独记录中。关闭时，胁迫下的撤防照常记录。",
  ],
  sec_opt_duresstrail_warn: [
    "A wall panel shows the alarm to whoever stands in front of it, so a person next to the one being forced may see it. Turn it on only after trying it, and place the panels with that in mind. Turning it off again lowers security.",
    "Un panel de pared muestra la alarma a quien tenga delante, así que quien esté junto a la persona coaccionada puede verla. Actívalo solo después de probarlo y coloca los paneles pensando en ello. Volver a desactivarlo reduce la seguridad.",
    "Ein Wandpanel zeigt den Alarm jedem, der davorsteht, daher kann ihn jemand neben der gezwungenen Person sehen. Schalten Sie es erst nach einem Test ein und stellen Sie die Panels entsprechend auf. Das erneute Ausschalten senkt die Sicherheit.",
    "Un panneau mural montre l'alarme à toute personne placée devant, donc quelqu'un à côté de la personne contrainte peut la voir. Activez-le seulement après l'avoir essayé et placez les panneaux en y pensant. Le désactiver de nouveau réduit la sécurité.",
    "Un pannello a muro mostra l'allarme a chiunque gli stia davanti, quindi chi è accanto alla persona costretta può vederlo. Attivalo solo dopo averlo provato e colloca i pannelli tenendone conto. Disattivarlo di nuovo riduce la sicurezza.",
    "壁面パネルは前に立つ人に警報を見せるため、脅迫されている人の隣にいる人にも見える可能性があります。試してからオンにし、設置場所もその点を考慮してください。もう一度オフにすると安全性が下がります。",
    "墙面面板会向站在面前的人显示警报，因此被胁迫者身边的人可能看到。请先试用再开启，并在安放面板时考虑这一点。再次关闭会降低安全性。",
  ],
};

const PT: Record<string, string> = {
  sec_opt_duresstrail: "O desarme sob coação não deixa rasto",
  sec_opt_duresstrail_help: "Um desarme com o PIN de coação fica escrito no registo de auditoria e no histórico exatamente como um desarme normal, e quem desarmou vê um sistema desarmado normal. O alarme silencioso aparece nos painéis de parede e em todas as outras sessões, e chega aos telemóveis dos outros e aos destinos dos alarmes. O que o distingue de um desarme normal fica num registo que só um administrador lê. Desligado, o desarme sob coação é registado como sempre.",
  sec_opt_duresstrail_warn: "Um painel de parede mostra o alarme a quem estiver à frente, por isso quem estiver junto da pessoa coagida pode vê-lo. Ligue-o só depois de o experimentar e coloque os painéis a pensar nisso. Voltar a desligá-lo reduz a segurança.",
};

export const duressTrailCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
