/**
 * Interface text of the Help book (levels, page turning, technical card): English, Spanish, German, French, Italian, Japanese, Chinese.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  hb_level: ["How much detail", "Cuánto detalle", "Wie viel Detail", "Quel niveau de détail", "Quanto dettaglio", "詳しさ", "详细程度"],
  hb_simple: ["Simple", "Sencillo", "Einfach", "Simple", "Semplice", "かんたん", "简单"],
  hb_medium: ["Medium", "Intermedio", "Mittel", "Intermédiaire", "Intermedio", "標準", "中等"],
  hb_advanced: ["Advanced", "Avanzado", "Fortgeschritten", "Avancé", "Avanzato", "上級", "高级"],
  hb_technical: ["Technical", "Técnico", "Technisch", "Technique", "Tecnico", "技術", "技术"],
  hb_simple_h: ["The idea in a few lines, for starting.", "La idea en pocas líneas, para empezar.", "Die Idee in wenigen Zeilen für den Anfang.", "L'idée en quelques lignes pour commencer.", "L'idea in poche righe per iniziare.", "最初に知っておきたいことを数行で。", "几行讲清要点，适合入门。"],
  hb_medium_h: ["What it is for and how to use it day to day.", "Para qué sirve y cómo se usa a diario.", "Wofür es da ist und wie man es täglich nutzt.", "À quoi cela sert et comment l'utiliser au quotidien.", "A cosa serve e come si usa ogni giorno.", "何のためにあり、日常どう使うか。", "它的用途和日常使用方法。"],
  hb_advanced_h: ["Everything the menu can do, with its details.", "Todo lo que puede hacer el menú, con sus detalles.", "Alles, was das Menü kann, mit Einzelheiten.", "Tout ce que le menu sait faire, avec ses détails.", "Tutto ciò che il menu può fare, con i dettagli.", "このメニューでできることをすべて詳しく。", "该菜单的全部功能及细节。"],
  hb_technical_h: ["The full text and what it reads from the server.", "El texto completo y lo que lee del servidor.", "Der volle Text und was es vom Server liest.", "Le texte complet et ce qu'il lit sur le serveur.", "Il testo completo e ciò che legge dal server.", "全文と、サーバーから読み取る内容。", "完整文字及其从服务器读取的数据。"],
  hb_prev: ["Previous page", "Página anterior", "Vorige Seite", "Page précédente", "Pagina precedente", "前のページ", "上一页"],
  hb_next: ["Next page", "Página siguiente", "Nächste Seite", "Page suivante", "Pagina successiva", "次のページ", "下一页"],
  hb_page: ["Page {0} of {1}", "Página {0} de {1}", "Seite {0} von {1}", "Page {0} sur {1}", "Pagina {0} di {1}", "{0} / {1} ページ", "第 {0} 页，共 {1} 页"],
  hb_tech_title: ["What it reads", "Qué lee", "Was es liest", "Ce qu'il lit", "Cosa legge", "読み取る内容", "读取内容"],
  hb_tech_every: ["Refreshes every", "Se refresca cada", "Aktualisiert alle", "Se rafraîchit toutes les", "Si aggiorna ogni", "更新間隔", "刷新间隔"],
  hb_tech_admin: ["Administrators only", "Solo administradores", "Nur Administratoren", "Administrateurs uniquement", "Solo amministratori", "管理者のみ", "仅管理员"],
  hb_more: ["The rest is in the Advanced level.", "El resto está en el nivel Avanzado.", "Der Rest steht in der Stufe Fortgeschritten.", "Le reste est au niveau Avancé.", "Il resto è nel livello Avanzato.", "続きは「上級」にあります。", "其余内容见“高级”。"],
};

export const helpBookCatalogues: RowCatalogues = cataloguesFromRows(ROWS);
