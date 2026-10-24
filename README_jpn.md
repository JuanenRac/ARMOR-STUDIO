<p align="center">
  <img src="images/ARMOR_BANNER.svg" alt="ARMOR-STUDIO banner" width="100%">
</p>

# 🎛️ ARMOR-STUDIO

<p align="center">
  <a href="README.md">🇺🇸 English</a> |
  <a href="README_spa.md">🇪🇸 Español</a> |
  <a href="README_fra.md">🇫🇷 Français</a> |
  <a href="README_ita.md">🇮🇹 Italiano</a> |
  <a href="README_deu.md">🇩🇪 Deutsch</a> |
  <a href="README_zho.md">🇨🇳 简体中文</a> |
  🇯🇵 <b>日本語</b> |
  <a href="README_por.md">🇵🇹 Português</a>
</p>

### 運用・設計コンソール：カメラ、レーダー、警報、エネルギー、ローカルネットワーク、証拠、サイト図、設備の保守

<p align="center">
  <img src="https://img.shields.io/badge/License-GPL%203.0-blue.svg" alt="GPL 3.0">
  <img src="https://img.shields.io/badge/Language-TypeScript-3178c6.svg" alt="Language">
  <img src="https://img.shields.io/badge/UI-React%2019-61dafb.svg" alt="UI">
  <img src="https://img.shields.io/badge/Languages-8-00E5FF.svg" alt="Languages">
  <img src="https://img.shields.io/badge/Tests-961%20passing-2ea44f.svg" alt="Tests">
  <img src="https://img.shields.io/badge/Version-0.8.0.9-0f6cbd.svg" alt="Version">
  <img src="https://img.shields.io/badge/Maturity-established-2EA44F.svg" alt="Maturity">
</p>

---

