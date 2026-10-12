# 🏸 バド乱数表(simple_badminton)

バドミントンのダブルスを、公平に楽しむためのアプリです。出場回数の均等化・休憩の管理・男女ミックス優先・腕前の均等化を自動で行い、勝敗の記録から本日の MVP を表彰します。試合中に使える得点板も付いています。スマホのホーム画面に追加すると、体育館が圏外でも使えます(PWA)。

**公開 URL**: https://mmishina-art.github.io/simple_badminton/

> 作成中です。機能は、段階的に追加しています(進み具合は、リポジトリの Pull requests を見てください)。

## 開発

```bash
npm ci
npm run dev          # 開発サーバー
npm run verify       # lint → test → build → check:dist
npx playwright install chromium && npm run test:e2e
```

ルールの詳細は [CLAUDE.md](./CLAUDE.md) を参照してください。

## 素材とライセンス

画像(アイコン)は、このリポジトリのコード(`scripts/make-icons.mjs`)で描いています。音声は、端末の音声合成(Web Speech API)を使い、音声ファイルは持ちません。外部のサービス・ネットからの読み込みはありません。
