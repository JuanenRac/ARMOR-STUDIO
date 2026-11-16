/**
 * Interface text of the three switches that used to exist only as environment variables of the server: the strict ingest mode (each node with its own token), the writing to
 * batteries and the update of the machine from Studio (Configuration > Security), and the line that names the nodes still using the shared token.
 * One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  sec_opt_ingeststrict: ["Each node needs its own token", "Cada nodo necesita su propio token", "Jeder Knoten braucht sein eigenes Token", "Chaque nœud a besoin de son propre jeton", "Ogni nodo richiede il proprio token", "ノードごとに専用トークンを必須にする", "每个节点都必须使用自己的令牌"],
  sec_opt_ingeststrict_help: [
    "On, the shared ingest token is no longer accepted from the nodes: each one has to hold its own token, which is worked out from the shared one and is good only for its own id. Off, the default, so the boards already in the field keep working, a board that holds the shared token can speak as any node. Give every node its own token before turning it on.",
    "Activado, el token de ingesta compartido deja de aceptarse de los nodos: cada uno debe tener su propio token, que se calcula a partir del compartido y solo vale para su propio id. Desactivado, el valor por defecto, para que las placas ya desplegadas sigan funcionando, una placa que tenga el token compartido puede hablar como cualquier nodo. Da a cada nodo su token antes de activarlo.",
    "Eingeschaltet wird das gemeinsame Ingest-Token von den Knoten nicht mehr akzeptiert: Jeder muss sein eigenes Token besitzen, das aus dem gemeinsamen berechnet wird und nur für die eigene ID gilt. Ausgeschaltet (Standard), damit bereits ausgelieferte Platinen weiterarbeiten, kann eine Platine mit dem gemeinsamen Token als beliebiger Knoten sprechen. Geben Sie jedem Knoten sein Token, bevor Sie dies einschalten.",
    "Activé, le jeton d'ingestion partagé n'est plus accepté des nœuds : chacun doit détenir son propre jeton, calculé à partir du jeton partagé et valable uniquement pour son propre identifiant. Désactivé (par défaut), pour que les cartes déjà déployées continuent de fonctionner, une carte qui détient le jeton partagé peut parler comme n'importe quel nœud. Donnez à chaque nœud son jeton avant de l'activer.",
    "Attivo, il token di ingestione condiviso non è più accettato dai nodi: ognuno deve avere il proprio token, calcolato da quello condiviso e valido solo per il proprio id. Disattivato, il valore predefinito, perché le schede già installate continuino a funzionare, una scheda che possiede il token condiviso può parlare come qualsiasi nodo. Assegna a ogni nodo il suo token prima di attivarlo.",
    "オンにすると、共有の取り込みトークンはノードから受け付けられなくなり、各ノードは共有トークンから算出された自分専用のトークン（自分のIDにのみ有効）を持つ必要があります。オフ（既定）の間は、すでに設置された基板が動き続けますが、共有トークンを持つ基板は任意のノードになりすませます。オンにする前に、すべてのノードに専用トークンを渡してください。",
    "开启后，服务器不再接受节点使用共享的接入令牌：每个节点必须持有自己的令牌，该令牌由共享令牌计算得出，仅对自己的 ID 有效。关闭（默认）时，已部署的电路板可继续工作，但持有共享令牌的电路板可以冒充任何节点。开启前请先为每个节点配置自己的令牌。",
  ],
  sec_opt_ingeststrict_warn: [
    "Turning it off lets every board holding the shared token speak as any node again.",
    "Al desactivarlo, cualquier placa que tenga el token compartido vuelve a poder hablar como cualquier nodo.",
    "Beim Ausschalten kann jede Platine mit dem gemeinsamen Token wieder als beliebiger Knoten sprechen.",
    "En le désactivant, toute carte qui détient le jeton partagé peut de nouveau parler comme n'importe quel nœud.",
    "Disattivandolo, qualsiasi scheda che possieda il token condiviso può di nuovo parlare come qualsiasi nodo.",
    "オフにすると、共有トークンを持つ基板が再び任意のノードになりすませるようになります。",
    "关闭后，持有共享令牌的任何电路板都可以再次冒充任何节点。",
  ],
  sec_opt_ingeststrict_nodes: [
    "Still using the shared token: {nodes}. Give each of them its own token before turning the strict mode on, or it will be refused.",
    "Siguen usando el token compartido: {nodes}. Da a cada uno su propio token antes de activar el modo estricto, o será rechazado.",
    "Verwenden noch das gemeinsame Token: {nodes}. Geben Sie jedem sein eigenes Token, bevor Sie den strengen Modus einschalten, sonst wird es abgewiesen.",
    "Utilisent encore le jeton partagé : {nodes}. Donnez à chacun son propre jeton avant d'activer le mode strict, sinon il sera refusé.",
    "Usano ancora il token condiviso: {nodes}. Assegna a ciascuno il proprio token prima di attivare la modalità rigorosa, altrimenti verrà rifiutato.",
    "共有トークンをまだ使用中: {nodes}。厳格モードをオンにする前に、それぞれに専用トークンを渡してください。渡さないと拒否されます。",
    "仍在使用共享令牌：{nodes}。开启严格模式前，请为每个节点配置自己的令牌，否则会被拒绝。",
  ],
  sec_opt_batterywrite: ["Writing to the batteries", "Escritura en las baterías", "Schreiben in die Batterien", "Écriture dans les batteries", "Scrittura nelle batterie", "バッテリーへの書き込み", "向电池写入"],
  sec_opt_batterywrite_help: [
    "On, this server may order a gateway node to write to a Pylontech battery: clock, counters, limits, outputs, serial number and firmware. Only an administrator who has just proved themselves again, with the serial number of the battery typed, can order it, and the gateway node and the broker have to allow it too. Off, the default, the routes answer 403.",
    "Activado, este servidor puede ordenar a un nodo pasarela que escriba en una batería Pylontech: reloj, contadores, límites, salidas, número de serie y firmware. Solo un administrador que acabe de demostrar de nuevo quién es, escribiendo el número de serie de la batería, puede ordenarlo, y el nodo pasarela y el broker también deben permitirlo. Desactivado, el valor por defecto, las rutas responden 403.",
    "Eingeschaltet darf dieser Server einem Gateway-Knoten befehlen, in eine Pylontech-Batterie zu schreiben: Uhr, Zähler, Grenzwerte, Ausgänge, Seriennummer und Firmware. Nur ein Administrator, der sich gerade erneut ausgewiesen und die Seriennummer der Batterie eingegeben hat, kann das anordnen, und auch der Gateway-Knoten und der Broker müssen es erlauben. Ausgeschaltet (Standard) antworten die Routen mit 403.",
    "Activé, ce serveur peut ordonner à un nœud passerelle d'écrire dans une batterie Pylontech : horloge, compteurs, limites, sorties, numéro de série et micrologiciel. Seul un administrateur qui vient de prouver de nouveau son identité, en saisissant le numéro de série de la batterie, peut l'ordonner, et le nœud passerelle et le broker doivent aussi l'autoriser. Désactivé (par défaut), les routes répondent 403.",
    "Attivo, questo server può ordinare a un nodo gateway di scrivere in una batteria Pylontech: orologio, contatori, limiti, uscite, numero di serie e firmware. Solo un amministratore che ha appena dimostrato di nuovo la propria identità, digitando il numero di serie della batteria, può ordinarlo, e anche il nodo gateway e il broker devono consentirlo. Disattivato, il valore predefinito, le rotte rispondono 403.",
    "オンにすると、このサーバーはゲートウェイノードに Pylontech バッテリーへの書き込み（時計、カウンター、制限値、出力、シリアル番号、ファームウェア）を指示できます。再認証したばかりで、バッテリーのシリアル番号を入力した管理者だけが指示でき、ゲートウェイノードとブローカーも許可している必要があります。オフ（既定）の間は、ルートは 403 を返します。",
    "开启后，本服务器可以命令网关节点向 Pylontech 电池写入：时钟、计数器、限值、输出、序列号和固件。只有刚刚再次验证身份并输入电池序列号的管理员才能下达，网关节点和代理也必须允许。关闭（默认）时，相关路由返回 403。",
  ],
  sec_opt_batterywrite_warn: [
    "Turning it on lets an administrator change what a battery keeps. Some of it cannot be undone and can void the maker's warranty.",
    "Al activarlo, un administrador puede cambiar lo que guarda una batería. Parte de ello no se puede deshacer y puede anular la garantía del fabricante.",
    "Beim Einschalten kann ein Administrator ändern, was eine Batterie speichert. Einiges davon lässt sich nicht rückgängig machen und kann die Garantie des Herstellers erlöschen lassen.",
    "En l'activant, un administrateur peut modifier ce que conserve une batterie. Une partie est irréversible et peut annuler la garantie du fabricant.",
    "Attivandolo, un amministratore può modificare ciò che conserva una batteria. Una parte non si può annullare e può invalidare la garanzia del produttore.",
    "オンにすると、管理者がバッテリーの保持内容を変更できるようになります。一部は元に戻せず、メーカー保証が無効になる場合があります。",
    "开启后，管理员可以更改电池保存的内容。其中一部分无法撤销，并可能使厂商保修失效。",
  ],
  sec_opt_cm5update: ["Update this machine from Studio", "Actualizar esta máquina desde Studio", "Diese Maschine aus Studio aktualisieren", "Mettre à jour cette machine depuis Studio", "Aggiornare questa macchina da Studio", "Studio からこのマシンを更新する", "通过 Studio 更新这台机器"],
  sec_opt_cm5update_help: [
    "On, Studio and the phone may ask the maintenance agent to update the programs of this machine: a preview first, then the project typed again, a recent proof of identity and the one-time code of the administrator. Only a signed release is put in place, and the agent has its own switch. Off, the default, the routes answer 403.",
    "Activado, Studio y el móvil pueden pedir al agente de mantenimiento que actualice los programas de esta máquina: primero una vista previa, luego el proyecto escrito otra vez, una prueba de identidad reciente y el código de un solo uso del administrador. Solo se instala una versión firmada, y el agente tiene su propio interruptor. Desactivado, el valor por defecto, las rutas responden 403.",
    "Eingeschaltet können Studio und das Telefon den Wartungsagenten bitten, die Programme dieser Maschine zu aktualisieren: erst eine Vorschau, dann das erneut eingegebene Projekt, ein aktueller Identitätsnachweis und der Einmalcode des Administrators. Es wird nur ein signiertes Release eingespielt, und der Agent hat einen eigenen Schalter. Ausgeschaltet (Standard) antworten die Routen mit 403.",
    "Activé, Studio et le téléphone peuvent demander à l'agent de maintenance de mettre à jour les programmes de cette machine : d'abord un aperçu, puis le projet saisi de nouveau, une preuve d'identité récente et le code à usage unique de l'administrateur. Seule une version signée est installée, et l'agent a son propre interrupteur. Désactivé (par défaut), les routes répondent 403.",
    "Attivo, Studio e il telefono possono chiedere all'agente di manutenzione di aggiornare i programmi di questa macchina: prima un'anteprima, poi il progetto digitato di nuovo, una prova di identità recente e il codice monouso dell'amministratore. Viene installata solo una versione firmata, e l'agente ha un proprio interruttore. Disattivato, il valore predefinito, le rotte rispondono 403.",
    "オンにすると、Studio とスマートフォンからメンテナンスエージェントにこのマシンのプログラム更新を依頼できます。最初にプレビュー、次にプロジェクト名の再入力、最近の本人確認、管理者のワンタイムコードが必要です。署名済みのリリースだけが適用され、エージェント側にも専用のスイッチがあります。オフ（既定）の間は、ルートは 403 を返します。",
    "开启后，Studio 和手机可以请求维护代理更新这台机器上的程序：先预览，再重新输入项目名称，还需要近期的身份验证和管理员的一次性验证码。只会安装已签名的版本，代理自身也有独立开关。关闭（默认）时，相关路由返回 403。",
  ],
  sec_opt_cm5update_warn: [
    "Turning it on lets an administrator replace the programs of this machine from the app. Only signed releases are accepted, but it changes what runs here.",
    "Al activarlo, un administrador puede sustituir los programas de esta máquina desde la app. Solo se aceptan versiones firmadas, pero cambia lo que se ejecuta aquí.",
    "Beim Einschalten kann ein Administrator die Programme dieser Maschine über die App ersetzen. Es werden nur signierte Releases akzeptiert, aber es ändert, was hier läuft.",
    "En l'activant, un administrateur peut remplacer les programmes de cette machine depuis l'application. Seules les versions signées sont acceptées, mais cela change ce qui s'exécute ici.",
    "Attivandolo, un amministratore può sostituire i programmi di questa macchina dall'app. Sono accettate solo versioni firmate, ma cambia ciò che viene eseguito qui.",
    "オンにすると、管理者がアプリからこのマシンのプログラムを入れ替えられるようになります。署名済みのリリースしか受け付けませんが、ここで動くものが変わります。",
    "开启后，管理员可以通过应用替换这台机器上的程序。只接受已签名的版本，但这会改变这里运行的内容。",
  ],
};

const PT: Record<string, string> = {
  sec_opt_ingeststrict: "Cada nó precisa do seu próprio token",
  sec_opt_ingeststrict_help: "Ligado, o token de ingestão partilhado deixa de ser aceite dos nós: cada um tem de ter o seu próprio token, calculado a partir do partilhado e válido só para o seu id. Desligado, o valor por defeito, para que as placas já instaladas continuem a funcionar, uma placa que tenha o token partilhado pode falar como qualquer nó. Dê a cada nó o seu token antes de o ligar.",
  sec_opt_ingeststrict_warn: "Ao desligá-lo, qualquer placa que tenha o token partilhado volta a poder falar como qualquer nó.",
  sec_opt_ingeststrict_nodes: "Ainda usam o token partilhado: {nodes}. Dê a cada um o seu próprio token antes de ligar o modo estrito, ou será recusado.",
  sec_opt_batterywrite: "Escrita nas baterias",
  sec_opt_batterywrite_help: "Ligado, este servidor pode ordenar a um nó de gateway que escreva numa bateria Pylontech: relógio, contadores, limites, saídas, número de série e firmware. Só um administrador que tenha acabado de provar de novo quem é, escrevendo o número de série da bateria, o pode ordenar, e o nó de gateway e o broker também têm de o permitir. Desligado, o valor por defeito, as rotas respondem 403.",
  sec_opt_batterywrite_warn: "Ao ligá-lo, um administrador pode alterar o que uma bateria guarda. Parte disso não se pode desfazer e pode anular a garantia do fabricante.",
  sec_opt_cm5update: "Atualizar esta máquina a partir do Studio",
  sec_opt_cm5update_help: "Ligado, o Studio e o telemóvel podem pedir ao agente de manutenção que atualize os programas desta máquina: primeiro uma pré-visualização, depois o projeto escrito outra vez, uma prova de identidade recente e o código de utilização única do administrador. Só é instalada uma versão assinada, e o agente tem o seu próprio interruptor. Desligado, o valor por defeito, as rotas respondem 403.",
  sec_opt_cm5update_warn: "Ao ligá-lo, um administrador pode substituir os programas desta máquina a partir da aplicação. Só são aceites versões assinadas, mas altera o que é executado aqui.",
};

export const ingestSwitchesCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
