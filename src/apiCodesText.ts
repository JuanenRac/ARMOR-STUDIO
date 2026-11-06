/**
 * The words for every refusal code of the server (ApiErrorCode), one row per phrase in seven languages; the eighth, Portuguese, is PT below. A screen that has no text of its own for a code
 * says this one (see apiErrorText.ts) instead of its generic phrase.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
import { cataloguesFromRows, type Row, type RowCatalogues } from "./catalogueRows";

const ROWS: Record<string, Row> = {
  api_code_invalid_request: ["The server did not accept the request: check the values and try again.", "El servidor no ha aceptado la petición: revisa los valores y vuelve a intentarlo.", "Der Server hat die Anfrage nicht angenommen: Werte prüfen und erneut versuchen.", "Le serveur n'a pas accepté la requête : vérifiez les valeurs puis réessayez.", "Il server non ha accettato la richiesta: controlla i valori e riprova.", "サーバーがリクエストを受け付けませんでした。値を確認してもう一度お試しください。", "服务器未接受该请求：请检查数值后重试。"],
  api_code_not_found: ["The server does not have what was asked for.", "El servidor no tiene lo que se ha pedido.", "Der Server hat das Angeforderte nicht.", "Le serveur n'a pas ce qui a été demandé.", "Il server non ha ciò che è stato richiesto.", "要求されたものがサーバーにありません。", "服务器上没有所请求的内容。"],
  api_code_conflict: ["That clashes with something that already exists or changed in the meantime: reload and try again.", "Choca con algo que ya existe o que ha cambiado entretanto: recarga y vuelve a intentarlo.", "Das kollidiert mit etwas, das schon besteht oder sich inzwischen geändert hat: neu laden und erneut versuchen.", "Cela entre en conflit avec quelque chose qui existe déjà ou qui a changé entre-temps : rechargez puis réessayez.", "Va in conflitto con qualcosa che esiste già o che nel frattempo è cambiato: ricarica e riprova.", "既存のものと、または途中で変更されたものと競合しています。再読み込みしてもう一度お試しください。", "与已有内容冲突，或内容在此期间已更改：请刷新后重试。"],
  api_code_rate_limited: ["Too many tries in a short time: wait a little and try again.", "Demasiados intentos en poco tiempo: espera un poco y vuelve a intentarlo.", "Zu viele Versuche in kurzer Zeit: bitte kurz warten und erneut versuchen.", "Trop d'essais en peu de temps : patientez un peu puis réessayez.", "Troppi tentativi in poco tempo: attendi un po' e riprova.", "短時間に試行しすぎました。少し待ってからもう一度お試しください。", "短时间内尝试次数过多：请稍等片刻后重试。"],
  api_code_forbidden: ["This account is not allowed to do that.", "Esta cuenta no tiene permiso para hacer eso.", "Dieses Konto darf das nicht tun.", "Ce compte n'a pas le droit de faire cela.", "Questo account non ha il permesso di farlo.", "このアカウントにはその操作の権限がありません。", "此账户无权执行该操作。"],
  api_code_unauthorized: ["Your session has ended: sign in again.", "Tu sesión ha terminado: inicia sesión de nuevo.", "Ihre Sitzung ist abgelaufen: bitte erneut anmelden.", "Votre session est terminée : reconnectez-vous.", "La tua sessione è terminata: accedi di nuovo.", "セッションが終了しました。もう一度サインインしてください。", "您的会话已结束：请重新登录。"],
  api_code_out_of_scope: ["That is outside what this session may reach.", "Eso queda fuera de lo que esta sesión puede alcanzar.", "Das liegt außerhalb dessen, was diese Sitzung erreichen darf.", "Cela dépasse ce que cette session peut atteindre.", "Questo è fuori da ciò che questa sessione può raggiungere.", "これはこのセッションで扱える範囲外です。", "这超出了此会话可访问的范围。"],
  api_code_remote_policy: ["This is only possible from the house or over the VPN.", "Esto solo se puede hacer desde casa o con la VPN.", "Das ist nur von zu Hause oder über das VPN möglich.", "Cela n'est possible que depuis la maison ou par le VPN.", "Questo è possibile solo da casa o tramite la VPN.", "これは自宅内または VPN 経由でのみ可能です。", "此操作只能在家中或通过 VPN 进行。"],
  api_code_wrong_password: ["The password is not right.", "La contraseña no es correcta.", "Das Passwort ist falsch.", "Le mot de passe n'est pas correct.", "La password non è corretta.", "パスワードが正しくありません。", "密码不正确。"],
  api_code_totp_locked: ["Too many wrong codes: wait a little and try again.", "Demasiados códigos erróneos: espera un poco y vuelve a intentarlo.", "Zu viele falsche Codes: bitte kurz warten und erneut versuchen.", "Trop de codes erronés : patientez un peu puis réessayez.", "Troppi codici errati: attendi un po' e riprova.", "誤ったコードが多すぎます。少し待ってからもう一度お試しください。", "错误代码次数过多：请稍等片刻后重试。"],
  api_code_totp_setup_required: ["This account must set up the second factor before signing in.", "Esta cuenta debe configurar el segundo factor antes de entrar.", "Dieses Konto muss den zweiten Faktor einrichten, bevor es sich anmelden kann.", "Ce compte doit configurer le second facteur avant de se connecter.", "Questo account deve configurare il secondo fattore prima di accedere.", "このアカウントはサインイン前に第 2 要素を設定する必要があります。", "此账户必须先设置第二重验证才能登录。"],
  api_code_elevation_required: ["It needs your password or code again, and it was not given.", "Hace falta tu contraseña o código de nuevo y no se dio.", "Passwort oder Code werden erneut benötigt und wurden nicht angegeben.", "Il faut votre mot de passe ou votre code à nouveau, et il n'a pas été donné.", "Servono di nuovo la password o il codice e non sono stati forniti.", "パスワードまたはコードの再入力が必要ですが、入力されませんでした。", "需要再次输入密码或验证码，但未提供。"],
  api_code_admin_required: ["Only an administrator can do that.", "Eso solo lo puede hacer un administrador.", "Das kann nur ein Administrator tun.", "Seul un administrateur peut faire cela.", "Solo un amministratore può farlo.", "これは管理者のみが実行できます。", "只有管理员可以执行该操作。"],
  api_code_bad_code: ["That code is not right.", "Ese código no es correcto.", "Dieser Code stimmt nicht.", "Ce code n'est pas correct.", "Quel codice non è corretto.", "そのコードは正しくありません。", "该验证码不正确。"],
  api_code_bad_proof: ["The proof of identity is not right: type the password or the code again.", "La prueba de identidad no es correcta: escribe de nuevo la contraseña o el código.", "Der Identitätsnachweis stimmt nicht: Passwort oder Code erneut eingeben.", "La preuve d'identité n'est pas correcte : saisissez à nouveau le mot de passe ou le code.", "La prova d'identità non è corretta: digita di nuovo la password o il codice.", "本人確認が正しくありません。パスワードまたはコードをもう一度入力してください。", "身份验证不正确：请重新输入密码或验证码。"],
  api_code_wrong_pin: ["The PIN is not right.", "El PIN no es correcto.", "Die PIN ist falsch.", "Le PIN n'est pas correct.", "Il PIN non è corretto.", "PIN が正しくありません。", "PIN 不正确。"],
  api_code_pin_locked: ["Too many wrong PINs: wait a while before trying again.", "Demasiados PIN erróneos: espera un poco antes de volver a intentarlo.", "Zu viele falsche PINs: bitte eine Weile warten.", "Trop de PIN erronés : patientez un moment avant de réessayer.", "Troppi PIN errati: attendi un po' prima di riprovare.", "誤った PIN が多すぎます。しばらく待ってからもう一度お試しください。", "错误 PIN 次数过多：请稍等一会儿再试。"],
  api_code_pin_not_set: ["This user has no PIN: an administrator sets it in Configuration > Users.", "Este usuario no tiene PIN: lo pone un administrador en Configuración > Usuarios.", "Dieser Benutzer hat keine PIN: ein Administrator legt sie unter Konfiguration > Benutzer fest.", "Cet utilisateur n'a pas de PIN : un administrateur le définit dans Configuration > Utilisateurs.", "Questo utente non ha un PIN: lo imposta un amministratore in Configurazione > Utenti.", "このユーザーには PIN がありません。管理者が「設定 > ユーザー」で設定します。", "该用户没有 PIN：由管理员在“配置 > 用户”中设置。"],
  api_code_pin_required: ["This action needs the PIN of the person.", "Esta acción necesita el PIN de la persona.", "Diese Aktion benötigt die PIN der Person.", "Cette action nécessite le PIN de la personne.", "Questa azione richiede il PIN della persona.", "この操作には本人の PIN が必要です。", "此操作需要该用户的 PIN。"],
  api_code_confirmation_required: ["This action must be confirmed first.", "Esta acción hay que confirmarla antes.", "Diese Aktion muss zuerst bestätigt werden.", "Cette action doit d'abord être confirmée.", "Questa azione va prima confermata.", "この操作は先に確認が必要です。", "此操作须先确认。"],
  api_code_node_offline: ["The node does not answer.", "El nodo no responde.", "Der Knoten antwortet nicht.", "Le nœud ne répond pas.", "Il nodo non risponde.", "ノードが応答しません。", "节点没有响应。"],
  api_code_unknown_node: ["The server does not know that node.", "El servidor no conoce ese nodo.", "Der Server kennt diesen Knoten nicht.", "Le serveur ne connaît pas ce nœud.", "Il server non conosce quel nodo.", "サーバーはそのノードを知りません。", "服务器不认识该节点。"],
  api_code_unknown_operation: ["That operation does not exist.", "Esa operación no existe.", "Diese Operation gibt es nicht.", "Cette opération n'existe pas.", "Quell'operazione non esiste.", "その操作は存在しません。", "没有这个操作。"],
  api_code_no_image_for_board: ["The newest release has no image for the board of this node.", "La última versión no trae imagen para la placa de este nodo.", "An der neuesten Version hängt kein Image für die Platine dieses Knotens.", "La dernière version n'a pas d'image pour la carte de ce nœud.", "L'ultima versione non ha un'immagine per la scheda di questo nodo.", "最新リリースにはこのノードのボード用イメージがありません。", "最新版本没有适用于该节点开发板的镜像。"],
  api_code_no_image_in_release: ["That release carries no firmware image.", "Esa versión no trae ninguna imagen de firmware.", "Diese Version enthält kein Firmware-Image.", "Cette version ne contient aucune image de firmware.", "Quella versione non contiene alcuna immagine firmware.", "そのリリースにはファームウェアイメージが含まれていません。", "该版本不包含固件镜像。"],
  api_code_wrong_board: ["This image is built for another board than the node's: it was not sent.", "Esta imagen está hecha para otra placa distinta de la del nodo: no se ha enviado.", "Dieses Image ist für eine andere Platine als die des Knotens gebaut: es wurde nicht gesendet.", "Cette image est conçue pour une autre carte que celle du nœud : elle n'a pas été envoyée.", "Questa immagine è fatta per una scheda diversa da quella del nodo: non è stata inviata.", "このイメージはノードとは別のボード用です。送信されませんでした。", "该镜像是为与节点不同的开发板构建的：未发送。"],
  api_code_wrong_node_kind: ["That node is of another kind than this action needs.", "Ese nodo es de otro tipo del que necesita esta acción.", "Dieser Knoten ist von einer anderen Art, als diese Aktion braucht.", "Ce nœud est d'un autre type que celui que cette action exige.", "Quel nodo è di un tipo diverso da quello richiesto da questa azione.", "このノードは、この操作に必要な種類のノードではありません。", "该节点的类型与此操作所需的不同。"],
};

const PT: Record<string, string> = {
  api_code_invalid_request: "O servidor não aceitou o pedido: verifique os valores e tente de novo.",
  api_code_not_found: "O servidor não tem o que foi pedido.",
  api_code_conflict: "Choca com algo que já existe ou que entretanto mudou: recarregue e tente de novo.",
  api_code_rate_limited: "Demasiadas tentativas em pouco tempo: aguarde um pouco e tente de novo.",
  api_code_forbidden: "Esta conta não tem permissão para fazer isso.",
  api_code_unauthorized: "A sua sessão terminou: inicie sessão de novo.",
  api_code_out_of_scope: "Isso fica fora do que esta sessão pode alcançar.",
  api_code_remote_policy: "Isto só é possível de casa ou pela VPN.",
  api_code_wrong_password: "A palavra-passe não está certa.",
  api_code_totp_locked: "Demasiados códigos errados: aguarde um pouco e tente de novo.",
  api_code_totp_setup_required: "Esta conta tem de configurar o segundo fator antes de entrar.",
  api_code_elevation_required: "É preciso a sua palavra-passe ou código de novo e não foi indicado.",
  api_code_admin_required: "Isso só o pode fazer um administrador.",
  api_code_bad_code: "Esse código não está certo.",
  api_code_bad_proof: "A prova de identidade não está certa: escreva de novo a palavra-passe ou o código.",
  api_code_wrong_pin: "O PIN não está certo.",
  api_code_pin_locked: "Demasiados PIN errados: aguarde um pouco antes de tentar de novo.",
  api_code_pin_not_set: "Este utilizador não tem PIN: um administrador define-o em Configuração > Utilizadores.",
  api_code_pin_required: "Esta ação precisa do PIN da pessoa.",
  api_code_confirmation_required: "Esta ação tem de ser confirmada primeiro.",
  api_code_node_offline: "O nó não responde.",
  api_code_unknown_node: "O servidor não conhece esse nó.",
  api_code_unknown_operation: "Essa operação não existe.",
  api_code_no_image_for_board: "A versão mais recente não tem imagem para a placa deste nó.",
  api_code_no_image_in_release: "Essa versão não traz nenhuma imagem de firmware.",
  api_code_wrong_board: "Esta imagem é feita para outra placa que não a do nó: não foi enviada.",
  api_code_wrong_node_kind: "Esse nó é de outro tipo que não o que esta ação precisa.",
};

export const apiCodesCatalogues: RowCatalogues = { ...cataloguesFromRows(ROWS), pt: PT };
