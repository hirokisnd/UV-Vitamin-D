FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /workspace

# 必要なパッケージをインストール
RUN apk update && apk add --no-cache \
    curl \
    git \
    && rm -rf /var/cache/apk/*

# ユーザーを node に設定
USER node

# プロジェクトの依存関係をインストール
COPY package*.json ./
RUN npm ci

# プロジェクトのソースコードをコピー
COPY . .

# 必要なポートを公開
EXPOSE 3000 5000

# 開発用のエントリーポイント
CMD ["npm", "run", "start"]