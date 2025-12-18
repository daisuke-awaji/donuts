# @fullstack-agentcore/client

AgentCore Runtime 用の CLI クライアントツールです。

## 概要

このパッケージは、AgentCore Runtime に対してコマンドラインから接続・操作するためのクライアントツールを提供します。

### 対応環境

- **ローカル環境**: docker compose で起動した AgentCore Runtime
- **AWS 環境**: Amazon Bedrock AgentCore Runtime

### 主な機能

- 🏥 **ヘルスチェック**: Agent の動作確認
- 🤖 **Agent 呼び出し**: プロンプトの送信と応答の受信
- 🔄 **インタラクティブモード**: 対話的な Agent 操作
- ⚙️ **設定管理**: エンドポイントと認証の管理
- 🎫 **JWT 認証**: Amazon Cognito との連携

## インストール

```bash
# パッケージのビルド
npm run build

# グローバルインストール（オプション）
npm link
```

## 設定

### 環境変数

`.env.example` を `.env` にコピーして設定を変更してください:

```bash
cp .env.example .env
```

主な設定項目:

```env
# ====================================
# 🏠 ローカル環境（デフォルト）
# ====================================
# ローカルの Agent サーバーに接続する場合
AGENTCORE_ENDPOINT=http://localhost:8080

# ====================================
# ☁️ AWS AgentCore Runtime
# ====================================
# Runtime ARN を指定すると自動的に AWS AgentCore Runtime に接続
AGENTCORE_RUNTIME_ARN=arn:aws:bedrock-agentcore:us-east-1:ACCOUNT_ID:runtime/YOUR_RUNTIME_ID
AGENTCORE_REGION=us-east-1

# ====================================
# 🔐 Cognito 認証設定（AWS 接続時に必要）
# ====================================
COGNITO_USER_POOL_ID=us-east-1_OZ6KUvSn3
COGNITO_CLIENT_ID=19duob1sqr877jesho69aildbn
COGNITO_USERNAME=testuser
COGNITO_PASSWORD=TestPassword123!
COGNITO_REGION=us-east-1
```

### 接続先の自動判定

設定の優先順位：

1. **`AGENTCORE_RUNTIME_ARN`** が設定されている → AWS AgentCore Runtime に接続
2. **`AGENTCORE_ENDPOINT`** が設定されている → カスタムエンドポイント（ローカル開発など）
3. **両方とも未設定** → デフォルト（`http://localhost:8080`）に接続

### ランタイム

- **ローカル環境**: docker compose や開発サーバー
  - 認証: 不要
  - 設定: `AGENTCORE_ENDPOINT` のみ
- **AWS AgentCore Runtime**: Amazon Bedrock AgentCore
  - 認証: Cognito JWT 必須
  - 設定: `AGENTCORE_RUNTIME_ARN` + Cognito 設定

## 使用方法

### 基本コマンド

```bash
# ヘルスチェック
agentcore-client ping

# Agent 呼び出し
agentcore-client invoke "Hello, what is 1+1?"

# インタラクティブモード
agentcore-client interactive

# 設定確認
agentcore-client config

# JWT トークン情報
agentcore-client token

# プロファイル一覧
agentcore-client profiles
```

### オプション

```bash
# プロファイルを指定
agentcore-client ping --profile agentcore

# エンドポイントを直接指定
agentcore-client invoke "Hello" --endpoint http://localhost:8080

# JSON 出力
agentcore-client ping --json

# 認証なしで実行
agentcore-client invoke "Hello" --no-auth

# 実行時間の測定
agentcore-client invoke "Hello" --time
```

### 設定の検証

```bash
# 設定の妥当性をチェック
agentcore-client config --validate

# JSON 形式で設定を出力
agentcore-client config --json
```

## 使用例

### ローカル環境での使用

1. **Docker Compose でサーバー起動**:

   ```bash
   cd packages/agent
   docker compose up -d
   ```

2. **ヘルスチェック**:

   ```bash
   agentcore-client ping --profile local
   ```

3. **Agent 呼び出し**:
   ```bash
   agentcore-client invoke "今日の天気はどうですか？" --profile local
   ```

### AWS 環境での使用

1. **設定確認**:

   ```bash
   agentcore-client config --validate --profile agentcore
   ```

2. **JWT トークン取得確認**:

   ```bash
   agentcore-client token --profile agentcore
   ```

3. **Agent 呼び出し**:
   ```bash
   agentcore-client invoke "AWS のサービスについて教えて" --profile agentcore
   ```

### インタラクティブモード

連続して Agent と対話できます:

```bash
agentcore-client interactive

# セッション例
AgentCore> こんにちは
(Agent の応答)

AgentCore> 1+1は？
(Agent の応答)

AgentCore> exit
👋 セッションを終了します
```

## 開発

### ビルド

```bash
npm run build
```

### 開発モード

```bash
npm run dev
```

### テスト

```bash
# ローカル環境でのテスト
npm run dev ping

# 設定確認
npm run dev config --validate
```

## トラブルシューティング

### 接続エラー

1. **サーバーが起動しているか確認**:

   ```bash
   curl http://localhost:8080/ping
   ```

2. **エンドポイントの設定確認**:
   ```bash
   agentcore-client config
   ```

### 認証エラー

1. **Cognito 設定の確認**:

   ```bash
   agentcore-client config --validate --profile agentcore
   ```

2. **JWT トークンの状態確認**:

   ```bash
   agentcore-client token --profile agentcore
   ```

3. **認証なしでのテスト**:
   ```bash
   agentcore-client invoke "test" --no-auth
   ```

## ライセンス

MIT

## 関連パッケージ

- `@fullstack-agentcore/agent`: Agent Runtime サーバー
- `@fullstack-agentcore/cdk`: AWS インフラストラクチャ
