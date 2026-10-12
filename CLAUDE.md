# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

バドミントンのダブルス乱数表アプリ(`simple_badminton`)。共通テンプレート `mmishina-art/pwa-template` から作り、下の共通ルールを守る。既存の `Badminton-Doubles-Matchmaker-Project`(v2.5。1ファイルの HTML)を、標準の土台で作り直したもの。

## このアプリの方針(新規作成時に記入)

- アプリの ID(`package.json` の `name`。**ほかのアプリと別の名前**にする。下の「同じサイトに載るアプリ」を参照): `simple-badminton`。保存データのキー・バックアップの `app` 名・起動失敗の復旧の範囲に使う。**変えると、記録が引き継がれない**。
- アプリの概要: 参加者全員が公平にダブルスを楽しめるよう、出場回数の均等化・休憩の管理・男女ミックス優先・腕前の均等化を自動で行い、勝敗の記録から MVP を表彰し、試合中に使える得点板(巨大全画面・常時点灯・バイブ)も備えた、バドミントンサークル向けの PWA。
- 配色: **暗い固定**(濃い紺の地に、エメラルド・琥珀・ピンクのアクセント。既存のアプリの見た目を引き継ぎ、体育館の明るい照明の下でも大きな文字が見やすい)。`src/style.css` の変数、`index.html` の `theme-color` / `color-scheme`、`vite.config.ts` の色をそろえている。
- 公開 URL: https://mmishina-art.github.io/simple_badminton/
- 追加した拡張: **Preact**(UI フレームワーク。約 20KB)と **qrcode-generator**(設定の QR コード。ネットから読み込まず、アプリに同梱する)。理由: 6つのタブに、入力・勝敗・得点板など、状態が多い画面があり、既存のアプリでは「状態が変わるたびに画面を丸ごと作り直し、入力途中の名前が消える」不具合が実際に起きた。Preact は「状態から画面を自動で作る」ので、その種類の不具合が起きにくい。バックエンドは入れていない(記録は端末の中だけ)。

## 基本方針

- オーナーは Claude Code での開発を学習中。変更は小さく、理由を添えて説明する。
- ユーザー向けの文言・説明は日本語。コードの識別子とコミットメッセージは英語(命令形、1コミット1目的)。
- 作業は feature ブランチ → PR → CI が通ったら main にマージ。main に直接 push しない。
- **PR は1つの目的にする。** 他の PR の上に積まない(積むと、マージの順序と向き先の管理が大変になる)。どうしても積むときは、PR の本文に「どの PR の上か」を書き、下の PR から順にマージする。
- **デフォルトブランチは `main`。** `claude/...` などの作業ブランチを既定にしない(公開や CI の対象がずれるため)。
- 配信は GitHub Pages(サブパス配信)。参照パスは相対(`./`)にし、`/` から始めない。

## 技術スタック

Vite + TypeScript + Preact + vite-plugin-pwa + Vitest + Playwright + ESLint。JSX は Preact で処理する(`vite.config.ts` の `oxc.jsx`、`tsconfig.json` の `jsxImportSource`)。スタイルは**手書きの CSS**(Tailwind は使わない。既存のアプリが Tailwind をネットから読み込んでいて、オフラインで動かないため)。バックエンドは入れない。

| やりたいこと | コマンド |
|---|---|
| 開発サーバー | `npm run dev` |
| 型チェック + ビルド | `npm run build`(成果物は `dist/`) |
| Lint | `npm run lint` |
| 単体テスト | `npm test` |
| 画面テスト | `npm run test:e2e`(初回は `npx playwright install chromium`) |
| PWA 成立チェック | `npm run check:dist`(build のあと) |
| まとめて確認 | `npm run verify`(lint → test → build → check:dist) |
| アイコン再生成 | `npm run icons`(色・形は `scripts/make-icons.mjs` を編集) |

**変更を終える前に `npm run verify` を通す。** 画面に関わる変更は `npm run test:e2e` も通し、`npm run dev` で実際に動かして確認する。

## 構成

