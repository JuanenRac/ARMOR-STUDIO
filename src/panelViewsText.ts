/**
 * Interface text of the two switches that let the wall panel read more than its summary (Configuration > Security): the check before arming and a still picture of a camera.
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
};

const PT: Record<string, string> = {
  sec_opt_panelpreflight: "Verificação antes de armar no painel de parede",
  sec_opt_panelpreflight_help: "A conta de um painel de parede pode ler a verificação antes de armar (nós que não respondem, portas e janelas abertas, alarmes por ver) para a mostrar quando a pessoa carrega em Armar. Desligado: o painel arma como antes e esta leitura é-lhe recusada.",
  sec_opt_panelpreflight_warn: "Permite a essa conta saber que nós estão em baixo e que aberturas estão abertas. Ligue-o apenas para um painel num local de confiança.",
  sec_opt_panelcamera: "Imagem da câmara no painel de parede",
  sec_opt_panelcamera_help: "A conta de um painel de parede pode ler uma imagem fixa de uma câmara (no máximo uma de dois em dois segundos por câmara, sem guardar nada) para a mostrar a pedido. Desligado: a imagem é recusada ao painel.",
  sec_opt_panelcamera_warn: "Quem puder tocar nesse painel pode ver a câmara escolhida para ele. Ligue-o apenas para uma câmara que possa ser vista a partir daí.",
};

export const panelViewsCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