**正直さのチェック - 今日動いているもの:** Studio は [ARMOR-SERVER](https://github.com/JuanenRac/ARMOR-SERVER) と通信し、961 件のユニットテスト（設定の解析、カメラの統合、ソーラーグラフの計算、設計ツールの幾何と検査、警報アナウンサー、アシスタントの辞書、8 言語での全メニューの描画、静的ホスト）とブラウザテストでカバーされています。CM5 テストベンチで、実際のサーバー、実際の IP カメラ、基板上のレーダーノードと組み合わせて日常的に動作しており、ヘルプの画像は例示データで作られています。**まだ**証明されていないもの：あらゆるカメラでのライブ映像と PTZ、実機でのソーラー・電気・警報盤・タッチパネルのメニュー（存在するのはレーダーノードのみ）、正式なアクセシビリティ・ユーザビリティ評価。サーバーに接続できない間、Studio はデモデータを表示し、上部バーでそれを示します。

---

## 📋 ひと目で

| | |
|---|---|
| バージョン | `0.8.0.9` |
| 成熟度 | 確立 |
| テスト | 961 (`npm test`) |
| 技術 | React 19 / TypeScript / Vite |
| 実機での確認 | CM5 テストベンチ（実サーバー、実際の IP カメラ、実際のレーダーノード）で毎日使用。ソーラー・電気・警報盤・タッチパネルのメニューは実ノードを待っています |

## 🚦 プロジェクトの状況

各行はこのリポジトリの一部分で、信号は今日どこまで進んでいるかを示します。計画ではなく、リポジトリが示せるもの（テスト、ビルド、実行）に基づいて書かれています。

🟢 完了・検証済み · 🟡 動作する（既知の制限あり） · 🟠 一部のみ、または未検証 · 🔴 未実装または動作しない

| 領域 | 状態 | ここでの意味 |
|---|---|---|
| ソフトウェア | 🟢 | コンソールは CM5 テストベンチの実際のサーバーに対して毎日使われています。 |
| テスト | 🟢 | 961 件のユニットテストが通り（`npm test`）、ブラウザーテストも実行されます：設定、カメラの統合、太陽光のグラフ、デザイナーの図形と検査、警報アナウンス、アシスタントの辞書、8 言語すべてのメニュー。 |
| インターフェース | 🟡 | ライブ映像と PTZ はすべてのカメラで確認したわけではなく、アクセシビリティやユーザビリティの正式なレビューもありません。ヘルプの画像はサンプルデータで作っています。 |
| ハードウェア | 🟡 | 実際のサーバー、実際の IP カメラ、実際のレーダーノードとともに毎日使っています。太陽光・電気・警報パネル・タッチパネルのメニューは、実機のノードを待っています。 |
| セキュリティ | 🟡 | セッション、ロール、アドレスにカメラのログイン情報を含めることの拒否はテストでカバーされています。独立したレビューはありません。 |
| 連携 | 🟡 | サーバーに接続できない間は、Studio はデモデータを表示し、上部のバーでそのことを知らせます。 |
| ドキュメント | 🟢 | 8 言語、アプリ内ヘルプとガイドツアー、セキュリティ注記、変更履歴は最新です。 |

## 🎯 概要

**ARMOR-STUDIO** はオペレーターのコンソールです。カメラのパスワード、RTSP アドレス、トークンを決して持ちません。ユーザー名とパスワードでサーバーにサインインし、8 時間の **HttpOnly** セッションを受け取り、権限の要る操作はすべてそのセッションを通ります。

* **概要とシステム：**境界の状態、各部分のタイル（警報盤、レーダー、カメラ、デバイス、エネルギー、ネットワーク、サーバー）、すべてのデバイスと警報を載せた設計のライブマップ、注意が必要なもの。すべてスクロールなしの 1 画面で、管理者にはシステムページと監査記録があります。
* **カメラモニター：**枠に収まる 1、2、4、6、8、9、12、16 タイル（16:9、マトリクス全体が見え、切り取りなし）、範囲を限った PTZ パッド付きの拡大表示、スナップショットと MP4 録画。**録画ライブラリ**で証拠のフィルター、プレビュー、再生、保護、削除、**保管証明**のダウンロードができます。
* **警報：**今すぐ人が必要なものを、確認と終了記録とともに表示。**警戒前のチェック**と解除用 PIN、ライブマップ上の警報、重大度ごとの音、独自のスタイル（標準、アクションヒーロー、闇の支配者、劇的）を持つ音声読み上げ（何かが接続されたことも伝えます）、ポップアップ、ヘルプの隣のミュートボタン、適切なメニューへの任意のジャンプ。
* **デバイスとオートメーション：**煙、ガス、浸水、ドア、窓、動き、気候、プラグ、照明、サイレン、鍵、シャッター、門扉、ガレージドア、給湯器を Wi-Fi、Zigbee、Bluetooth、有線で（Zigbee2MQTT、Tasmota、Shelly のプリセット付き）。あらゆる警報源（しきい値も可）から、何かが起きたときにデバイスを切り替えるルール、大きな警戒 / 解除ボタン。
* **警報盤と警報デザイナー：**各 ARMOR-NODE-ALARM ノードの状態、ゾーンとイベント、ゾーンに結び付けた Zigbee センサー、そして家の警報（警報盤、接点、動き、煙・ガス・浸水検知器、サイレン、キーパッド、配線、無線リンク）を描き、描いた各要素を実際のゾーンに結び付けるデザイナー。
* **ソーラーと電気のエネルギー：***インバーター*メニューは家をゲージ、数値、履歴グラフ付きのアニメーションするエネルギーフローとして描き、*バッテリー*は各スタックの容量、各モジュール、すべてのセルを表示し、*電気*は系統入力、各チャンネル、メーターの警報を表示します。どちらも機器（Voltronic、MPP Solar、Pylontech、ANT-BMS など）を登録でき、*例示の測定値を表示*ボタンで先にメニューを試せます。
* **電気デザイナー：**家の電気図（系統、メーター、保護、切替器、配電、PV、インバーター、バッテリー、負荷、AC と DC）を描き、サーバーが読むソーラー機器に結び付けてライブ値を見て、検査に見直させます（1 本の線に 2 つの電源、電流に対するブレーカーとケーブルなど）。
* **レーダー：**サイト設計から描いたライブマップに、各レーダーが報告する対象、その最近の経路、**無視する映像ゾーン**を表示。ノードのライブ状態（無応答は*古い*と表示）、各ノード自身のパネルへ 1 クリック。
* **サイトデザイナー：**地形、複数階の建物（5 種類の屋根）、ドア、窓、街灯、煙突、ソーラーパネル、マスト、道路や小道を描き、カメラとレーダーを好きな場所に配置。CAD 風の 2D 図面と、階ごとに回転できる 3D 表示、元に戻す・やり直し、設計のバージョン。
* **ローカルネットワーク：***ネットワーク*メニューは ARMOR-NETWORK ノードの報告（デバイス、停止、インターネットの状態、プロバイダーと場所付きの**公開アドレス**）を表示し、デバイスの命名、非表示、監視、スキャン・ping・あなたが渡したログインでの検査の指示ができ、*ネットワークデザイナー*がそれを描きます。
* **自動撮影：***設定 > 自動撮影*で、システムが警戒中にカメラが何かを捉えると写真と動画を自動で撮影（枚数、間隔、クリップの長さ）し、無視する映像ゾーンをカメラのフレーム上に描きます。
* **ノードファームウェアとアップデート：***ノードファームウェア*はフィールドノードを 1 台ずつ更新し、全体と各ノードにバーを表示し、警報で別メニューに移っても状態を保ちます。*アップデート*は GitHub から Studio とサーバーの新バージョン（新バージョンの更新内容も表示）、OS の更新、任意の保守コンソールをインストールします。
* **グループ化された設定：**一般と設定項目、ユーザー・通知・自動撮影、ノードファームウェアとアップデート、サーバー・サービス・MQTT ブローカー・設定ファイル・インストール・コンソール。サイドバーの各メニューも折りたたみ可能なグループ（監視、セキュリティ、エネルギー、家とネットワーク、設計、管理）に分かれています。
* **8 言語**（英語、スペイン語、ドイツ語、フランス語、イタリア語、日本語、中国語、ポルトガル語）と 11 のテーマ（既定は *Armor*）。言語、テーマ、天気の場所はブラウザではなくアカウントに従います。ロール：管理者、オペレーター、閲覧だけの **viewer**。
* **システム全体を知っているヘルプ：**4 段階の詳しさを持つ本と各主要メニューの例示データ付き画像、メニューごとのステップガイドツアー（ボタン1つ1つの働き、期待できる結果、よくある間違いまで説明し、専用のマスコットと音声付き）、現場ノードを詳しく説明するヘルプ（セットアップ用Wi-Fi、アクセスポイントとステーション、Bluetooth PIN、ロールバック付きファームウェアスロット、署名付き更新、外部からのパネル）、あらゆるもののヒント、そして**アシスタント**（どこへでもドラッグでき、好きな場所に固定でき、文字で質問できるマスコット）。8 言語の辞書と、空きのある側に開く吹き出し付き。作業中のメニューは、別のメニューを見ている間も開いたままです。
* **ファイルではなく選択肢で設定する外部アクセス：**セキュリティで管理者が WireGuard VPN を設定し、QR コードでスマホを追加し、家に付いてくる名前（DuckDNS、Cloudflare、または呼び出せる任意のアドレス）を維持し、サーバー経由で外から開けるノードを登録します（信頼する前に証明書のフィンガープリントを比較）。各ステップは 8 言語で説明され、外からの操作ではパスワードを再度求めます。**外から家に届く方法を一歩ずつ：** 設定 > セキュリティの6ステップのガイドが、マシンが対応しているか、VPNがあるか、家に名前があるか、ルーターでポートが開いているか、スマホが追加済みかを示し、モバイルデータでの試し方を説明します。セキュリティタブは見出し付きの3つのセクションに整理されています。
* **ブローカー暗号化カード:** 設定 > ブローカー に、サーバーとブローカーの接続が暗号化されているかと、信頼している設備独自の認証局のフィンガープリントが表示されます。接続が暗号化なしの場合は、それが初期状態なので警告は表示されません。
* **ノードの状態と警戒モード:** 「システム」には各ノードの状態報告（稼働時間、再起動の理由、メモリ、回線と信号、ブローカー接続、最後のエラー、履歴と再起動）のカードがあり、「警報盤」にはモード選択（外出、在宅、夜間、独自）とモードの編集があります。すべて 8 言語で、ヘルプ、ツアーの手順、アシスタントの回答付きです。
* **パスワードマネージャー対応のサインインとタブ付きの履歴:** サインインは本物のフォームで、ブラウザーや OS のパスワードマネージャーが保存・入力できます。任意の「ユーザー名を記憶」はユーザー名だけを保存し（パスワードは決して保存しません）、その旨の注記があります。履歴には「すべて」「アラーム」「接続」「デバイス」「システム」「設定」のタブがあり、サーバーに接続するすべてのデバイスとアプリの一覧（最終確認、開いているセッション、サインインと拒否）と、ノード・ブローカー・サービス・更新・警戒操作のイベントが見られます。アドレスは管理者にだけ表示されます。
* **バッテリーのメンテナンス（設定、管理者向け）：** 4段階のウィザード——バッテリーと操作、値、バッテリーのシリアル番号を入力して確認、結果——で、Pylontechバッテリーが保持する内容を変更します。制限値は電圧・温度で入力しグループ単位で送信、ファームウェアファイルは送信前に読み取り、前後のバッテリー状態を差分と記録とともに表示し、出力は元に戻せます。
* **ノードの健全性カードからの制御：** 各ノードにメニュー（再起動、一時停止または再開、スタンバイ（動作停止、接続は維持）または電源オン、識別、診断、メンテナンスのオン／オフ）があり、カードにはグループ操作として、すべて再起動（同時、または警報パネルを最後にして順番に）、すべて一時停止、すべてスタンバイ、すべて再開があります。ノード名（全ノードの場合は RESTART、PAUSE、STANDBY のいずれかの単語）を再入力し、新たな本人確認も求められます。チップが各ノード（送信済み、受領、オフライン、復帰、適用）を追い、一時停止中、いつから誰によるスタンバイか、メンテナンスを表示し、警報パネルやレーダーが一時停止またはスタンバイのとき家が無防備になることを警告が知らせます。工場出荷時リセット、消去、ディープスリープはありません。
* **ライブ状態：** Studio はサーバーのライブチャネル（WebSocket）を受け取り、アラーム・警戒・ノードの復帰を即座に表示します。チャネルが開いている間は保険として20秒ごとにだけ状態を問い合わせ、下部バーに「ライブ」と表示します。アラーム・電気・ネットワークの各デザイナーは、既存のキーに加えて F（全体表示）、プラス／マイナス（ズーム）、Ctrl+D（複製）にも反応します。

## 🖼️ スクリーンショット

テストベンチで 1920×1080 で撮影。サンプルデータを使用しており、実際の設備は接続されていません。

<table>
<tr><td width="50%" valign="top"><img src="images/screenshots/overview.png" alt="概要：境界の状態、警報、レーダーノード、エネルギー、現場のライブマップを 1 画面に表示します。" width="100%"><br><sub>概要：境界の状態、警報、レーダーノード、エネルギー、現場のライブマップを 1 画面に表示します。</sub></td><td width="50%" valign="top"><img src="images/screenshots/radar.png" alt="レーダー：各レーダーが捉えた目標を現場の図面上に表示し、各センサーのカバー範囲も示します。" width="100%"><br><sub>レーダー：各レーダーが捉えた目標を現場の図面上に表示し、各センサーのカバー範囲も示します。</sub></td></tr>
<tr><td width="50%" valign="top"><img src="images/screenshots/inverters.png" alt="インバーター：ソーラーパネル、系統、住宅、バッテリー間のエネルギーの流れ（読み取り専用）。" width="100%"><br><sub>インバーター：ソーラーパネル、系統、住宅、バッテリー間のエネルギーの流れ（読み取り専用）。</sub></td><td width="50%" valign="top"><img src="images/screenshots/site-designer.png" alt="サイトデザイナー：Studio の他の画面が使う図面に、地形・建物・カメラ・レーダーを描きます。" width="100%"><br><sub>サイトデザイナー：Studio の他の画面が使う図面に、地形・建物・カメラ・レーダーを描きます。</sub></td></tr>
<tr><td width="50%" valign="top"><img src="images/screenshots/electrical-designer.png" alt="電気デザイナー：住宅の AC・DC 回路図とそのチェックを、用意されたサンプルから表示します。" width="100%"><br><sub>電気デザイナー：住宅の AC・DC 回路図とそのチェックを、用意されたサンプルから表示します。</sub></td><td width="50%" valign="top"><img src="images/screenshots/alarm-panels.png" alt="警報パネル：各パネルが警戒中か、そのゾーン、直近の出来事を表示します。" width="100%"><br><sub>警報パネル：各パネルが警戒中か、そのゾーン、直近の出来事を表示します。</sub></td></tr>
</table>

## 🧩 A.R.M.O.R. での役割

Studio はシステム全体を見渡すオペレーターの窓口です。ノードとは直接話さず、すべて [ARMOR-SERVER](https://github.com/JuanenRac/ARMOR-SERVER) を通します（唯一の例外は各ノード自身のパネルへのリンク）。サイト、警報、電気設備、ネットワークの設計、ノードのファームウェアや設備自身のアップデートの操作、ヘルプとアシスタントもここにあります。同じサーバーを、スマートフォンの [ARMOR-ANDROID-CONTROL](https://github.com/JuanenRac/ARMOR-ANDROID-CONTROL) も使います。

## 🔄 アーキテクチャ

```mermaid
flowchart LR
    B["Browser"] -->|"static files"| H["tools/serve.mjs (static host)"]
    B -->|"HttpOnly session, JSON, MJPEG"| S["ARMOR-SERVER"]
    H -->|"/armor-config.json"| B
```

## 🔒 セキュリティモデル

* **ブラウザーにシークレットはありません。** カメラのパスワードは一度入力してサーバーに送り、その後はマスクされた「保存済み」の状態でしか表示されません。サイトのエクスポートはユーザー名と認証情報のフラグを除きます。
* **保存された設定は信頼できない入力です。** 値ごとに読み取られ、無効なオリジン、テーマ、言語、形は捨てられ、位置は範囲内に収められ、リストは上限が設けられます。
* **サードパーティへのリクエストはありません。** フォントはローカルのものです。静的ホストは、設定されたサーバーに限定した `Content-Security-Policy: default-src 'self'`、`frame-ancestors 'none'`、`nosniff`、`no-referrer` を送ります。
* ライブ映像は、サーバーがオペレーターに発行するストリームアドレスを通じてのみ表示されます。

## 📂 リポジトリの構成

```text
ARMOR-STUDIO/
├── src/
│   ├── App.tsx, domain.ts, settings.ts, prefs.ts, cameras.ts, hooks.ts, api.ts (+ api/ by area), config.ts, i18n.ts (loads one language at a time), storageSchema.ts (the version of what the browser keeps), viewSlots.tsx
│   ├── components/   camera, chrome (top bar, sidebar, Help), SiteMap
│   ├── views/        overview, monitoring, RadarView, AlarmsView, AlarmPanelsView, DevicesView, AutomationsView, InvertersView, BatteriesView, ElectricalView, NetworkView, WeatherView, SystemView, ServicesView
│   ├── designer/     the Site Designer: geometry, ops (+ ops/), model, Plan2D, Viewport3D, Toolbox, Inspector
│   ├── electrical/   the Electrical Designer: model, ops, analysis (the checks), presets, symbols, sync
│   ├── alarm/        the Alarm Designer and the alarm panels' Zigbee links
│   ├── network/      the Network Designer and the network model
│   ├── alerts/       sounds, voice and its styles, pop-ups, the announcer of alarms and of connections
│   ├── assistant/    the mascot, its dictionary in eight languages and where its bubble opens
│   ├── tour/         a guided tour for every menu
│   ├── weather/      the Weather menu: radar map, clouds, forecast
│   └── ...           ConfigurationPanel (tabs: General, Preferences, Users, Notifications, Automatic capture, Node firmware, Updates, Server, Services, Broker, Files, Installation, Console), MediaLibrary, HistoryView, StudioLogin, one *Text.ts per area (eight languages, one row per phrase); locales/ holds the table of each language, written from them
├── public/help/      the pictures of the Help, one set per language
├── index.html        the page Vite builds the app from
├── nginx/            default.conf.template, security_headers.conf (the web server of the image and its security headers)
├── e2e/              browser tests (Playwright)
├── tools/            serve.mjs (+ tests), build_locales.mjs (writes locales/), the shared CI checks (armor_ci_validate.py, armor_project_tool.py, _armor_readme_parity.py)
├── docs/             security model
└── images/           brand assets
```

## 🛠️ 開発環境

**必要なもの:** Node.js 22+, 稼働中の ARMOR-SERVER（なければ Studio はデモデータを表示します）

```powershell
npm install
npm run dev         # http://127.0.0.1:5178 against a server on 127.0.0.1:8080
npm run typecheck
npm run locales     # write the table of each language (src/locales) after changing a phrase
npm test            # 961 tests: designers, settings, cameras, radar map, solar arithmetic, alerts and the assistant, every menu in eight languages, static host
npm run build       # dist/
$env:ARMOR_SERVER_ORIGIN="http://192.168.0.180:18080"; node tools/serve.mjs   # serve the build
```

`tools/serve.mjs` は `ARMOR_STUDIO_HOST`（既定 `127.0.0.1`）、`ARMOR_STUDIO_PORT`（`5178`）、`ARMOR_STUDIO_DIST`、`ARMOR_SERVER_ORIGIN` を読みます。CM5 テストベンチにスタック全体をインストールするには [ARMOR-DEVOPS](https://github.com/JuanenRac/ARMOR-DEVOPS) を参照。

## 🔗 関連プロジェクト

**A.R.M.O.R.**（Autonomous Radar & Multimodal Observation Range）は、独立したリポジトリで構成される周辺警備システムです。それぞれに独自のバージョン、テスト、README があります。ファミリーは次のとおりです：

* **[ARMOR-COMMON](https://github.com/JuanenRac/ARMOR-COMMON)** - メッセージ契約、検証器、適合性ベクトル、生成された型
* **[ARMOR-NODE-RADAR](https://github.com/JuanenRac/ARMOR-NODE-RADAR)** - ESP32-S3 用フィールドノードのファームウェア。レーダー 3 基と独自の Web パネル付き
* **[ARMOR-NODE-SOLAR](https://github.com/JuanenRac/ARMOR-NODE-SOLAR)** - 太陽光インバーターとバッテリーのプロトコル、およびゲートウェイノードのメッセージ
* **[ARMOR-NODE-ELECTRICAL](https://github.com/JuanenRac/ARMOR-NODE-ELECTRICAL)** - 電気ノード：電力量計、電力網の計測メッセージ、開閉のルール
* **[ARMOR-NODE-ALARM](https://github.com/JuanenRac/ARMOR-NODE-ALARM)** - 警報ノードと警報盤：警戒区域、警戒セット、遅延、サイレン、PIN。サーバーがあってもなくても
* **[ARMOR-NODE-HMI](https://github.com/JuanenRac/ARMOR-NODE-HMI)** - タッチパネル：壁面ディスプレイでのシステム状態表示、警戒・確認操作、音声アシスタントの拠点
* **[ARMOR-NETWORK](https://github.com/JuanenRac/ARMOR-NETWORK)** - ローカルネットワーク：機器、インターネット、そして変化
* **[ARMOR-SERVER](https://github.com/JuanenRac/ARMOR-SERVER)** - 中央コーディネーター：テレメトリ、アラーム、デバイス、太陽光の測定値、カメラ
* **ARMOR-STUDIO** (このリポジトリ) - Web コンソール：カメラ、レーダー、アラーム、太陽光発電、2D/3D サイト設計
* **[ARMOR-ANDROID-CONTROL](https://github.com/JuanenRac/ARMOR-ANDROID-CONTROL)** - リアルタイム 2D/3D レーダー付きの Android オペレータークライアント
* **[ARMOR-IOS-CONTROL](https://github.com/JuanenRac/ARMOR-IOS-CONTROL)** - iPhone オペレータークライアント
* **[ARMOR-SERVER-AI](https://github.com/JuanenRac/ARMOR-SERVER-AI)** - 判断を説明し、決して動作しない視覚推論ポリシー
* **[ARMOR-VISION](https://github.com/JuanenRac/ARMOR-VISION)** - Jetson Orin NX 向けのカメラのゾーン、マスク、検知ルール
* **[ARMOR-VOICE-AI](https://github.com/JuanenRac/ARMOR-VOICE-AI)** - 偽造できない確認を備えたオフライン音声インテント
* **[ARMOR-HARDWARE](https://github.com/JuanenRac/ARMOR-HARDWARE)** - 筐体、電子部品、ベンチ受け入れマトリクス
* **[ARMOR-DEVOPS](https://github.com/JuanenRac/ARMOR-DEVOPS)** - デプロイ、CM5 テストベンチ、バックアップ、TLS
* **[ARMOR-SIMULATOR](https://github.com/JuanenRac/ARMOR-SIMULATOR)** - 再現可能な故障を備えたオフラインのテレメトリシミュレーター
* **[ARMOR-UPDATER](https://github.com/JuanenRac/ARMOR-UPDATER)** - エコシステム自身のリポジトリを検出し、インストールし、更新する
* **[ARMOR-DOCS](https://github.com/JuanenRac/ARMOR-DOCS)** - アーキテクチャ、セキュリティ基準、機能マトリクス

## 📚 ドキュメントとコミュニティ

詳しくは：

* [機能マトリクス：実証済みのものとそうでないもの](https://github.com/JuanenRac/ARMOR-DOCS/blob/main/docs/CAPABILITY_MATRIX.md)
* [プロジェクト一覧：バージョンとリポジトリ間の依存関係](https://github.com/JuanenRac/ARMOR-DOCS/blob/main/docs/PROJECT_CATALOG.md)
* [このリポジトリの変更履歴](CHANGELOG.md)
* [ライセンス（GPL-3.0-or-later）](LICENSE)
* 質問・提案・報告：electrohobby3d@gmail.com

## 👤 作者

**JuanenRac (Electro Hobby 3D)** · electrohobby3d@gmail.com

## 📜 ライセンス

GPL-3.0-or-later - [LICENSE](LICENSE) を参照。
