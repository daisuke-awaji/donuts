# CDK - Multi-Environment Deployment

Amazon Bedrock AgentCore のマルチ環境デプロイメント用 CDK スタック

## 📁 プロジェクト構成

```
packages/cdk/
├── bin/
│   └── app.ts              # CDK アプリエントリポイント
├── lib/
│   ├── agentcore-stack.ts  # メインスタック
│   └── constructs/         # 再利用可能な Construct
└── config/
    ├── environments.ts     # 環境別設定
    └── index.ts
```

## 🌍 対応環境

| 環境 | スタック名 | 用途 | 削除保護 |
|------|-----------|------|---------|
| dev | DevAgentCoreApp | 開発・検証 | ❌ OFF |
| stg | StgAgentCoreApp | ステージング・QA | ❌ OFF |
| prd | PrdAgentCoreApp | 本番 | ✅ ON |

## 🚀 デプロイ方法

### 開発環境へのデプロイ

```bash
# 開発環境（デフォルト）
npm run deploy:dev

# または
npx -w packages/cdk cdk deploy -c env=dev
```

### ステージング環境へのデプロイ

```bash
npm run deploy:stg
```

### 本番環境へのデプロイ

```bash
# 本番環境は承認が必要
npm run deploy:prd

# または
npx -w packages/cdk cdk deploy -c env=prd --require-approval broadening
```

## 🔍 差分確認

デプロイ前に変更内容を確認:

```bash
# 開発環境
npm run diff:dev

# ステージング環境
npm run diff:stg

# 本番環境
npm run diff:prd
```

## 🔧 環境設定

環境別設定は `config/environments.ts` で定義されています。

### 主な設定項目

| 設定項目 | dev | stg | prd |
|---------|-----|-----|-----|
| Gateway名 | agentcore-dev | agentcore-stg | agentcore-prd |
| Memory有効期限 | 30日 | 60日 | 365日 |
| S3削除ポリシー | DESTROY | RETAIN | RETAIN |
| CORS | `*` | 限定URL | 限定URL |
| ログ保持期間 | 7日 | 14日 | 30日 |

### カスタム設定の追加

`config/environments.ts` を編集して環境固有の設定を追加できます:

```typescript
export const environments: Record<Environment, EnvironmentConfig> = {
  dev: {
    env: 'dev',
    awsRegion: 'ap-northeast-1',
    awsAccount: '123456789012', // オプション：AWS アカウント指定
    gatewayName: 'agentcore-dev',
    // ... その他の設定
  },
  // ...
};
```

## 🗑️ スタックの削除

### 開発環境

```bash
npm run destroy:dev
```

### ステージング環境

```bash
npm run destroy:stg
```

### 本番環境

```bash
# 本番環境は削除保護が有効なため、手動で無効化が必要
aws cloudformation update-termination-protection \
  --stack-name PrdAgentCoreApp \
  --no-enable-termination-protection

npx -w packages/cdk cdk destroy -c env=prd
```

## 📝 デプロイ例

### 初回デプロイ（Bootstrap）

初めてデプロイする場合は CDK Bootstrap が必要です:

```bash
# デフォルトリージョン
npx -w packages/cdk cdk bootstrap

# 特定のリージョン
npx -w packages/cdk cdk bootstrap aws://ACCOUNT-ID/ap-northeast-1
```

### 開発環境への完全なデプロイフロー

```bash
# 1. 差分確認
npm run diff:dev

# 2. デプロイ
npm run deploy:dev

# 3. 出力確認
# CloudFormation の Outputs セクションに以下が表示されます:
# - UserPoolId
# - UserPoolClientId
# - FrontendUrl
# - BackendApiUrl
# - RuntimeInvocationEndpoint
# など
```

## 🔐 認証情報

デプロイには適切な AWS 認証情報が必要です:

```bash
# AWS CLI プロファイルを使用
export AWS_PROFILE=your-profile

# または環境変数で指定
export AWS_ACCESS_KEY_ID=xxx
export AWS_SECRET_ACCESS_KEY=xxx
export AWS_DEFAULT_REGION=ap-northeast-1
```

## 📊 スタック出力

デプロイ後、以下の情報が CloudFormation Outputs として出力されます:

- **GatewayId**: AgentCore Gateway ID
- **UserPoolId**: Cognito User Pool ID
- **UserPoolClientId**: Cognito Client ID
- **FrontendUrl**: フロントエンドアプリケーションURL
- **BackendApiUrl**: バックエンドAPI URL
- **RuntimeInvocationEndpoint**: Runtime呼び出しエンドポイント
- **MemoryId**: AgentCore Memory ID
- **UserStorageBucketName**: ユーザーストレージS3バケット名

## 🔧 トラブルシューティング

### スタック名が既に存在する

既存のスタックを削除するか、環境名を変更してください:

```bash
npx -w packages/cdk cdk destroy -c env=dev
```

### Bootstrap が必要

```bash
npx -w packages/cdk cdk bootstrap
```

### リージョンが正しくない

`config/environments.ts` で対象リージョンを確認してください。

## 📚 関連ドキュメント

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock/)
- [デプロイメントガイド](../../docs/DEVELOPMENT.md)

## 💡 ヒント

### 環境を切り替える

Context パラメータ `-c env=<環境名>` を使用します:

```bash
# 環境を明示的に指定
npx -w packages/cdk cdk deploy -c env=stg

# 省略した場合はデフォルトの dev
npx -w packages/cdk cdk deploy
```

### スタック名をカスタマイズ

`bin/app.ts` で以下の行を編集:

```typescript
const stackName = `${envName.charAt(0).toUpperCase() + envName.slice(1)}AgentCoreApp`;
```

### 本番環境の安全性

本番環境には以下の保護が有効化されています:

- **削除保護**: スタックの誤削除を防止
- **S3 RETAIN ポリシー**: バケットデータを保持
- **承認フロー**: デプロイ時に変更確認を要求
- **Cognito 削除保護**: ユーザープールの誤削除を防止
