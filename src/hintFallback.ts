/**
 * The hint of a control that has none in the catalogue: what kind of thing it is (a tool of a designer, a tab, a filter, a field, a switch…) and what it is called, said in the language of
 * the interface. A control with its own row in the catalogue (hintText.ts) or its own title keeps that; this only fills the gaps, so no control is left without saying what it is and what
 * it does, whatever is added to Studio next.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import type { Locale } from "./i18n";

export type FallbackKind = "tool" | "tile" | "tab" | "filter" | "grid" | "floor" | "group" | "choose" | "switch" | "slide" | "type" | "button";

const TEMPLATES: Record<FallbackKind, Record<Locale, string>> = {
  tool: { en: "Tool «{x}»: pick it, then click on the plan to use it.", es: "Herramienta «{x}»: elígela y haz clic en el plano para usarla.", de: "Werkzeug «{x}»: auswählen, dann in den Plan klicken.", fr: "Outil « {x} » : choisissez-le, puis cliquez sur le plan.", it: "Strumento «{x}»: sceglilo e fai clic sulla planimetria.", ja: "ツール「{x}」：選んでから図面をクリックして使います。", zh: "工具“{x}”：先选中，再在平面图上点击使用。", pt: "Ferramenta «{x}»: escolha-a e clique na planta para a usar." },
  tile: { en: "Opens the «{x}» menu.", es: "Abre el menú «{x}».", de: "Öffnet das Menü «{x}».", fr: "Ouvre le menu « {x} ».", it: "Apre il menu «{x}».", ja: "メニュー「{x}」を開きます。", zh: "打开“{x}”菜单。", pt: "Abre o menu «{x}»." },
  tab: { en: "Switches to «{x}».", es: "Cambia a «{x}».", de: "Wechselt zu «{x}».", fr: "Passe à « {x} ».", it: "Passa a «{x}».", ja: "「{x}」に切り替えます。", zh: "切换到“{x}”。", pt: "Muda para «{x}»." },
  filter: { en: "Shows only «{x}» in the list.", es: "Muestra solo «{x}» en la lista.", de: "Zeigt in der Liste nur «{x}».", fr: "N'affiche que « {x} » dans la liste.", it: "Mostra solo «{x}» nell'elenco.", ja: "一覧に「{x}」だけを表示します。", zh: "列表中只显示“{x}”。", pt: "Mostra só «{x}» na lista." },
  grid: { en: "Shows the cameras in a grid of «{x}».", es: "Muestra las cámaras en una cuadrícula de «{x}».", de: "Zeigt die Kameras in einem Raster mit «{x}».", fr: "Affiche les caméras dans une grille de « {x} ».", it: "Mostra le telecamere in una griglia di «{x}».", ja: "カメラを「{x}」のグリッドで表示します。", zh: "以“{x}”的网格显示摄像头。", pt: "Mostra as câmaras numa grelha de «{x}»." },
  floor: { en: "Shows the floor «{x}» of the plan.", es: "Muestra la planta «{x}» del plano.", de: "Zeigt die Etage «{x}» des Plans.", fr: "Affiche l'étage « {x} » du plan.", it: "Mostra il piano «{x}» della planimetria.", ja: "図面の階「{x}」を表示します。", zh: "显示平面图的“{x}”楼层。", pt: "Mostra o piso «{x}» da planta." },
  group: { en: "Shows or hides the group «{x}».", es: "Muestra u oculta el grupo «{x}».", de: "Blendet die Gruppe «{x}» ein oder aus.", fr: "Affiche ou masque le groupe « {x} ».", it: "Mostra o nasconde il gruppo «{x}».", ja: "グループ「{x}」を表示または非表示にします。", zh: "显示或隐藏“{x}”组。", pt: "Mostra ou oculta o grupo «{x}»." },
  choose: { en: "Choose «{x}».", es: "Elige «{x}».", de: "«{x}» auswählen.", fr: "Choisissez « {x} ».", it: "Scegli «{x}».", ja: "「{x}」を選びます。", zh: "选择“{x}”。", pt: "Escolha «{x}»." },
  switch: { en: "Turns «{x}» on or off.", es: "Activa o desactiva «{x}».", de: "Schaltet «{x}» ein oder aus.", fr: "Active ou désactive « {x} ».", it: "Attiva o disattiva «{x}».", ja: "「{x}」をオン・オフします。", zh: "开启或关闭“{x}”。", pt: "Ativa ou desativa «{x}»." },
  slide: { en: "Slide to change «{x}».", es: "Desliza para cambiar «{x}».", de: "Schieben, um «{x}» zu ändern.", fr: "Faites glisser pour changer « {x} ».", it: "Trascina per cambiare «{x}».", ja: "スライドして「{x}」を変更します。", zh: "拖动以更改“{x}”。", pt: "Deslize para mudar «{x}»." },
  type: { en: "Type or change «{x}».", es: "Escribe o cambia «{x}».", de: "«{x}» eingeben oder ändern.", fr: "Saisissez ou changez « {x} ».", it: "Scrivi o cambia «{x}».", ja: "「{x}」を入力または変更します。", zh: "输入或修改“{x}”。", pt: "Escreva ou mude «{x}»." },
  button: { en: "Press to use «{x}».", es: "Pulsa para usar «{x}».", de: "Drücken, um «{x}» zu nutzen.", fr: "Appuyez pour utiliser « {x} ».", it: "Premi per usare «{x}».", ja: "押すと「{x}」を実行します。", zh: "点击使用“{x}”。", pt: "Prima para usar «{x}»." },
};

/** What kind of control this is, from its tag and from the group it sits in. */
export function fallbackKind(element: Element): FallbackKind {
  const tag = element.tagName.toLowerCase();
  if (element.classList.contains("tb-tool")) return "tool";
  if (element.closest(".ov-tile")) return "tile";
  if (element.closest(".grid-picker")) return "grid";
  if (element.closest(".media-filters, .devices-filters, .svc-chips, .history-filters")) return "filter";
  if (element.closest(".plan-floors")) return "floor";
  if (element.closest(".view-tabs, .ed-tabs, .inspector-tabs, .designer-view-toggle, .config-tabs, [role=tablist]") || element.getAttribute("role") === "tab") return "tab";
  if (tag === "summary") return "group";
  if (tag === "select") return "choose";
  if (tag === "textarea") return "type";
  if (tag === "input") {
    const type = (element as HTMLInputElement).type;
    if (type === "checkbox" || type === "radio") return "switch";
    if (type === "range") return "slide";
    return "type";
  }
  return "button";
}

