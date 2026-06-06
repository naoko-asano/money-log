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

## 開発メモ

- LINE Webhookの署名検証は必ず行う（セキュリティ上必須）
- 領収書画像はGemini解析後に捨てる。DBには保存しない
- 確認メッセージ（「登録しますか？」）と「OK」返信は別Webhookになるため、状態管理が必要（方法は未定）
