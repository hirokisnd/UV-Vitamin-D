# UV-Vitamin-D

UVインデックスとビタミンD生成時間をチェックできるアプリです。

## データ出典

- 紫外線データ: 国立環境研究所 (NIES) オープンデータ
- ビタミンD生成時間: 厚生労働省ガイドライン

## 開発環境

### Dev Container 起動方法

1. VSCodeでこのフォルダを開きます
2. 左下の「Dev Container で開く」をクリックします
3. コンテナのビルドと起動が完了するまで待ちます
4. ターミナルで以下のコマンドを実行します：
   ```bash
   npm run dev
   ```

### ポート
- 3000: Expo開発サーバー
- 5000: Express APIサーバー

## プロジェクト構成

- `/app` - React Nativeアプリコード
- `/server` - Express APIサーバー
- `/api` - Vercelデプロイ用APIルート

## デプロイ

Vercelにデプロイする際は、
- `/server` の内容を `/api` に移動
- `package.json` のスクリプトをVercel用に修正
する必要があります。