- `src/core/`: ルール・計算(純粋な関数。DOM に触れず、`tests/` で単体テストする)。組み合わせの選出と最適化、MVP、得点板のルール、共有テキスト、読み上げ文、メンバーの一括登録の解析。
- `src/state/`: 状態。`createStore.ts`(小さな状態の入れ物と、Preact 用のフック)、アプリの状態(メンバー・設定・履歴・進行中の試合・得点板)と、その操作(純粋な関数)、保存。
- `src/ui/`: 画面(Preact)。タブごとの画面(`MatchesTab.tsx` など)と、共通の部品。
- `src/platform/`: ブラウザの機能(音声読み上げ、画面の常時点灯、バイブ、全画面、クリップボード、QR コード)。
- `src/storage.ts` / `src/backup.ts` / `src/install.ts` / `src/pwa.ts`: テンプレートの共通の部品(保存、バックアップ、インストール方法、更新ボタン)。
- `index.html`: 上の帯(タイトル・バージョン・インストールの入口)、インストール方法のダイアログ、更新・起動失敗のお知らせは、Preact を通さない**静的な HTML**(`check:dist` が確認する)。画面本体・下のタブ・通知は `#root` に Preact が描く。
- `vite.config.ts`: アプリ名・色・manifest。`index.html` の `theme-color`・タイトルと合わせて書き換える。
- `scripts/check-dist.mjs`: ビルド成果物が PWA として成立しているかの検査。`scripts/make-icons.mjs`: アイコンの生成(SVG を Chromium で PNG に)。
- 画面の部品や機能を足すときは、ファイルを `src/` に分ける。Service Worker のファイル一覧は**自動生成**なので手で更新しない。

## アプリ固有のルール(乱数表)

- **既存のアプリ(v2.5)の「実際のコード」を正とする。** 仕様書(`SPECIFICATION.md`)の式と、実際のコードは、重みが違っていた(仕様書: ペア重複 70・対戦重複 15・実力差 20 / コード: ペア重複は二乗で 50 + 20、対戦重複 5、実力差は二乗で 15、同性ペア 15、試行は 1,200 回(2 面まで)/ 2,000 回)。長く使われてきた、コードの動きを移している。
- **乱数は注入する**(`rng` の引数。既定は `Math.random`)。テストでは、種を固定した乱数で、結果を再現できるようにする。
- 組み合わせの選出は、出場回数の少ない順 → 連続休みの多い順 → 総休みの多い順。同じ優先度の境界では、男女の人数が 1:1 に近づくほうを選ぶ。
- MVP の資格は、勝敗が記録された試合が全体で 3 試合以上、本人が 2 試合以上かつ 1 勝以上。スコア = 勝利数 × 10 + 勝率(%)× 0.1 + 勝敗記録のある試合数 + 腕前ボーナス(初級 +3 / 中級 +1.5 / 上級 0、いずれも 1 勝あたり)。
- 得点板のデュースの上限は、11 点 → 15 点、15 点 → 20 点、21 点 → 30 点(既存のコードのまま)。既定は 15 点先取・デュースなし・音声なし・画面の常時点灯あり。
- 保存データのキーは `simple-badminton-state`(メンバー・設定・履歴・進行中の試合)など。**キー名は変更しない**。既存のアプリのメンバーは、「名前 男 初級」の**テキスト形式**で書き出されるので、このアプリの一括登録と同じ解析で取り込める。
- 画面は、アニメーションの有無(`prefers-reduced-motion`)に関係なく、情報が欠けないようにする。得点板の巨大全画面は、横向きで使う(`screen.orientation.lock` が使えない端末では、横向きにして使う案内を出す)。

## PWA 要件(完了の定義)

- インストール可能(manifest、192/512 アイコン、**本物の maskable**、apple-touch-icon)。`npm run check:dist` が通ること。
- オフラインで起動して遊べる。
- **最初の画面(タイトル/ホーム)に、インストール方法の説明への入口を置く。** iPhone は自動のインストール案内が出ないため、手順を見せる必要がある。
  - iPhone / iPad(Safari: 共有 → ホーム画面に追加)、Android(Chrome: メニュー → アプリをインストール)、パソコン(Chrome / Edge: アドレスバーのインストールのマーク)の3つの手順を載せ、今使っている端末の説明を最初から開いておく。
  - Android / パソコンで `beforeinstallprompt` が使えるときは「今すぐインストール」ボタンも出す。
  - すでにインストールされて開いている(`display-mode: standalone`)ときは、入口を出さない。
  - テンプレートの `src/install.ts` と `index.html` の `#install-open` / `#install-dialog` を使う。`npm run check:dist` が入口の有無を確認する。
