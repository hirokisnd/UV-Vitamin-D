# UV Vitamin D App

このアプリは、国立環境研究所のデータを利用して、現在の紫外線量からビタミンD生成に必要な時間を算出するスマホアプリ（PWA）です。

## 主な機能
* リアルタイムのUV指数表示
* ビタミンD生成に必要な日光浴時間の計算
* 紫外線の強さに応じた背景色の変化

## データ出典
* 本アプリの紫外線データは、**国立環境研究所（CGER）**の「有害紫外線モニタリングネットワーク」から取得しています。

## 開発環境
* Replit Agent を使用して作成
* React Native (Expo) / TypeScript

## 技術的特徴

### サーバーサイドキャッシュ（2026-03-20 導入）
- NIES APIのレスポンスを24時間キャッシュ（Postgres）
- キャッシュヒット時、レスポンス時間 ~5ms（従来の500msから99%改善）
- ヘッダー: `X-Cache-Status: HIT|MISS` で監視可能

### リトライ戦略
- 指数バックオフ（1s→2s→4s）+ jitter 20%
- 最大3回リトライ、タイムアウト10秒
- 外部APIの一時障害に対する耐性向上

### コード構成
- **Frontend**: Expo Router + React Query + React Native for Web
- **Backend**: Express (Vercel Serverless)
- **Database**: Vercel Postgres (Neon) + Drizzle ORM
- **External API**: 国立環境研究所（NIES）UVデータ

## 開発・デプロイ

### 環境変数
```bash
DATABASE_URL=<Vercel Postgres connection string>
```

### 開発コマンド
```bash
npm run dev        # 開発サーバー起動（ポート3000）
npm run build      # プロダクションビルド
npm run lint       # リント
npx tsc --noEmit   # 型チェック
npm run db:push    # DBスキーマ適用
```

### 本番デプロイ
```bash
git add .
git commit -m "feat: description"
git push origin main  # Vercel自動デプロイ
```

## ライセンス
（必要に応じて記載）
