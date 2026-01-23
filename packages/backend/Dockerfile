# AgentCore Backend API Dockerfile
FROM node:20-slim

# 必要なツールをインストール（ヘルスチェック、Python、MCP サーバー実行用）
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# uv をインストール（Python MCP サーバー用）- 全ユーザーアクセス可能な場所へ
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    mv /root/.local/bin/uv /usr/local/bin/ && \
    mv /root/.local/bin/uvx /usr/local/bin/ 2>/dev/null || true

# uv のディレクトリ設定（Lambda /tmp 制約対応）
ENV UV_TOOL_DIR="/tmp/uv_tools"
ENV UV_TOOL_BIN_DIR="/tmp/uv_bin"

# 作業ディレクトリを設定
WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./
COPY tsconfig.json ./

# 依存関係をインストール（dev dependencies も含む）
RUN npm install

# ソースコードをコピー
COPY src/ ./src/

# TypeScript をコンパイル
RUN npm run build

# 本番用依存関係のみ再インストール
RUN npm install --only=production && npm cache clean --force

# ポート 3000 を公開
EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ping || exit 1

# 作業ディレクトリの所有権を node ユーザーに変更
RUN chown -R node:node /app

# 非 root ユーザーに切り替え（セキュリティ対策）
USER node

# アプリケーションを開始
CMD ["npm", "start"]