- 更新は**「更新」ボタン方式**(`registerType: 'prompt'`)。プレイ中に勝手に切り替えない。
- **タイトル画面(最初の画面)にバージョンを表示する**(例: `v0.1.0`)。更新が反映されたかを、利用者がひと目で確認できるようにするため。
  - バージョンの元は `package.json` の `version` の1か所(`vite.config.ts` が `__APP_VERSION__` として埋め込み、`index.html` の `#version` に表示する)。
  - 公開のたびに `version` を上げる。Service Worker のキャッシュ名は自動生成なので、手で合わせる番号はない。
  - `npm run check:dist` が `#version` の有無を確認する。
- ユーザーデータは `src/storage.ts` 経由(`localStorage` を `try/catch` で囲む)。**保存キー名は変更しない**(記録が消える)。
  - **保存データには版番号(`schemaVersion`、`src/backup.ts`)を持たせる。** 保存の形を変えるときは版を上げ、`src/storage.ts` の `migrate()` に移行処理を書く(キー名を変えたまま古い記録を捨てない)。
  - **記録を残すアプリは、ファイルへの書き出し / 読み込みを用意する**(テンプレートの「記録のバックアップ」)。`localStorage` は、ブラウザの都合で消えることがある(特に iPhone)。読み込みは、別のアプリや新しすぎる版のファイルを、理由を示して断る。
- **起動に失敗したときの復旧を用意する。** キャッシュ優先の Service Worker は、ファイルが食い違うと起動しなくなることがある。`public/boot.js`(メインとは別の普通のスクリプト)が、起動できなかったとき、キャッシュを消して読み込み直す(1回目は自動、2分以内の2回目は「なおす」ボタン)。保存データは消さない。**消すのは、このアプリの Service Worker とキャッシュだけ**(範囲を絞らないと、同じサイトのほかのアプリのキャッシュまで消える)。`src/main.ts` の最後で `window.__appStarted = true` にする。`npm run check:dist` が確認する。
- **同じサイトに載るアプリ: 名前をアプリごとに別にする。** GitHub Pages では、すべてのアプリが同じサイト(`mmishina-art.github.io`)に載る。`localStorage`・`sessionStorage`・Service Worker・キャッシュは、サイトの単位で共有されるので、アプリの ID(`package.json` の `name`)を、保存データのキーの接頭辞(`src/storage.ts`)・バックアップの `app` 名(`src/backup.ts`)・復旧の範囲(`public/boot.js`)に使い、ほかのアプリと混ざらないようにする。**新しいアプリでは `name` を変え、テンプレート用の印 `"pwaTemplate": true` を `package.json` から削除する**(`npm run check:dist` が、どちらも確認する)。
- **外部のリソース(Web フォント、CDN のスクリプトなど)に頼らない。** オフラインで動かなくなるため。使うなら、Service Worker のキャッシュ対象にする。
- **画像・音・問題文・文章は、自作するか、ライセンスを README に明記する。** 公開するアプリなので、あとで困らないようにする。
- iPhone の安全領域(`env(safe-area-inset-*)`)を考慮する。

## デザイン

- 色は `src/style.css` の `:root` 変数に集約する。色の直書きをしない。
- 配色方針はアプリごとに1つ選ぶ(上の「このアプリの方針」)。中途半端にしない。
  - 端末設定に従う: `prefers-color-scheme: dark` で変数を再定義(テンプレートの既定)
  - 明るい固定: `color-scheme: light only` と `<meta name="color-scheme" content="light only">`
  - 暗い固定: 世界観重視のゲーム向け。`theme-color` / `background_color` も暗い色に
