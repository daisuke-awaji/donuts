/**
 * ツール管理 API クライアント
 * Backend のツール API を呼び出すためのクライアント
 */

import { getValidAccessToken } from '../lib/cognito';

/**
 * MCP ツールの型定義
 */
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * ローカルツール定義（エージェント内蔵ツール）
 * AgentCore Gateway ではなく、エージェント内で直接実装されているツール
 */
export const LOCAL_TOOLS: MCPTool[] = [
  {
    name: 'execute_command',
    description:
      'シェルコマンドを実行し、結果を返します。ファイル操作、情報収集、開発タスクの自動化に使用できます。',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: '実行するシェルコマンド',
        },
        workingDirectory: {
          type: 'string',
          description: '作業ディレクトリ（未指定の場合は現在のディレクトリ）',
        },
        timeout: {
          type: 'number',
          minimum: 1000,
          maximum: 60000,
          default: 30000,
          description: 'タイムアウト（ミリ秒、デフォルト: 30秒、最大: 60秒）',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'tavily_search',
    description:
      'Tavily APIを使用して高品質なWeb検索を実行します。最新の情報、ニュース、一般的な話題について包括的な検索結果を取得できます。',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '検索クエリ（必須）',
        },
        searchDepth: {
          type: 'string',
          enum: ['basic', 'advanced'],
          default: 'basic',
          description: '検索深度。basicは1クレジット、advancedは2クレジット使用',
        },
        topic: {
          type: 'string',
          enum: ['general', 'news', 'finance'],
          default: 'general',
          description: '検索カテゴリ。newsは最新情報、generalは一般検索',
        },
        maxResults: {
          type: 'number',
          minimum: 1,
          maximum: 20,
          default: 5,
          description: '取得する最大検索結果数（1-20）',
        },
        includeAnswer: {
          type: 'boolean',
          default: true,
          description: 'LLM生成の要約回答を含める',
        },
        timeRange: {
          type: 'string',
          enum: ['day', 'week', 'month', 'year', 'd', 'w', 'm', 'y'],
          description: '時間範囲フィルター（過去の期間で絞り込み）',
        },
        includeDomains: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: '検索対象に含めるドメインのリスト',
        },
        excludeDomains: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: '検索対象から除外するドメインのリスト',
        },
        includeImages: {
          type: 'boolean',
          default: false,
          description: '関連画像も取得する',
        },
        country: {
          type: 'string',
          description: '特定の国の結果を優先（例: japan, united states）',
        },
      },
      required: ['query'],
    },
  },
];

/**
 * API レスポンスの型定義
 */
interface ToolsResponse {
  tools: MCPTool[];
  nextCursor?: string; // ページネーション用
  metadata: {
    requestId: string;
    timestamp: string;
    actorId: string;
    count: number;
    query?: string; // 検索の場合のみ
  };
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  gateway: {
    connected: boolean;
    endpoint: string;
  };
  metadata: {
    requestId: string;
    timestamp: string;
    actorId: string;
  };
}

/**
 * Backend API のベース URL を取得
 */
function getBackendBaseUrl(): string {
  // 環境変数から取得、未設定の場合はデフォルト値を使用
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

  // 末尾のスラッシュを除去してダブルスラッシュ問題を防ぐ
  return baseUrl.replace(/\/$/, '');
}

/**
 * 認証ヘッダーを作成（自動トークンリフレッシュ対応）
 * @returns Authorization ヘッダー
 */
async function createAuthHeaders(): Promise<Record<string, string>> {
  // getValidAccessToken() は必要に応じて自動でトークンをリフレッシュ
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error('認証トークンの取得に失敗しました。再ログインが必要です。');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

/**
 * ツール一覧を取得（ページネーション対応）
 * @param cursor ページネーション用のカーソル（オプショナル）
 * @returns ツール一覧とnextCursor
 */
export async function fetchTools(cursor?: string): Promise<{
  tools: MCPTool[];
  nextCursor?: string;
}> {
  try {
    const baseUrl = getBackendBaseUrl();
    const headers = await createAuthHeaders();

    // cursorパラメータがある場合はクエリに追加
    const url = cursor
      ? `${baseUrl}/tools?cursor=${encodeURIComponent(cursor)}`
      : `${baseUrl}/tools`;

    console.log('🔧 ツール一覧取得開始...', cursor ? { cursor } : {});

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `ツール一覧の取得に失敗しました: ${response.status} ${response.statusText} - ${
          errorData.message || 'Unknown error'
        }`
      );
    }

    const data: ToolsResponse = await response.json();
    console.log(
      `✅ ツール一覧取得完了: ${data.tools.length}件`,
      data.nextCursor ? { nextCursor: 'あり' } : { nextCursor: 'なし' }
    );

    return {
      tools: data.tools,
      nextCursor: data.nextCursor,
    };
  } catch (error) {
    console.error('💥 ツール一覧取得エラー:', error);
    throw error;
  }
}

/**
 * ツールを検索
 * @param query 検索クエリ
 * @returns 検索結果のツール一覧
 */
export async function searchTools(query: string): Promise<MCPTool[]> {
  if (!query || query.trim().length === 0) {
    throw new Error('検索クエリが必要です');
  }

  try {
    const baseUrl = getBackendBaseUrl();
    const headers = await createAuthHeaders();

    console.log(`🔍 ツール検索開始: "${query}"`);

    const response = await fetch(`${baseUrl}/tools/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: query.trim(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `ツール検索に失敗しました: ${response.status} ${response.statusText} - ${
          errorData.message || 'Unknown error'
        }`
      );
    }

    const data: ToolsResponse = await response.json();
    console.log(`✅ ツール検索完了: ${data.tools.length}件 (クエリ: "${query}")`);

    return data.tools;
  } catch (error) {
    console.error('💥 ツール検索エラー:', error);
    throw error;
  }
}

/**
 * Gateway 接続状態を確認
 * @returns 接続状態情報
 */
export async function checkGatewayHealth(): Promise<HealthResponse> {
  try {
    const baseUrl = getBackendBaseUrl();
    const headers = await createAuthHeaders();

    console.log('💓 Gateway 接続確認開始...');

    const response = await fetch(`${baseUrl}/tools/health`, {
      method: 'GET',
      headers,
    });

    const data: HealthResponse = await response.json();

    if (!response.ok) {
      console.warn(`⚠️ Gateway 接続確認警告: ${response.status} ${response.statusText}`);
    } else {
      console.log('✅ Gateway 接続確認完了:', data.status);
    }

    return data;
  } catch (error) {
    console.error('💥 Gateway 接続確認エラー:', error);
    throw error;
  }
}
