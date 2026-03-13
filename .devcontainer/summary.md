# Dev Container 作成完了

## 作成したファイル一覧

### Dev Container設定ファイル
- `.devcontainer/devcontainer.json` - Dev Container設定
- `.devcontainer/docker-compose.yml` - Docker Compose設定
- `.devcontainer/Dockerfile` - コンテナイメージ定義
- `.devcontainer/nginx.conf` - Nginx設定

### スクリプト
- `.devcontainer/copy-server.sh` - `/server` の内容を `/api` にコピー
- `.devcontainer/setup.sh` - 開発環境のセットアップ
- `.devcontainer/launch.json` - VSCodeデバッグ設定

### ドキュメント
- `.devcontainer/README.md` - Dev Containerガイド
- `.devcontainer/CONTAINER_START_GUIDE.md` - 起動手順詳細
- `.devcontainer/summary.md` - 作成完了サマリー

## プロジェクト構成

```
UV-Vitamin-D/
├── .devcontainer/
│   ├── devcontainer.json
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── copy-server.sh
│   ├── setup.sh
│   ├── launch.json
│   ├── README.md
│   ├── CONTAINER_START_GUIDE.md
│   └── summary.md
├── api/
│   ├── index.js
│   └── routes.js
├── package.json
├── vercel.json
├── README.md
└── (その他のプロジェクトファイル)
```

## 起動手順

1. VSCodeでプロジェクトを開く
2. 左下の「Dev Container で開く」をクリック
3. ターミナルで `./.devcontainer/setup.sh` を実行
4. `npm run dev` でAPIサーバー起動
5. `npx expo start` でExpoサーバー起動

## Vercelデプロイ用

Vercelにデプロイする際は、
- `./.devcontainer/copy-server.sh` を実行して `/server` の内容を `/api` にコピー
- `package.json` のスクリプトをVercel用に修正
する必要があります。