- `[hidden] { display: none !important; }` を残す。
- スマホ縦画面を基準(`max-width` 480px で中央寄せ)。タップ領域は 44px 以上。
- ズーム: ピンチ拡大は許可し、ダブルタップ拡大だけ `touch-action: manipulation` で防ぐ。viewport に `user-scalable=no` / `maximum-scale` を入れない(`check:dist` が検出する)。
- `prefers-reduced-motion: reduce` でアニメーションを無効化する。
- アクセシビリティ: 結果は `aria-live` 領域でも読み上げる。ボタンに `aria-label` / `aria-pressed`。色だけで状態を伝えない。
- 効果音は Web Audio で合成(音声ファイルを持たない)。オン/オフ設定を必ず用意する。
- **iPhone の画面の上端(ぼかしの帯)を避ける。** ホーム画面アプリで、ステータスバーの下に内容が入り込むと、iOS がそこをぼかして、上端の文字が読みにくくなる(`simple_chess`・`simple_blackjack`・`simple_shogi` で起きた)。
  - `index.html` の `apple-mobile-web-app-status-bar-style` は、**不透明**にする(暗い固定・端末設定に従う: `black` / 明るい固定: `default`)。**`black-translucent` にしない。**
  - 上端の余白は、`src/style.css` の `--safe-top`(`env(safe-area-inset-top)` + `--top-gap` の 24px)を使う。**`env(safe-area-inset-top)` だけにしない。**
  - `min-height: calc(100dvh - …)` のように、画面の高さから上の余白を引いて計算しているところは、**上端の余白と同じ式で連動させる**(忘れると、ぴったり収まっていた画面がはみ出して、スクロールするようになる)。
  - `npm run check:dist` と `tests/top-edge.test.ts` が確認する。
  - ブラウザでは、ステータスバーまわりを再現できない。**実機の iPhone で、上端の文字がぼやけていないか確認する。** 画面は、小さい画面(iPhone SE の大きさ)と iPhone 14 の大きさで、スクロールが増えていないことも確認する。

## 画面の確認

- 画面を変えたら、**スマホの幅**・**小さい画面(iPhone SE の大きさ)**・**ダークモード**(対応しているアプリ)で、実際に表示して確認する(スクリーンショットを見る)。文字の折り返し、はみ出し、ボタンの表示崩れは、コードを読むだけでは気づきにくい。
- `hidden` 属性で隠す要素は、`display` を指定したクラスに負けないか確認する(`[hidden] { display: none !important; }` を残す)。
- PR の本文に、確認したこと(画面サイズ、実機か、していないか)を書く。実機で確認できていないことは、そう書く。

## テスト

- ロジックは純関数にして Vitest で単体テストする(`tests/*.test.ts`)。
- 画面操作は Playwright(Pixel 7、`reducedMotion: 'reduce'` が既定)。build 済みの成果物を `vite preview` で配信してテストする。乱数は固定する。アニメーションを見るテストだけ `test.use({ reducedMotion: 'no-preference' })` で解除し、短命な中間状態は直接 assert せず `MutationObserver` で記録する。効果音は `app:sound` イベントで確認する。
- データ駆動のアプリ(クイズなど)は、データの検証テストを書く(件数、重複、必須項目)。

## 入力と表示

- **利用者が入力した文字(名前など)は、`textContent` で表示する。`innerHTML` に入れない。** 意図しないタグが動くのを防ぐ。ESLint が `src/` での `innerHTML` / `outerHTML` への代入を止める。固定の HTML を組み立てる必要があるときは、その行に `eslint-disable` と理由を書く。
- 外部へ送信しない。個人情報を扱わない(記録は端末の中だけ)。

## CI(GitHub Actions)

- `test.yml`: main への push と全 PR で lint / 単体テスト / build / check:dist / E2E。
- `pages.yml`: main への push で、**テストが通ったときだけ** `dist/` を公開。作業ブランチは公開されない。
- GitHub の Settings → Pages で Source を「GitHub Actions」にしておく(初回のみ)。
- **依存パッケージと Actions の更新は Dependabot に任せる**(`.github/dependabot.yml`)。更新の PR は、CI が緑なのを確認してからマージする。
  - 同時に更新しないと組み合わせられないパッケージ(`vite`・`vitest`・`vite-plugin-pwa`)は、1つの PR にまとめる設定になっている。別々の PR だと CI が失敗する。
  - `typescript` のメジャー更新は、typescript-eslint が対応する(peer の範囲に入る)まで見送る(`dependabot.yml` の `ignore`。対応したら外す)。`@types/node` のメジャーは、CI の Node のメジャーに合わせる(Node を上げるときにいっしょに上げる)。
  - 更新の PR が失敗したら、閉じる前に、失敗の理由(`gh run view --log-failed`)を確認する。依存の順序の問題のこともある。

## Lint

ESLint(flat config)+ typescript-eslint。フォーマッタは入れない(オーナーの方針)。

## README

アプリの公開 URL、遊び方/機能、起動方法、ファイル構成、デバッグモードの入り方(ある場合)を書く。
