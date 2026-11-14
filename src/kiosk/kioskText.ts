/**
 * Interface text of the wall-panel mode (kiosk) of the console: the screen opened with ?kiosk=1 or from the installed app.
 * One row per phrase: English, Spanish, German, French, Italian, Japanese, Chinese; Portuguese (of Portugal) follows in PT.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "../catalogueRows";

const ROWS: Record<string, Row> = {
  kiosk_title: ["Wall panel", "Panel de pared", "Wandpanel", "Panneau mural", "Pannello a muro", "壁掛けパネル", "壁挂面板"],
  kiosk_armed: ["ARMED", "ARMADO", "SCHARF", "ARMÉ", "ATTIVATO", "警戒中", "已布防"],
  kiosk_disarmed: ["DISARMED", "DESARMADO", "UNSCHARF", "DÉSARMÉ", "DISATTIVATO", "解除中", "已撤防"],
  kiosk_unknown: ["NO DATA", "SIN DATOS", "KEINE DATEN", "SANS DONNÉES", "NESSUN DATO", "データなし", "无数据"],
  kiosk_arm: ["Arm", "Armar", "Scharf schalten", "Armer", "Attiva", "警戒する", "布防"],
  kiosk_disarm: ["Disarm", "Desarmar", "Unscharf schalten", "Désarmer", "Disattiva", "解除する", "撤防"],
  kiosk_alarms: ["Alarms waiting", "Alarmas pendientes", "Offene Alarme", "Alarmes en attente", "Allarmi in attesa", "対応待ちのアラーム", "待处理警报"],
  kiosk_no_alarms: ["No alarms waiting", "Sin alarmas pendientes", "Keine offenen Alarme", "Aucune alarme en attente", "Nessun allarme in attesa", "対応待ちのアラームはありません", "没有待处理警报"],
  kiosk_ack: ["Acknowledge", "Confirmar", "Bestätigen", "Acquitter", "Conferma", "確認", "确认"],
  kiosk_offline: ["Connection lost. Trying to reconnect...", "Conexión perdida. Intentando reconectar...", "Verbindung verloren. Verbindung wird neu aufgebaut ...", "Connexion perdue. Nouvelle tentative en cours...", "Connessione persa. Riconnessione in corso...", "接続が切れました。再接続を試みています...", "连接已断开，正在尝试重新连接..."],
  kiosk_failed: ["The order did not go through. Try again.", "La orden no se ha enviado. Inténtalo de nuevo.", "Der Befehl wurde nicht gesendet. Bitte erneut versuchen.", "L'ordre n'est pas parti. Réessayez.", "L'ordine non è partito. Riprova.", "指示を送信できませんでした。もう一度お試しください。", "指令未能发出，请重试。"],
  kiosk_wake: ["Touch the screen to wake it", "Toca la pantalla para despertarla", "Bildschirm berühren zum Aufwecken", "Touchez l'écran pour le réveiller", "Tocca lo schermo per riattivarlo", "画面をタッチして復帰", "触摸屏幕即可唤醒"],
  kiosk_view_only: ["This session can only look.", "Esta sesión solo puede mirar.", "Diese Sitzung darf nur ansehen.", "Cette session peut seulement regarder.", "Questa sessione può solo guardare.", "このセッションは閲覧のみ可能です。", "此会话只能查看。"],
  kiosk_signout: ["Sign out", "Cerrar sesión", "Abmelden", "Se déconnecter", "Esci", "サインアウト", "退出登录"],
};

const PT: Record<string, string> = {
  kiosk_title: "Painel de parede",
  kiosk_armed: "ARMADO",
  kiosk_disarmed: "DESARMADO",
  kiosk_unknown: "SEM DADOS",
  kiosk_arm: "Armar",
  kiosk_disarm: "Desarmar",
  kiosk_alarms: "Alarmes pendentes",
  kiosk_no_alarms: "Sem alarmes pendentes",
  kiosk_ack: "Confirmar",
  kiosk_offline: "Ligação perdida. A tentar voltar a ligar...",
  kiosk_failed: "A ordem não foi enviada. Tente novamente.",
  kiosk_wake: "Toque no ecrã para o ativar",
  kiosk_view_only: "Esta sessão só pode ver.",
  kiosk_signout: "Terminar sessão",
};

export const kioskCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
