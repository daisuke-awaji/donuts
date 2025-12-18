#!/bin/bash

# JWT 伝播テスト用スクリプト
# Runtime への JWT 送信 → Agent ツール呼び出し → Gateway への JWT 伝播をテスト

set -e

# 設定
USER_POOL_ID="us-east-1_OZ6KUvSn3"
CLIENT_ID="19duob1sqr877jesho69aildbn"
REGION="us-east-1"
TEST_USERNAME="testuser"
TEST_PASSWORD="TestPassword123!"

# Runtime情報を取得
echo "🔍 AgentCore Runtime情報を取得中..."
RUNTIME_ARN=$(aws cloudformation describe-stacks \
  --stack-name AgentCoreStack \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`AgentRuntimeArn`].OutputValue' \
  --output text 2>/dev/null || echo "")

if [ -z "$RUNTIME_ARN" ]; then
  echo "❌ Runtime ARNが見つかりません。CDK デプロイを確認してください。"
  exit 1
fi

# Runtime ARN を URL エンコード
ESCAPED_RUNTIME_ARN=$(printf '%s' "$RUNTIME_ARN" | jq -sRr @uri)
RUNTIME_ENDPOINT="https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/$ESCAPED_RUNTIME_ARN/invocations?qualifier=DEFAULT"

echo "✅ Runtime ARN: $RUNTIME_ARN"
echo "🎯 テストエンドポイント: $RUNTIME_ENDPOINT"

# JWT Token取得
echo ""
echo "🎫 JWT Tokenを取得中..."
AUTH_RESPONSE=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $CLIENT_ID \
  --auth-parameters USERNAME=$TEST_USERNAME,PASSWORD=$TEST_PASSWORD \
  --region $REGION)

JWT_TOKEN=$(echo $AUTH_RESPONSE | jq -r '.AuthenticationResult.AccessToken')

if [ "$JWT_TOKEN" = "null" ] || [ -z "$JWT_TOKEN" ]; then
  echo "❌ JWT Token 取得に失敗しました"
  exit 1
fi

echo "✅ JWT Token取得成功"
echo "Token (最初の50文字): ${JWT_TOKEN:0:50}..."

# JWT 伝播テスト用のプロンプト（AgentCore Gateway ツールを使用するもの）
TEST_PROMPTS=(
  "echo-tool を使って 'JWT伝播テスト成功' というメッセージを出力してください"
  "ping-tool を使ってシステムの動作確認をしてください"
  "利用可能なツールの一覧を表示してください"
)

echo ""
echo "🚀 JWT 伝播テスト開始..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for i in "${!TEST_PROMPTS[@]}"; do
  PROMPT="${TEST_PROMPTS[$i]}"
  TEST_NUM=$((i + 1))
  
  echo ""
  echo "📝 テスト $TEST_NUM: $PROMPT"
  echo "----------------------------------------"
  
  # セッションIDを生成（33文字以上必須）
  SESSION_ID="jwt-propagation-test-$TEST_NUM-$(date +%s)-$(openssl rand -hex 4)"
  
  # Runtime にリクエスト送信
  echo "🔄 Runtime にリクエスト送信中..."
  RUNTIME_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/octet-stream" \
    -H "X-Amzn-Bedrock-AgentCore-Runtime-Session-Id: $SESSION_ID" \
    -X POST \
    "$RUNTIME_ENDPOINT" \
    -d "$PROMPT" 2>/dev/null || echo -e "connection_error\n000")

  HTTP_STATUS=$(echo "$RUNTIME_RESPONSE" | tail -n1)
  RESPONSE_BODY=$(echo "$RUNTIME_RESPONSE" | sed '$d')

  echo "HTTP Status: $HTTP_STATUS"
  
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ リクエスト成功!"
    
    # レスポンスからツール呼び出し情報を抽出
    if echo "$RESPONSE_BODY" | grep -q "ツール呼び出し"; then
      echo "🔧 AgentCore Gateway ツール呼び出しが確認されました"
    fi
    
    # レスポンス内容を表示（最初の500文字）
    echo "📋 レスポンス概要:"
    echo "$RESPONSE_BODY" | head -c 500 | jq '.' 2>/dev/null || echo "$RESPONSE_BODY" | head -c 500
    echo "..."
    
    # requestId をレスポンスから抽出
    REQUEST_ID=$(echo "$RESPONSE_BODY" | jq -r '.metadata.requestId' 2>/dev/null || echo "N/A")
    if [ "$REQUEST_ID" != "N/A" ] && [ "$REQUEST_ID" != "null" ]; then
      echo "🆔 Request ID: $REQUEST_ID"
    fi
    
  elif [ "$HTTP_STATUS" = "401" ]; then
    echo "❌ JWT認証失敗 (401 Unauthorized)"
    echo "レスポンス: $RESPONSE_BODY"
    
  elif [ "$HTTP_STATUS" = "424" ]; then
    echo "⚠️  Agent 設定エラー (424 Failed Dependency)"
    echo "💡 これは予想される動作です（Agent が環境変数不足でエラーになる場合）"
    echo "重要なのは JWT 認証が通過していることです。"
    
  else
    echo "⚠️  予期しないレスポンス (HTTP $HTTP_STATUS)"
    echo "レスポンス: $RESPONSE_BODY"
  fi
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
done

# CloudWatch Logs 確認の案内
echo ""
echo "📊 JWT 伝播確認のための CloudWatch Logs 確認:"
echo "以下のログで JWT 伝播の動作を確認できます:"
echo ""
echo "1. Runtime ログ:"
echo "   aws logs describe-log-groups --log-group-name-prefix '/aws/bedrock/agentcore/runtime'"
echo ""
echo "2. ログ確認コマンド例:"
echo "   aws logs filter-log-events \\"
echo "     --log-group-name '/aws/bedrock/agentcore/runtime/RUNTIME_ID' \\"
echo "     --start-time \$(date -d '5 minutes ago' +%s)000 \\"
echo "     --filter-pattern 'JWT OR リクエストコンテキスト OR Authorization'"
echo ""

# テスト結果サマリー
echo "🎉 JWT 伝播テスト完了!"
echo ""
echo "📈 期待される動作:"
echo "✅ Runtime が JWT 認証を通過"
echo "✅ Runtime 内で RequestContext に JWT が保存される"  
echo "✅ Agent がツール呼び出し時に同じ JWT を Gateway に送信"
echo "✅ Gateway が JWT を検証してツール実行"
echo ""
echo "🔍 JWT 伝播の確認方法:"
echo "- Runtime ログで 'リクエストコンテキストから JWT を使用' メッセージ"
echo "- Gateway ログで同じ JWT での認証成功"
echo "- Agent レスポンスでツール実行結果が含まれる"
