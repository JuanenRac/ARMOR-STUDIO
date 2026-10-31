/**
 * Interface text of the two reports that Configuration > Security can switch on: the summary of a day and the activity heat map of a camera (both off by default, for administrators and
 * operators only). One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  sec_opt_dailysummary: ["Summary of a day for administrators and operators", "Resumen de un día para administradores y operadores", "Tageszusammenfassung für Administratoren und Operatoren", "Résumé d'une journée pour les administrateurs et les opérateurs", "Riepilogo di una giornata per amministratori e operatori", "管理者とオペレーター向けの 1 日の要約", "面向管理员和操作员的每日摘要"],
  sec_opt_dailysummary_help: [
    "Administrators and operators may ask the server for the summary of a day: counts, serious alarms, patterns and a text in the language of the installation, made by ARMOR-SERVER-AI from the alarms the server kept. It raises no alarm and shows no password or key. Off, the route answers 404.",
    "Los administradores y operadores pueden pedir al servidor el resumen de un día: cuentas, alarmas graves, patrones y un texto en el idioma de la instalación, hecho por ARMOR-SERVER-AI con las alarmas que el servidor guardó. No levanta ninguna alarma y no muestra contraseñas ni claves. Desactivado, la ruta responde 404.",
    "Administratoren und Operatoren dürfen beim Server die Zusammenfassung eines Tages abfragen: Zählungen, schwere Alarme, Muster und ein Text in der Sprache der Anlage, von ARMOR-SERVER-AI aus den vom Server gespeicherten Alarmen erstellt. Sie löst keinen Alarm aus und zeigt kein Passwort und keinen Schlüssel. Ausgeschaltet antwortet die Route mit 404.",
    "Les administrateurs et les opérateurs peuvent demander au serveur le résumé d'une journée : comptes, alarmes graves, motifs et un texte dans la langue de l'installation, produit par ARMOR-SERVER-AI à partir des alarmes conservées par le serveur. Il ne déclenche aucune alarme et n'affiche ni mot de passe ni clé. Désactivé, la route répond 404.",
    "Amministratori e operatori possono chiedere al server il riepilogo di una giornata: conteggi, allarmi gravi, schemi e un testo nella lingua dell'impianto, prodotto da ARMOR-SERVER-AI dagli allarmi conservati dal server. Non genera allarmi e non mostra password né chiavi. Disattivato, la rotta risponde 404.",
    "管理者とオペレーターは、サーバーに 1 日の要約（件数、重大なアラーム、パターン、設置の言語の文章）を要求できます。サーバーが保存したアラームから ARMOR-SERVER-AI が作成します。アラームは発生させず、パスワードやキーも表示しません。オフの間はルートは 404 を返します。",
    "管理员和操作员可以向服务器请求某一天的摘要：计数、严重报警、规律，以及用安装所设语言写成的文字，由 ARMOR-SERVER-AI 根据服务器保存的报警生成。它不会触发报警，也不显示任何密码或密钥。关闭时该路由返回 404。",
  ],
  sec_opt_dailysummary_warn: [
    "Turning it on lets any administrator or operator read what happened in the house during a day: which alarms, where and when. It is a report only and changes nothing.",
    "Activarlo permite que cualquier administrador u operador lea lo que pasó en la casa durante un día: qué alarmas, dónde y cuándo. Es solo un informe y no cambia nada.",
    "Das Einschalten erlaubt jedem Administrator und Operator zu lesen, was an einem Tag im Haus geschah: welche Alarme, wo und wann. Es ist nur ein Bericht und ändert nichts.",
    "L'activer permet à tout administrateur ou opérateur de lire ce qui s'est passé dans la maison pendant une journée : quelles alarmes, où et quand. C'est un simple rapport qui ne change rien.",
    "Attivarlo consente a qualunque amministratore o operatore di leggere cosa è successo in casa durante una giornata: quali allarmi, dove e quando. È solo un rapporto e non cambia nulla.",
    "オンにすると、管理者やオペレーターなら誰でも、ある日に家で起きたこと（どのアラームがいつどこで）を読めるようになります。報告のみで、何も変更しません。",
    "开启后，任何管理员或操作员都可以读到某一天家中发生的事：哪些报警、在哪里、何时。它只是报告，不会改变任何东西。",
  ],
  sec_opt_heatmap: ["Activity heat map of a camera", "Mapa de calor de actividad de una cámara", "Aktivitäts-Heatmap einer Kamera", "Carte de chaleur de l'activité d'une caméra", "Mappa di calore dell'attività di una telecamera", "カメラのアクティビティ ヒートマップ", "摄像头活动热力图"],
  sec_opt_heatmap_help: [
    "Administrators and operators may ask the server for the heat map of a camera: how much activity there was in each part of the scene, made by ARMOR-VISION from recorded detections. Only positions are counted, never pictures. Off, the route answers 404.",
    "Los administradores y operadores pueden pedir al servidor el mapa de calor de una cámara: cuánta actividad hubo en cada parte de la escena, hecho por ARMOR-VISION con detecciones grabadas. Solo se cuentan posiciones, nunca imágenes. Desactivado, la ruta responde 404.",
    "Administratoren und Operatoren dürfen beim Server die Heatmap einer Kamera abfragen: wie viel Aktivität es in jedem Teil der Szene gab, von ARMOR-VISION aus aufgezeichneten Erkennungen erstellt. Gezählt werden nur Positionen, nie Bilder. Ausgeschaltet antwortet die Route mit 404.",
    "Les administrateurs et les opérateurs peuvent demander au serveur la carte de chaleur d'une caméra : quelle activité il y a eu dans chaque partie de la scène, produite par ARMOR-VISION à partir de détections enregistrées. Seules les positions sont comptées, jamais d'images. Désactivé, la route répond 404.",
    "Amministratori e operatori possono chiedere al server la mappa di calore di una telecamera: quanta attività c'è stata in ogni parte della scena, prodotta da ARMOR-VISION da rilevamenti registrati. Si contano solo posizioni, mai immagini. Disattivato, la rotta risponde 404.",
    "管理者とオペレーターは、サーバーにカメラのヒートマップ（シーンの各部分でどれだけ動きがあったか）を要求できます。記録された検出から ARMOR-VISION が作成します。数えるのは位置だけで、画像は使いません。オフの間はルートは 404 を返します。",
    "管理员和操作员可以向服务器请求某个摄像头的热力图：场景各部分有多少活动，由 ARMOR-VISION 根据记录的检测结果生成。只统计位置，绝不使用图像。关闭时该路由返回 404。",
  ],
  sec_opt_heatmap_warn: [
    "Turning it on lets any administrator or operator see where people moved in front of a camera. It holds no picture, but it is information about people: leave it off unless you need it.",
    "Activarlo permite que cualquier administrador u operador vea por dónde se movió la gente delante de una cámara. No contiene ninguna imagen, pero es información sobre personas: déjelo desactivado salvo que lo necesite.",
    "Das Einschalten erlaubt jedem Administrator und Operator zu sehen, wo sich Personen vor einer Kamera bewegt haben. Es enthält kein Bild, aber es sind Informationen über Personen: lassen Sie es aus, wenn Sie es nicht brauchen.",
    "L'activer permet à tout administrateur ou opérateur de voir où des personnes se sont déplacées devant une caméra. Elle ne contient aucune image, mais ce sont des informations sur des personnes : laissez-la désactivée sauf besoin.",
    "Attivarla consente a qualunque amministratore o operatore di vedere dove si sono mosse le persone davanti a una telecamera. Non contiene immagini, ma sono informazioni sulle persone: lasciala disattivata se non serve.",
    "オンにすると、管理者やオペレーターなら誰でも、カメラの前で人がどこを動いたかを見られるようになります。画像は含みませんが、人に関する情報です。必要がなければオフのままにしてください。",
    "开启后，任何管理员或操作员都可以看到人们在摄像头前走动的位置。它不含图像，但属于与人有关的信息：不需要时请保持关闭。",
  ],
};

const PT: Record<string, string> = {
  sec_opt_dailysummary: "Resumo de um dia para administradores e operadores",
  sec_opt_dailysummary_help: "Os administradores e operadores podem pedir ao servidor o resumo de um dia: contagens, alarmes graves, padrões e um texto no idioma da instalação, feito pelo ARMOR-SERVER-AI a partir dos alarmes que o servidor guardou. Não dispara nenhum alarme e não mostra palavras-passe nem chaves. Desligado, a rota responde 404.",
  sec_opt_dailysummary_warn: "Ligá-lo permite que qualquer administrador ou operador leia o que aconteceu em casa durante um dia: que alarmes, onde e quando. É apenas um relatório e não altera nada.",
  sec_opt_heatmap: "Mapa de calor da atividade de uma câmara",
  sec_opt_heatmap_help: "Os administradores e operadores podem pedir ao servidor o mapa de calor de uma câmara: quanta atividade houve em cada parte da cena, feito pelo ARMOR-VISION a partir de deteções gravadas. Contam-se apenas posições, nunca imagens. Desligado, a rota responde 404.",
  sec_opt_heatmap_warn: "Ligá-lo permite que qualquer administrador ou operador veja por onde as pessoas se moveram à frente de uma câmara. Não contém nenhuma imagem, mas é informação sobre pessoas: deixe-o desligado, a não ser que precise dele.",
};

export const reportsCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
