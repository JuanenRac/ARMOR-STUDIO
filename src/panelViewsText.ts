/**
 * Interface text of the switches that give the wall panel more than its summary (Configuration > Security): the check before arming, a still picture of a camera, the solar readings and the one battery operation.
 * It also holds the switch that lets the server read an inverter's Wi-Fi dongle.
 * One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  sec_opt_panelpreflight: ["Check before arming on the wall panel", "Comprobación antes de armar en el panel de pared", "Prüfung vor dem Scharfschalten am Wandpanel", "Vérification avant l'armement sur le panneau mural", "Controllo prima dell'inserimento sul pannello a muro", "壁パネルでの警戒前チェック", "墙面面板上的布防前检查"],
  sec_opt_panelpreflight_help: [
    "The account of a wall panel may read the check before arming (nodes that do not answer, open doors and windows, alarms nobody has seen) to show it when the person presses Arm. Off: the panel arms as before and is refused this reading.",
    "La cuenta de un panel de pared puede leer la comprobación previa a armar (nodos que no responden, puertas y ventanas abiertas, alarmas sin ver) para mostrarla cuando la persona pulsa Armar. Desactivado: el panel arma como antes y se le niega esta lectura.",
    "Das Konto eines Wandpanels darf die Prüfung vor dem Scharfschalten lesen (Knoten ohne Antwort, offene Türen und Fenster, ungesehene Alarme), um sie beim Drücken von Scharf anzuzeigen. Aus: Das Panel schaltet wie bisher scharf und bekommt diese Auskunft nicht.",
    "Le compte d'un panneau mural peut lire la vérification avant armement (nœuds qui ne répondent pas, portes et fenêtres ouvertes, alarmes non vues) pour l'afficher quand la personne appuie sur Armer. Désactivé : le panneau arme comme avant et se voit refuser cette lecture.",
    "L'account di un pannello a muro può leggere il controllo prima dell'inserimento (nodi che non rispondono, porte e finestre aperte, allarmi non visti) per mostrarlo quando la persona preme Inserisci. Disattivato: il pannello inserisce come prima e gli viene negata questa lettura.",
    "壁パネルのアカウントが警戒前チェック（応答しないノード、開いているドアや窓、未確認の警報）を読み取り、警戒ボタンを押したときに表示できるようにします。オフ：パネルはこれまでどおり警戒し、この読み取りは拒否されます。",
    "允许墙面面板的账户读取布防前检查（无响应的节点、敞开的门窗、未查看的警报），并在有人按下布防时显示。关闭时：面板像以前一样布防，并且这项读取会被拒绝。",
  ],
  sec_opt_panelpreflight_warn: [
    "It lets that account learn which nodes are down and which openings are open. Turn it on only for a panel in a place you trust.",
    "Permite a esa cuenta saber qué nodos están caídos y qué aperturas están abiertas. Actívala solo para un panel en un lugar de confianza.",
    "Damit erfährt dieses Konto, welche Knoten ausgefallen und welche Öffnungen offen sind. Schalten Sie es nur für ein Panel an einem vertrauenswürdigen Ort ein.",
    "Ce compte apprend ainsi quels nœuds sont hors service et quelles ouvertures sont ouvertes. Ne l'activez que pour un panneau placé dans un lieu de confiance.",
    "Quell'account viene così a sapere quali nodi sono giù e quali aperture sono aperte. Attivalo solo per un pannello in un luogo fidato.",
    "このアカウントは、どのノードが停止し、どの開口部が開いているかを知ることができます。信頼できる場所にあるパネルにのみオンにしてください。",
    "该账户将能得知哪些节点离线、哪些门窗敞开。仅对放置在可信场所的面板开启。",
  ],
  sec_opt_panelcamera: ["Camera picture on the wall panel", "Imagen de cámara en el panel de pared", "Kamerabild am Wandpanel", "Image de caméra sur le panneau mural", "Immagine della telecamera sul pannello a muro", "壁パネルでのカメラ画像", "墙面面板上的摄像头画面"],
  sec_opt_panelcamera_help: [
    "The account of a wall panel may read a still picture of a camera (at most one every two seconds for each camera, nothing saved) to show it on demand. Off: the panel is refused the picture.",
    "La cuenta de un panel de pared puede leer una imagen fija de una cámara (como mucho una cada dos segundos por cámara, sin guardar nada) para mostrarla a petición. Desactivado: al panel se le niega la imagen.",
    "Das Konto eines Wandpanels darf ein Standbild einer Kamera lesen (höchstens eines alle zwei Sekunden je Kamera, nichts wird gespeichert), um es auf Wunsch anzuzeigen. Aus: Das Panel bekommt das Bild nicht.",
    "Le compte d'un panneau mural peut lire une image fixe d'une caméra (au plus une toutes les deux secondes par caméra, rien n'est enregistré) pour l'afficher à la demande. Désactivé : l'image est refusée au panneau.",
    "L'account di un pannello a muro può leggere un'immagine fissa di una telecamera (al massimo una ogni due secondi per telecamera, nulla viene salvato) per mostrarla su richiesta. Disattivato: al pannello l'immagine viene negata.",
    "壁パネルのアカウントがカメラの静止画（カメラごとに2秒に1枚まで、何も保存されません）を読み取り、必要なときに表示できるようにします。オフ：パネルには画像が渡されません。",
    "允许墙面面板的账户读取摄像头的静态画面（每个摄像头最多每两秒一张，不保存任何内容），并按需显示。关闭时：面板无法获取画面。",
  ],
  sec_opt_panelcamera_warn: [
    "Whoever can touch that panel can look at the camera chosen for it. Turn it on only for a camera that may be seen from there.",
    "Quien pueda tocar ese panel puede mirar la cámara elegida para él. Actívala solo para una cámara que pueda verse desde ahí.",
    "Wer das Panel berühren kann, kann die dafür gewählte Kamera ansehen. Schalten Sie es nur für eine Kamera ein, die von dort aus einsehbar sein darf.",
    "Toute personne qui peut toucher ce panneau peut regarder la caméra choisie pour lui. Ne l'activez que pour une caméra qui peut être vue depuis cet endroit.",
    "Chi può toccare quel pannello può guardare la telecamera scelta per esso. Attivalo solo per una telecamera che può essere vista da lì.",
    "そのパネルに触れられる人は、割り当てられたカメラを見ることができます。そこから見えてよいカメラにのみオンにしてください。",
    "任何能触碰该面板的人都可以查看为其选定的摄像头。仅对允许从该处查看的摄像头开启。",
  ],
  sec_opt_panelsolar: ["Solar readings on a wall screen", "Lecturas solares en una pantalla de pared", "Solarwerte auf einem Wandbildschirm", "Relevés solaires sur un écran mural", "Letture solari su uno schermo a muro", "壁の画面で太陽光の値を表示", "墙面屏幕上的太阳能读数"],
  sec_opt_panelsolar_help: ["The account of a wall panel may read the batteries and inverters, cut down for a small screen. Off: it is refused them.", "La cuenta de un panel de pared puede leer las baterías y los inversores, resumidos para una pantalla pequeña. Desactivado: se le niegan.", "Das Konto eines Wandpanels darf Batterien und Wechselrichter lesen, gekürzt für einen kleinen Bildschirm. Aus: Es bekommt sie nicht.", "Le compte d'un panneau mural peut lire les batteries et les onduleurs, résumés pour un petit écran. Désactivé : ils lui sont refusés.", "L'account di un pannello a muro può leggere batterie e inverter, ridotti per un piccolo schermo. Disattivato: gli vengono negati.", "壁パネルのアカウントが、小さな画面向けに要約したバッテリーとインバーターの値を読めます。オフ：読み取りは拒否されます。", "允许墙面面板的账户读取为小屏幕精简后的电池和逆变器数据。关闭时：拒绝读取。"],
  sec_opt_panelsolar_warn: ["Whoever can see that screen learns how much energy the house makes, uses and keeps.", "Quien pueda ver esa pantalla sabrá cuánta energía produce, gasta y guarda la casa.", "Wer den Bildschirm sieht, erfährt, wie viel Energie das Haus erzeugt, verbraucht und speichert.", "Toute personne qui voit cet écran apprend combien d'énergie la maison produit, consomme et stocke.", "Chi può vedere quello schermo sa quanta energia la casa produce, consuma e conserva.", "その画面を見られる人は、家の発電量、消費量、蓄電量を知ることができます。", "任何能看到该屏幕的人都会知道这栋房子的发电、用电和储电情况。"],
  sec_opt_panelbattery: ["Reset battery counters from a wall screen", "Borrar contadores de batería desde una pantalla de pared", "Batteriezähler am Wandbildschirm löschen", "Effacer les compteurs d'une batterie depuis un écran mural", "Azzerare i contatori della batteria da uno schermo a muro", "壁の画面から電池カウンタを消去", "从墙面屏幕清零电池计数器"],
  sec_opt_panelbattery_help: ["The account of a wall panel may reset the statistics counters of a battery, and nothing else, typing its PIN at every step. Writing to the batteries has to be on as well. Off: refused.", "La cuenta de un panel de pared puede borrar los contadores de estadísticas de una batería, y nada más, tecleando su PIN en cada paso. La escritura en las baterías también tiene que estar activada. Desactivado: se niega.", "Das Konto eines Wandpanels darf die Statistikzähler einer Batterie löschen, sonst nichts, mit PIN bei jedem Schritt. Das Schreiben in die Batterien muss ebenfalls an sein. Aus: verweigert.", "Le compte d'un panneau mural peut effacer les compteurs statistiques d'une batterie, et rien d'autre, avec son code à chaque étape. L'écriture dans les batteries doit aussi être activée. Désactivé : refusé.", "L'account di un pannello a muro può azzerare i contatori statistici di una batteria, e nient'altro, digitando il PIN a ogni passo. Anche la scrittura nelle batterie deve essere attiva. Disattivato: negato.", "壁パネルのアカウントは、毎回 PIN を入力して電池の統計カウンタを消去できます（それ以外は不可）。電池への書き込みもオンである必要があります。オフ：拒否されます。", "允许墙面面板的账户清零电池的统计计数器（仅此一项），每一步都要输入 PIN。电池写入也必须开启。关闭时：拒绝。"],
  sec_opt_panelbattery_warn: ["The counters of a battery are lost for good. It has never been tried on a real battery.", "Los contadores de una batería se pierden para siempre. Nunca se ha probado en una batería real.", "Die Zähler einer Batterie gehen endgültig verloren. Es wurde nie an einer echten Batterie erprobt.", "Les compteurs d'une batterie sont perdus définitivement. Cela n'a jamais été essayé sur une vraie batterie.", "I contatori di una batteria vanno persi per sempre. Non è mai stato provato su una batteria vera.", "電池のカウンタは完全に失われます。実際の電池で試したことはありません。", "电池的计数器将永久丢失。从未在真实电池上试过。"],
  sec_opt_wifidongle: ["Read an inverter's Wi-Fi dongle", "Leer el pincho Wi-Fi de un inversor", "WLAN-Stick eines Wechselrichters lesen", "Lire la clé Wi-Fi d'un onduleur", "Leggere la chiavetta Wi-Fi di un inverter", "インバーターの Wi-Fi ドングルを読み取る", "读取逆变器的 Wi-Fi 通讯棒"],
  sec_opt_wifidongle_help: ["The server listens on the house network for the Wi-Fi dongle of an inverter (SmartESS, WatchPower Wi-Fi) and reads it. It only reads. It also needs the file solar-wifi-dongle.json with the allowed addresses, and a person has to point the dongle at the server by hand. Never tried on a real dongle.", "El servidor escucha en la red de casa el pincho Wi-Fi de un inversor (SmartESS, WatchPower Wi-Fi) y lo lee. Solo lee. Necesita además el fichero solar-wifi-dongle.json con las direcciones permitidas, y una persona tiene que apuntar a mano el pincho al servidor. Nunca probado con un pincho real.", "Der Server wartet im Hausnetz auf den WLAN-Stick eines Wechselrichters (SmartESS, WatchPower Wi-Fi) und liest ihn aus. Er liest nur. Dazu braucht er die Datei solar-wifi-dongle.json mit den erlaubten Adressen, und eine Person muss den Stick von Hand auf den Server richten. Nie an einem echten Stick erprobt.", "Le serveur attend sur le réseau de la maison la clé Wi-Fi d'un onduleur (SmartESS, WatchPower Wi-Fi) et la lit. Il ne fait que lire. Il faut aussi le fichier solar-wifi-dongle.json avec les adresses autorisées, et une personne doit diriger la clé vers le serveur à la main. Jamais essayé avec une vraie clé.", "Il server ascolta sulla rete di casa la chiavetta Wi-Fi di un inverter (SmartESS, WatchPower Wi-Fi) e la legge. Legge soltanto. Serve anche il file solar-wifi-dongle.json con gli indirizzi consentiti, e una persona deve puntare a mano la chiavetta al server. Mai provato con una chiavetta vera.", "サーバーは家庭内ネットワークでインバーターの Wi-Fi ドングル（SmartESS、WatchPower Wi-Fi）の接続を待ち、読み取ります。読み取りのみです。許可するアドレスを書いた solar-wifi-dongle.json ファイルも必要で、ドングルの接続先は人が手作業でサーバーに向けます。実機のドングルでは未検証です。", "服务器在家庭网络上等待逆变器的 Wi-Fi 通讯棒（SmartESS、WatchPower Wi-Fi）连接并读取数据。只读取。还需要写有允许地址的 solar-wifi-dongle.json 文件，并且必须由人手动把通讯棒指向服务器。从未在真实通讯棒上试过。"],
  sec_opt_wifidongle_warn: ["The dongle's protocol has no password and no encryption: anyone on your network can talk to it. While the dongle points at this server, the maker's app stops receiving data.", "El protocolo del pincho no tiene contraseña ni cifrado: cualquiera en tu red puede hablar con él. Mientras el pincho apunte a este servidor, la aplicación del fabricante deja de recibir datos.", "Das Protokoll des Sticks hat weder Kennwort noch Verschlüsselung: Jeder in Ihrem Netz kann mit ihm sprechen. Solange der Stick auf diesen Server zeigt, erhält die App des Herstellers keine Daten mehr.", "Le protocole de la clé n'a ni mot de passe ni chiffrement : toute personne de votre réseau peut lui parler. Tant que la clé pointe vers ce serveur, l'application du fabricant ne reçoit plus de données.", "Il protocollo della chiavetta non ha password né cifratura: chiunque sulla tua rete può parlarle. Finché la chiavetta punta a questo server, l'app del produttore non riceve più dati.", "ドングルの通信にはパスワードも暗号化もありません。同じネットワークにいれば誰でも通信できます。ドングルがこのサーバーを向いている間、メーカーのアプリにはデータが届かなくなります。", "通讯棒的协议既无密码也无加密：同一网络中的任何人都能与它通信。当通讯棒指向本服务器时，厂商的应用将不再收到数据。"],
};

const PT: Record<string, string> = {
  sec_opt_panelpreflight: "Verificação antes de armar no painel de parede",
  sec_opt_panelpreflight_help: "A conta de um painel de parede pode ler a verificação antes de armar (nós que não respondem, portas e janelas abertas, alarmes por ver) para a mostrar quando a pessoa carrega em Armar. Desligado: o painel arma como antes e esta leitura é-lhe recusada.",
  sec_opt_panelpreflight_warn: "Permite a essa conta saber que nós estão em baixo e que aberturas estão abertas. Ligue-o apenas para um painel num local de confiança.",
  sec_opt_panelcamera: "Imagem da câmara no painel de parede",
  sec_opt_panelcamera_help: "A conta de um painel de parede pode ler uma imagem fixa de uma câmara (no máximo uma de dois em dois segundos por câmara, sem guardar nada) para a mostrar a pedido. Desligado: a imagem é recusada ao painel.",
  sec_opt_panelcamera_warn: "Quem puder tocar nesse painel pode ver a câmara escolhida para ele. Ligue-o apenas para uma câmara que possa ser vista a partir daí.",
  sec_opt_panelsolar: "Leituras solares num ecrã de parede",
  sec_opt_panelsolar_help: "A conta de um painel de parede pode ler as baterias e os inversores, resumidos para um ecrã pequeno. Desligado: são-lhe recusados.",
  sec_opt_panelsolar_warn: "Quem puder ver esse ecrã fica a saber quanta energia a casa produz, gasta e guarda.",
  sec_opt_panelbattery: "Apagar contadores da bateria num ecrã de parede",
  sec_opt_panelbattery_help: "A conta de um painel de parede pode apagar os contadores estatísticos de uma bateria, e nada mais, escrevendo o PIN em cada passo. A escrita nas baterias também tem de estar ligada. Desligado: recusado.",
  sec_opt_panelbattery_warn: "Os contadores de uma bateria perdem-se para sempre. Nunca foi experimentado numa bateria real.",
  sec_opt_wifidongle: "Ler o adaptador Wi-Fi de um inversor",
  sec_opt_wifidongle_help: "O servidor escuta na rede de casa o adaptador Wi-Fi de um inversor (SmartESS, WatchPower Wi-Fi) e lê-o. Apenas lê. Precisa também do ficheiro solar-wifi-dongle.json com os endereços permitidos, e uma pessoa tem de apontar o adaptador para o servidor à mão. Nunca experimentado com um adaptador real.",
  sec_opt_wifidongle_warn: "O protocolo do adaptador não tem palavra-passe nem cifra: qualquer pessoa na sua rede pode comunicar com ele. Enquanto o adaptador apontar para este servidor, a aplicação do fabricante deixa de receber dados.",
};

export const panelViewsCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
