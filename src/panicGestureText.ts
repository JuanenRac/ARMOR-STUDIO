/**
 * Interface text of the switch for the hidden panic gesture of the apps (Configuration > Security).
 * One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  sec_opt_panicgesture: ["Hidden panic gesture in the apps", "Gesto de pánico oculto en las apps", "Verstecktes Panik-Zeichen in den Apps", "Geste de panique caché dans les applications", "Gesto di panico nascosto nelle app", "アプリの隠しパニックジェスチャー", "应用中的隐藏恐慌手势"],
  sec_opt_panicgesture_help: [
    "A long press on the logo of the app, or five quick touches, raises the silent duress alarm of the person who is signed in, as the duress PIN does: nothing shows on the phone, the mode does not change, and the people the alarms go to are told. Off, the apps do not offer the gesture.",
    "Una pulsación larga en el logotipo de la app, o cinco toques rápidos, lanza la alarma silenciosa de coacción de la persona con sesión iniciada, como hace el PIN de coacción: en el móvil no se ve nada, el modo no cambia y se avisa a quienes reciben las alarmas. Desactivado, las apps no ofrecen el gesto.",
    "Ein langer Druck auf das Logo der App oder fünf schnelle Berührungen lösen den stillen Zwangsalarm der angemeldeten Person aus, wie es die Zwangs-PIN tut: Auf dem Telefon ist nichts zu sehen, der Modus ändert sich nicht, und die Empfänger der Alarme werden benachrichtigt. Aus: Die Apps bieten das Zeichen nicht an.",
    "Un appui long sur le logo de l'application, ou cinq touches rapides, déclenche l'alarme silencieuse de contrainte de la personne connectée, comme le fait le code de contrainte : rien ne s'affiche sur le téléphone, le mode ne change pas, et les destinataires des alarmes sont prévenus. Désactivé, les applications ne proposent pas le geste.",
    "Una pressione prolungata sul logo dell'app, o cinque tocchi rapidi, fa scattare l'allarme silenzioso di coercizione della persona connessa, come fa il PIN di coercizione: sul telefono non si vede nulla, la modalità non cambia e vengono avvisati i destinatari degli allarmi. Disattivato, le app non offrono il gesto.",
    "アプリのロゴを長押しするか、素早く5回タッチすると、ログイン中の人の無音の強要アラームが、強要PINと同じように発生します。スマートフォンには何も表示されず、モードも変わらず、アラームの通知先に知らせが届きます。オフの間、アプリはこのジェスチャーを提供しません。",
    "长按应用徽标或快速点按五次，会像胁迫 PIN 一样触发已登录用户的静默胁迫警报：手机上不显示任何内容，模式不变，警报接收人会收到通知。关闭时，应用不提供此手势。",
  ],
  sec_opt_panicgesture_warn: [
    "Turning it on lets anybody who holds a signed-in phone raise the silent alarm by mistake or on purpose. Tell the people of the house what the gesture is and that it cannot be undone from the phone.",
    "Al activarlo, cualquiera que tenga en la mano un móvil con sesión iniciada puede lanzar la alarma silenciosa, por error o a propósito. Explica a los de la casa qué es el gesto y que no se puede deshacer desde el móvil.",
    "Beim Einschalten kann jeder, der ein angemeldetes Telefon in der Hand hat, den stillen Alarm versehentlich oder absichtlich auslösen. Erklären Sie den Hausbewohnern das Zeichen und dass es sich vom Telefon aus nicht zurücknehmen lässt.",
    "En l'activant, toute personne qui tient un téléphone connecté peut déclencher l'alarme silencieuse, par erreur ou exprès. Expliquez aux habitants ce qu'est le geste et qu'on ne peut pas l'annuler depuis le téléphone.",
    "Attivandolo, chiunque tenga in mano un telefono connesso può far scattare l'allarme silenzioso, per errore o di proposito. Spiega a chi vive in casa cos'è il gesto e che non si può annullare dal telefono.",
    "オンにすると、ログイン済みのスマートフォンを持つ人なら誰でも、誤ってでも故意にでも無音アラームを発生させられます。家の人にジェスチャーの内容と、スマートフォンからは取り消せないことを伝えてください。",
    "开启后，任何拿着已登录手机的人都可能误触或故意触发静默警报。请告诉家人这个手势是什么，并且无法从手机上撤销。",
  ],
};

const PT: Record<string, string> = {
  sec_opt_panicgesture: "Gesto de pânico escondido nas aplicações",
  sec_opt_panicgesture_help: "Um toque longo no logótipo da aplicação, ou cinco toques rápidos, lança o alarme silencioso de coação da pessoa com sessão iniciada, como faz o PIN de coação: no telemóvel não se vê nada, o modo não muda e são avisados os destinatários dos alarmes. Desligado, as aplicações não oferecem o gesto.",
  sec_opt_panicgesture_warn: "Ao ligá-lo, qualquer pessoa que tenha na mão um telemóvel com sessão iniciada pode lançar o alarme silencioso, por engano ou de propósito. Explique às pessoas da casa o que é o gesto e que não se pode desfazer a partir do telemóvel.",
};

export const panicGestureCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