/** The name of a control: its aria-label, the words of the label it sits in (without the options of a select), a placeholder, or its own text, short. Empty when there is none. */
export function fallbackLabel(element: Element, kind: FallbackKind = fallbackKind(element)): string {
  const clean = (value: string | null | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();
  const aria = clean(element.getAttribute("aria-label"));
  if (aria) return aria.slice(0, 60);
  if (kind === "tile") return clean(element.querySelector(".ov-tile-label")?.textContent).slice(0, 60);
  const label = element.closest("label");
  if (label && label !== element) {
    const copy = label.cloneNode(true) as Element;
    copy.querySelectorAll("select, input, textarea, option, button").forEach(node => node.remove());
    const own = clean(copy.textContent);
    if (own) return own.slice(0, 60);
  }
  const placeholder = clean(element.getAttribute("placeholder"));
  if (placeholder && kind === "type") return placeholder.slice(0, 60);
  if (element.tagName === "SELECT" || element.tagName === "INPUT" || element.tagName === "TEXTAREA") return "";
  return firstWords(element).replace(/^[^\p{L}\p{N}]+/u, "").slice(0, 60);
}

/** The first piece of text of a control, not all of it: a card-like button holds a name, a state and a counter, and glued together they read as one nonsense word. */
function firstWords(element: Element): string {
  const clean = (value: string | null | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();
  const walker = element.ownerDocument.createTreeWalker(element, 4 /* NodeFilter.SHOW_TEXT */);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = clean(node.textContent);
    if (/\p{L}/u.test(text)) return text;
  }
  return clean(element.textContent);
}

/** The sentence of a hint. Empty when there is nothing to name. */
export function fallbackHint(kind: FallbackKind, label: string, locale: Locale): string {
  if (!label) return "";
  return TEMPLATES[kind][locale].replace("{x}", label);
}
