/**
 * Tavily API 共通ユーティリティ
 */
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logger } from '../config/index.js';

let cachedApiKey: string | null = null;

/**
 * Tavily API キーを取得
 * 1. キャッシュがあればそれを返す
 * 2. TAVILY_API_KEY 環境変数があればそれを使用（ローカル開発用）
 * 3. TAVILY_API_KEY_SECRET_NAME があれば Secrets Manager から取得
 */
export async function getTavilyApiKey(): Promise<string> {
  // キャッシュがあればそれを返す
  if (cachedApiKey) {
    return cachedApiKey;
  }

  // 環境変数から直接取得（ローカル開発用）
  if (process.env.TAVILY_API_KEY) {
    cachedApiKey = process.env.TAVILY_API_KEY;
    logger.debug('Tavily API Key loaded from TAVILY_API_KEY environment variable');
    return cachedApiKey;
  }

  // Secrets Manager から取得（本番環境用）
  const secretName = process.env.TAVILY_API_KEY_SECRET_NAME;
  if (secretName) {
    try {
      const client = new SecretsManagerClient({});
      const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
      cachedApiKey = response.SecretString || null;
      if (cachedApiKey) {
        logger.info(`Tavily API Key loaded from Secrets Manager: ${secretName}`);
        return cachedApiKey;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to retrieve Tavily API Key from Secrets Manager: ${errorMessage}`);
      throw new Error(`Secrets Manager からの API キー取得に失敗しました: ${errorMessage}`);
    }
  }

  throw new Error('TAVILY_API_KEY または TAVILY_API_KEY_SECRET_NAME 環境変数が設定されていません');
}
