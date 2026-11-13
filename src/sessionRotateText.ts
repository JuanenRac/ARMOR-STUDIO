/**
 * Interface text of the switch that gives a session a new id on every renewal (Configuration > Security).
 * One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  sec_opt_rotateid: ["New session id on every renewal", "Id de sesión nuevo en cada renovación", "Neue Sitzungs-ID bei jeder Erneuerung", "Nouvel identifiant de session à chaque renouvellement", "Nuovo ID di sessione a ogni rinnovo", "更新のたびに新しいセッションID", "每次续期都更换会话 ID"],
  sec_opt_rotateid_help: [
    "A session in use gets a new id and cookie each time it is renewed, and the previous id keeps working for 30 seconds so requests already on their way are not signed out. Off, the id lasts as long as the session. Whatever this setting says, a session ends 30 days after it was opened.",
    "Una sesión en uso recibe un id y una cookie nuevos cada vez que se renueva, y el id anterior sigue valiendo 30 segundos para que las peticiones ya en camino no cierren la sesión. Desactivado, el id dura lo que la sesión. Diga lo que diga este ajuste, una sesión termina 30 días después de abrirse.",
    "Eine benutzte Sitzung erhält bei jeder Erneuerung eine neue ID und ein neues Cookie, und die vorherige ID gilt noch 30 Sekunden, damit bereits unterwegs befindliche Anfragen nicht abgemeldet werden. Aus: Die ID gilt so lange wie die Sitzung. Unabhängig von dieser Einstellung endet eine Sitzung 30 Tage nach dem Öffnen.",
    "Une session utilisée reçoit un nouvel identifiant et un nouveau cookie à chaque renouvellement, et l'ancien identifiant reste valable 30 secondes pour que les requêtes déjà en route ne soient pas déconnectées. Désactivé, l'identifiant dure autant que la session. Quel que soit ce réglage, une session se termine 30 jours après son ouverture.",
    "Una sessione in uso riceve un nuovo ID e un nuovo cookie a ogni rinnovo, e l'ID precedente resta valido per 30 secondi, così le richieste già in corso non vengono disconnesse. Disattivato, l'ID dura quanto la sessione. Qualunque sia questa impostazione, una sessione termina 30 giorni dopo l'apertura.",
    "使用中のセッションは更新のたびに新しいIDとクッキーを受け取り、直前のIDは30秒間有効なので、すでに送信中のリクエストがサインアウトされることはありません。オフの間、IDはセッションと同じ期間続きます。この設定にかかわらず、セッションは開始から30日で終了します。",
    "使用中的会话每次续期都会获得新的 ID 和 Cookie，上一个 ID 还会有效 30 秒，因此已在途中的请求不会被登出。关闭时，ID 与会话同寿。无论此设置如何，会话在开启 30 天后结束。",
  ],
  sec_opt_rotateid_warn: [
    "Without it a session id never changes while the session lives. Turn it on so a stolen cookie stops working when the real session renews.",
    "Sin esto el id de una sesión no cambia mientras la sesión vive. Actívalo para que una cookie robada deje de servir cuando la sesión real se renueve.",
    "Ohne dies ändert sich die Sitzungs-ID nie, solange die Sitzung lebt. Schalten Sie es ein, damit ein gestohlenes Cookie wertlos wird, sobald die echte Sitzung erneuert wird.",
    "Sans cela, l'identifiant d'une session ne change jamais tant que la session vit. Activez-le pour qu'un cookie volé cesse de fonctionner quand la vraie session se renouvelle.",
    "Senza questo, l'ID di una sessione non cambia mai finché la sessione vive. Attivalo perché un cookie rubato smetta di funzionare quando la sessione reale si rinnova.",
    "オフの間、セッションが続く限りセッションIDは変わりません。オンにすると、本物のセッションが更新された時点で盗まれたクッキーが使えなくなります。",
    "关闭时，会话存续期间其 ID 永不改变。开启后，真实会话续期时被盗的 Cookie 就会失效。",
  ],
};

const PT: Record<string, string> = {
  sec_opt_rotateid: "Novo id de sessão em cada renovação",
  sec_opt_rotateid_help: "Uma sessão em uso recebe um id e um cookie novos de cada vez que é renovada, e o id anterior continua a valer 30 segundos para que os pedidos já a caminho não terminem a sessão. Desligado, o id dura o mesmo que a sessão. Seja qual for este ajuste, uma sessão termina 30 dias depois de aberta.",
  sec_opt_rotateid_warn: "Sem isto, o id de uma sessão não muda enquanto a sessão viver. Ligue-o para que um cookie roubado deixe de servir quando a sessão verdadeira se renovar.",
};

export const sessionRotateCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
