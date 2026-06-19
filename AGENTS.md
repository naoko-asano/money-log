# money-log

## プロジェクト概要

LINEにテキストや領収書の写真を送るだけで記録できる個人用家計簿アプリ。

- テキスト例：「コーヒー 500円」
- 画像：領収書を撮影して送信 → Gemini APIで解析

## フロー

```
LINE → Webhook（Vercel Functions）
  ├─ テキスト → Gemini で解析 → 「XXをOO円で登録しますか？」
  └─ 画像    → Gemini でOCR  → 「XXをOO円で登録しますか？」（画像は保存しない）
確認OK → Neon（PostgreSQL）に保存
確認待ち状態の管理 → 未定
```

## 技術スタック

- 言語: TypeScript
- ランタイム: Vercel Functions
- LINE連携: LINE Messaging API
- AI解析: Gemini API
- DB: Neon（Serverless PostgreSQL）

## ディレクトリ構成

```
money-log/
├── api/        # Vercel Functions（LINE Webhook処理）
├── web/        # React + LIFF（家計簿の表示画面）
├── scripts/    # 管理用スクリプト
│   └── migrate.ts  # DBマイグレーション
├── shared/     # apiやweb等での共通処理
├── biome.json  # linter・formatter設定
└── tsconfig.json  # TypeScript設定（api・shared対象）
```

`web/` のTypeScript設定はVite初期化時に生成される。

## コードレビュー

指摘事項がある場合は、1件ずつではなく**全ての指摘を一度にまとめて**提示してください。

## コード変更後に必ず実行

コードを書いたら以下を順番に実行してください：

1. `pnpm typecheck` — TypeScript型チェック
2. `pnpm check` — Biome lint/formatチェック
3. テストに関係する変更の場合は `pnpm test:run`

## 開発メモ

- LINE Webhookの署名検証は必ず行う（セキュリティ上必須）
- 領収書画像はGemini解析後に捨てる。DBには保存しない
- 確認メッセージ（「登録しますか？」）と「OK」返信は別Webhookになるため、状態管理が必要（方法は未定）
