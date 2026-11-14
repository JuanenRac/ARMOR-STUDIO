/**
 * Interface text of the two switches of the observation service (where the radar tracks fall in a picture, and the study of the pictures) and of the card that lets an administrator
 * accept or reject the areas to ignore that the service proposes (Configuration > Security).
 * One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  sec_opt_aispatial: ["Radar tracks placed in the picture", "Pistas de radar situadas en la imagen", "Radarspuren im Bild verortet", "Pistes radar situées dans l'image", "Tracce radar collocate nell'immagine", "レーダーの軌跡を映像内に配置", "雷达轨迹定位到画面中"],
  sec_opt_aispatial_help: [
    "The observation service judges where each radar track falls in a camera's picture, from the places the site design gives the radars and cameras. Off, a radar track anywhere in the area a camera covers counts for that camera. It needs the position and the heading of the radars and the cameras in the site design.",
    "El servicio de observación juzga dónde cae cada pista de radar en la imagen de una cámara, según los lugares que el diseño del sitio da a los radares y las cámaras. Apagado, cuenta para una cámara una pista de radar en cualquier punto del área que cubre. Requiere la posición y la orientación de los radares y las cámaras en el diseño del sitio.",
    "Der Beobachtungsdienst beurteilt, wo jede Radarspur im Bild einer Kamera liegt, anhand der Orte, die der Standortentwurf den Radaren und Kameras gibt. Ausgeschaltet zählt eine Radarspur an beliebiger Stelle im Bereich einer Kamera für diese Kamera. Dafür sind Position und Ausrichtung der Radare und Kameras im Standortentwurf nötig.",
    "Le service d'observation juge où tombe chaque piste radar dans l'image d'une caméra, d'après les emplacements que le plan du site donne aux radars et aux caméras. Désactivé, une piste radar n'importe où dans la zone couverte par une caméra compte pour cette caméra. Il faut la position et l'orientation des radars et des caméras dans le plan du site.",
    "Il servizio di osservazione valuta dove cade ogni traccia radar nell'immagine di una telecamera, in base ai luoghi che il progetto del sito assegna ai radar e alle telecamere. Disattivato, una traccia radar in qualsiasi punto dell'area coperta da una telecamera conta per quella telecamera. Servono posizione e orientamento di radar e telecamere nel progetto del sito.",
    "観測サービスは、サイト設計でレーダーとカメラに与えた位置をもとに、各レーダーの軌跡がカメラ映像のどこに入るかを判断します。オフの場合、カメラの範囲内のどこにあるレーダーの軌跡もそのカメラの対象になります。サイト設計にレーダーとカメラの位置と向きが必要です。",
    "观测服务根据站点设计中给雷达和摄像头设定的位置，判断每条雷达轨迹落在摄像头画面的哪个位置。关闭时，摄像头覆盖区域内任何位置的雷达轨迹都算作该摄像头的。需要站点设计中雷达和摄像头的位置与朝向。",
  ],
  sec_opt_aispatial_warn: [
    "Turning it on uses the positions of the site design to weigh the tracks. A design with wrong positions or headings can make the service ignore a person that a camera sees. Check the design first.",
    "Al activarlo se usan las posiciones del diseño del sitio para valorar las pistas. Un diseño con posiciones u orientaciones erróneas puede hacer que el servicio ignore a una persona que una cámara ve. Comprueba antes el diseño.",
    "Beim Einschalten werden die Positionen des Standortentwurfs zur Bewertung der Spuren genutzt. Ein Entwurf mit falschen Positionen oder Ausrichtungen kann dazu führen, dass der Dienst eine Person übersieht, die eine Kamera sieht. Prüfen Sie zuerst den Entwurf.",
    "En l'activant, les positions du plan du site servent à évaluer les pistes. Un plan aux positions ou orientations erronées peut faire ignorer par le service une personne que voit une caméra. Vérifiez d'abord le plan.",
    "Attivandolo, le posizioni del progetto del sito servono a valutare le tracce. Un progetto con posizioni o orientamenti errati può far ignorare al servizio una persona che una telecamera vede. Controlla prima il progetto.",
    "オンにすると、サイト設計の位置を使って軌跡を評価します。位置や向きが誤った設計では、カメラが捉えた人をサービスが無視することがあります。先に設計を確認してください。",
    "开启后，将使用站点设计中的位置来评估轨迹。位置或朝向有误的设计可能让服务忽略摄像头看到的人。请先检查设计。",
  ],
  sec_opt_ailearn: ["Study the pictures to propose areas to ignore", "Estudiar las imágenes para proponer zonas que ignorar", "Bilder auswerten, um Bereiche zum Ignorieren vorzuschlagen", "Étudier les images pour proposer des zones à ignorer", "Studiare le immagini per proporre aree da ignorare", "映像を調べて無視する領域を提案", "分析画面并建议忽略区域"],
  sec_opt_ailearn_help: [
    "While the system is disarmed, the observation service may study the pictures of the cameras and propose the parts that are always busy (a tree, a road) as areas to ignore. Nothing is applied until an administrator accepts a proposal below.",
    "Mientras el sistema está desarmado, el servicio de observación puede estudiar las imágenes de las cámaras y proponer como zonas que ignorar las partes siempre ocupadas (un árbol, una calle). No se aplica nada hasta que un administrador acepte una propuesta más abajo.",
    "Solange das System unscharf ist, darf der Beobachtungsdienst die Bilder der Kameras auswerten und die stets bewegten Teile (einen Baum, eine Straße) als zu ignorierende Bereiche vorschlagen. Es wird nichts angewendet, bis ein Administrator unten einen Vorschlag annimmt.",
    "Tant que le système est désarmé, le service d'observation peut étudier les images des caméras et proposer les parties toujours occupées (un arbre, une route) comme zones à ignorer. Rien n'est appliqué tant qu'un administrateur n'accepte pas une proposition ci-dessous.",
    "Mentre il sistema è disarmato, il servizio di osservazione può studiare le immagini delle telecamere e proporre come aree da ignorare le parti sempre in movimento (un albero, una strada). Non viene applicato nulla finché un amministratore non accetta una proposta qui sotto.",
    "システムが解除されている間、観測サービスはカメラの映像を調べ、常に動きのある部分（木や道路など）を無視する領域として提案できます。下で管理者が提案を承認するまで何も適用されません。",
    "系统撤防期间，观测服务可以分析摄像头画面，并把一直有动静的部分（树、马路）建议为忽略区域。在管理员于下方接受建议之前不会应用任何内容。",
  ],
  sec_opt_ailearn_warn: [
    "Turning it on makes the service look at the pictures of the cameras while the system is disarmed. The pictures stay in the house and nothing is stored but the proposed rectangles. Tell the people of the house.",
    "Al activarlo, el servicio mira las imágenes de las cámaras mientras el sistema está desarmado. Las imágenes no salen de casa y solo se guardan los rectángulos propuestos. Avisa a las personas de la casa.",
    "Beim Einschalten sieht sich der Dienst die Bilder der Kameras an, solange das System unscharf ist. Die Bilder bleiben im Haus und gespeichert werden nur die vorgeschlagenen Rechtecke. Informieren Sie die Hausbewohner.",
    "En l'activant, le service regarde les images des caméras tant que le système est désarmé. Les images restent dans la maison et seuls les rectangles proposés sont conservés. Prévenez les habitants.",
    "Attivandolo, il servizio guarda le immagini delle telecamere mentre il sistema è disarmato. Le immagini restano in casa e vengono conservati solo i rettangoli proposti. Avvisa chi vive in casa.",
    "オンにすると、システムが解除されている間、サービスがカメラの映像を見ます。映像は家の外に出ず、保存されるのは提案された矩形だけです。家の人に知らせてください。",
    "开启后，系统撤防期间服务会查看摄像头画面。画面不会离开家，只保存建议的矩形。请告知家人。",
  ],
  ipc_title: ["Areas to ignore proposed", "Zonas que ignorar propuestas", "Vorgeschlagene Bereiche zum Ignorieren", "Zones à ignorer proposées", "Aree da ignorare proposte", "提案された無視領域", "建议的忽略区域"],
  ipc_help: [
    "The observation service proposes the parts of a camera's picture that are always busy. Nothing is applied until an administrator accepts it: the rectangles then join the areas the camera ignores. A rejected proposal is not made again.",
    "El servicio de observación propone las partes de la imagen de una cámara que siempre están ocupadas. No se aplica nada hasta que un administrador la acepte: los rectángulos pasan entonces a las zonas que la cámara ignora. Una propuesta rechazada no se vuelve a hacer.",
    "Der Beobachtungsdienst schlägt die Teile des Kamerabilds vor, in denen stets Bewegung ist. Es wird nichts angewendet, bis ein Administrator zustimmt: Die Rechtecke kommen dann zu den Bereichen, die die Kamera ignoriert. Ein abgelehnter Vorschlag wird nicht wiederholt.",
    "Le service d'observation propose les parties de l'image d'une caméra toujours occupées. Rien n'est appliqué tant qu'un administrateur n'accepte pas : les rectangles rejoignent alors les zones que la caméra ignore. Une proposition rejetée n'est pas refaite.",
    "Il servizio di osservazione propone le parti dell'immagine di una telecamera sempre in movimento. Non viene applicato nulla finché un amministratore non accetta: i rettangoli entrano allora tra le aree che la telecamera ignora. Una proposta rifiutata non viene ripetuta.",
    "観測サービスは、カメラ映像の中で常に動きのある部分を提案します。管理者が承認するまで何も適用されず、承認すると矩形がカメラの無視領域に加わります。却下した提案は再度出されません。",
    "观测服务会建议摄像头画面中一直有动静的部分。在管理员接受之前不会应用任何内容，接受后这些矩形会加入摄像头的忽略区域。被拒绝的建议不会再次提出。",
  ],
  ipc_none: ["No proposal waits for a decision.", "Ninguna propuesta espera una decisión.", "Kein Vorschlag wartet auf eine Entscheidung.", "Aucune proposition n'attend de décision.", "Nessuna proposta attende una decisione.", "決定を待つ提案はありません。", "没有等待决定的建议。"],
  ipc_areas: ["{0} area(s)", "{0} zona(s)", "{0} Bereich(e)", "{0} zone(s)", "{0} area/e", "{0} 件の領域", "{0} 个区域"],
  ipc_accept: ["Accept", "Aceptar", "Annehmen", "Accepter", "Accetta", "承認", "接受"],
  ipc_reject: ["Reject", "Rechazar", "Ablehnen", "Rejeter", "Rifiuta", "却下", "拒绝"],
  ipc_refresh: ["Refresh", "Actualizar", "Aktualisieren", "Actualiser", "Aggiorna", "更新", "刷新"],
  ipc_accepted: ["Accepted: the camera now ignores {0} area(s).", "Aceptada: la cámara ignora ahora {0} zona(s).", "Angenommen: Die Kamera ignoriert jetzt {0} Bereich(e).", "Acceptée : la caméra ignore maintenant {0} zone(s).", "Accettata: la telecamera ora ignora {0} area/e.", "承認しました。カメラは現在 {0} 件の領域を無視します。", "已接受：摄像头现在忽略 {0} 个区域。"],
  ipc_rejected: ["Rejected: it will not be proposed again.", "Rechazada: no se volverá a proponer.", "Abgelehnt: Er wird nicht erneut vorgeschlagen.", "Rejetée : elle ne sera plus proposée.", "Rifiutata: non verrà riproposta.", "却下しました。再度提案されません。", "已拒绝：不会再次建议。"],
  ipc_err_not_found: ["No proposal waits for that camera, or the option to study the pictures is off.", "Ninguna propuesta espera para esa cámara, o la opción de estudiar las imágenes está apagada.", "Für diese Kamera wartet kein Vorschlag, oder die Option zur Bildauswertung ist aus.", "Aucune proposition n'attend pour cette caméra, ou l'option d'étude des images est désactivée.", "Nessuna proposta attende per quella telecamera, oppure l'opzione di studio delle immagini è disattivata.", "このカメラに待機中の提案はないか、映像を調べるオプションがオフです。", "该摄像头没有等待的建议，或分析画面的选项已关闭。"],
  ipc_err_status_400: ["Accepting would pass the limit of 16 areas to ignore for that camera. Remove an area first.", "Aceptar superaría el límite de 16 zonas que ignorar de esa cámara. Quita antes una zona.", "Annehmen würde die Grenze von 16 zu ignorierenden Bereichen dieser Kamera überschreiten. Entfernen Sie zuerst einen Bereich.", "Accepter dépasserait la limite de 16 zones à ignorer pour cette caméra. Supprimez d'abord une zone.", "Accettare supererebbe il limite di 16 aree da ignorare per quella telecamera. Rimuovi prima un'area.", "承認するとこのカメラの無視領域の上限16件を超えます。先に領域を1つ削除してください。", "接受会超过该摄像头 16 个忽略区域的上限。请先删除一个区域。"],
  ipc_err_generic: ["The proposals could not be read or decided.", "No se pudieron leer ni decidir las propuestas.", "Die Vorschläge konnten nicht gelesen oder entschieden werden.", "Les propositions n'ont pas pu être lues ou décidées.", "Non è stato possibile leggere o decidere le proposte.", "提案を読み取れない、または決定できませんでした。", "无法读取或决定建议。"],
};

const PT: Record<string, string> = {
  sec_opt_aispatial: "Pistas de radar situadas na imagem",
  sec_opt_aispatial_help: "O serviço de observação avalia onde cai cada pista de radar na imagem de uma câmara, segundo os locais que o projeto do sítio dá aos radares e às câmaras. Desligado, uma pista de radar em qualquer ponto da área que uma câmara cobre conta para essa câmara. Exige a posição e a orientação dos radares e das câmaras no projeto do sítio.",
  sec_opt_aispatial_warn: "Ao ligá-lo, as posições do projeto do sítio passam a servir para avaliar as pistas. Um projeto com posições ou orientações erradas pode fazer o serviço ignorar uma pessoa que uma câmara vê. Verifique primeiro o projeto.",
  sec_opt_ailearn: "Estudar as imagens para propor zonas a ignorar",
  sec_opt_ailearn_help: "Enquanto o sistema está desarmado, o serviço de observação pode estudar as imagens das câmaras e propor como zonas a ignorar as partes sempre ocupadas (uma árvore, uma estrada). Nada é aplicado até um administrador aceitar uma proposta mais abaixo.",
  sec_opt_ailearn_warn: "Ao ligá-lo, o serviço passa a olhar para as imagens das câmaras enquanto o sistema está desarmado. As imagens não saem de casa e só ficam guardados os retângulos propostos. Avise as pessoas da casa.",
  ipc_title: "Zonas a ignorar propostas",
  ipc_help: "O serviço de observação propõe as partes da imagem de uma câmara que estão sempre ocupadas. Nada é aplicado até um administrador aceitar: os retângulos passam então para as zonas que a câmara ignora. Uma proposta rejeitada não volta a ser feita.",
  ipc_none: "Nenhuma proposta aguarda decisão.",
  ipc_areas: "{0} zona(s)",
  ipc_accept: "Aceitar",
  ipc_reject: "Rejeitar",
  ipc_refresh: "Atualizar",
  ipc_accepted: "Aceite: a câmara ignora agora {0} zona(s).",
  ipc_rejected: "Rejeitada: não voltará a ser proposta.",
  ipc_err_not_found: "Nenhuma proposta aguarda para essa câmara, ou a opção de estudar as imagens está desligada.",
  ipc_err_status_400: "Aceitar ultrapassaria o limite de 16 zonas a ignorar dessa câmara. Remova primeiro uma zona.",
  ipc_err_generic: "Não foi possível ler nem decidir as propostas.",
};

export const ignoreProposalsCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
