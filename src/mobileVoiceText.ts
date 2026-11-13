/**
 * Interface text of the switch for the microphone of a phone (Configuration > Security).
 * One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  sec_opt_mobilevoice: ["Voice commands from the phone", "Órdenes de voz desde el móvil", "Sprachbefehle vom Telefon", "Commandes vocales depuis le téléphone", "Comandi vocali dal telefono", "スマートフォンからの音声コマンド", "手机语音指令"],
  sec_opt_mobilevoice_help: [
    "A phone of a signed-in operator or administrator may speak to the voice gateway with its microphone. Off, the phone only sends typed orders. A spoken order asks for the same confirmations as a typed one: arming and disarming need a second turn and silencing the siren follows the option for the confirmation of the voice.",
    "Un móvil de un operador o administrador con sesión iniciada puede hablar con la pasarela de voz usando su micrófono. Desactivado, el móvil solo envía órdenes escritas. Una orden hablada pide las mismas confirmaciones que una escrita: armar y desarmar necesitan un segundo turno y silenciar la sirena sigue la opción de confirmación de la voz.",
    "Ein Telefon eines angemeldeten Bedieners oder Administrators darf mit seinem Mikrofon zum Sprach-Gateway sprechen. Aus: Das Telefon sendet nur getippte Befehle. Ein gesprochener Befehl verlangt dieselben Bestätigungen wie ein getippter: Scharf- und Unscharfschalten brauchen einen zweiten Durchgang, und das Stummschalten der Sirene folgt der Option für die Bestätigung der Sprache.",
    "Un téléphone d'un opérateur ou d'un administrateur connecté peut parler à la passerelle vocale avec son microphone. Désactivé, le téléphone n'envoie que des ordres écrits. Un ordre parlé demande les mêmes confirmations qu'un ordre écrit : armer et désarmer demandent un second tour et faire taire la sirène suit l'option de confirmation de la voix.",
    "Un telefono di un operatore o amministratore connesso può parlare con il gateway vocale usando il microfono. Disattivato, il telefono invia solo comandi scritti. Un comando parlato chiede le stesse conferme di uno scritto: armare e disarmare richiedono un secondo turno e silenziare la sirena segue l'opzione di conferma della voce.",
    "ログイン中のオペレーターまたは管理者のスマートフォンが、マイクで音声ゲートウェイに話しかけられます。オフの間、スマートフォンは入力した命令だけを送ります。音声の命令も入力した命令と同じ確認を求めます。警戒の設定と解除には 2 回目のやり取りが必要で、サイレンの停止は音声の確認オプションに従います。",
    "已登录的操作员或管理员的手机可以用麦克风与语音网关对话。关闭时，手机只发送键入的指令。语音指令与键入的指令要求相同的确认：布防和撤防需要第二轮，静音警报器遵循语音确认选项。",
  ],
  sec_opt_mobilevoice_warn: [
    "Turning it on lets the phone listen with its microphone and send what it hears to the server. Turn it on only for phones you trust; the audio is not kept.",
    "Al activarlo, el móvil puede escuchar con su micrófono y enviar lo que oye al servidor. Actívalo solo para móviles de confianza; el audio no se guarda.",
    "Beim Einschalten kann das Telefon mit seinem Mikrofon zuhören und das Gehörte an den Server senden. Schalten Sie es nur für vertrauenswürdige Telefone ein; das Audio wird nicht gespeichert.",
    "En l'activant, le téléphone peut écouter avec son microphone et envoyer ce qu'il entend au serveur. Activez-le seulement pour des téléphones de confiance ; l'audio n'est pas conservé.",
    "Attivandolo, il telefono può ascoltare con il microfono e inviare ciò che sente al server. Attivalo solo per telefoni fidati; l'audio non viene conservato.",
    "オンにすると、スマートフォンがマイクで聞き取り、聞いた内容をサーバーに送れます。信頼できるスマートフォンだけで有効にしてください。音声は保存されません。",
    "开启后，手机可以用麦克风收听并把听到的内容发送到服务器。请仅为可信的手机开启；音频不会被保存。",
  ],
};

const PT: Record<string, string> = {
  sec_opt_mobilevoice: "Comandos de voz a partir do telemóvel",
  sec_opt_mobilevoice_help: "Um telemóvel de um operador ou administrador com sessão iniciada pode falar com a porta de ligação de voz usando o microfone. Desligado, o telemóvel só envia ordens escritas. Uma ordem falada pede as mesmas confirmações que uma escrita: armar e desarmar precisam de uma segunda volta e silenciar a sirene segue a opção de confirmação da voz.",
  sec_opt_mobilevoice_warn: "Ao ligá-lo, o telemóvel pode ouvir com o microfone e enviar o que ouve ao servidor. Ligue-o só para telemóveis de confiança; o áudio não é guardado.",
};

export const mobileVoiceCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
