#!/bin/bash

# Dev Container セットアップスクリプト
set -e

echo "Setting up UV-Vitamin-D development environment..."

# 必要なディレクトリを作成
mkdir -p api

# サーバーファイルを/apiにコピー
./.devcontainer/copy-server.sh

# 依存関係をインストール
echo "Installing dependencies..."
npm install

# 必要なスクリプトを実行可能に
chmod +x .devcontainer/copy-server.sh

# 完了メッセージ
echo ""
echo "Setup completed!"
echo ""
echo "To start development server:"
echo "  npm run dev"
echo ""
echo "To copy server files to api folder:"
echo "  ./.devcontainer/copy-server.sh"
echo ""
echo "Dev Container is ready to use!"