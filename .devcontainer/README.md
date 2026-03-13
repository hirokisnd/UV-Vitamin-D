# Dev Container セットアップガイド

## コンテナの起動方法

1. VSCodeでこのフォルダを開きます
2. 左下の「Dev Container で開く」をクリックします
3. コンテナのビルドと起動が完了するまで待ちます
4. ターミナルで以下のコマンドを実行します：
   ```bash
   ./.devcontainer/setup.sh
   ```

## 利用可能なスクリプト

- `./.devcontainer/setup.sh` - 開発環境のセットアップ
- `./.devcontainer/copy-server.sh` - `/server` の内容を `/api` にコピー

## 起動コマンド

- `npm run dev` - APIサーバー起動
- `npx expo start` - Expo開発サーバー起動

## ポート

- 3000: Expo開発サーバー
- 5000: Express APIサーバー

## Vercelデプロイ用

Vercelにデプロイする際は、
- `./.devcontainer/copy-server.sh` を実行して `/server` の内容を `/api` にコピー
- `package.json` のスクリプトをVercel用に修正
する必要があります。