/**
 * 長期記憶取得ユーティリティ
 * AgentCore Memory からセマンティック検索で長期記憶を取得
 */

import {
  BedrockAgentCoreClient,
  RetrieveMemoryRecordsCommand,
} from '@aws-sdk/client-bedrock-agentcore';
import {
  BedrockAgentCoreControlClient,
  GetMemoryCommand,
} from '@aws-sdk/client-bedrock-agentcore-control';
import { logger } from '../config/index.js';

/**
 * AWS SDK の型定義が不完全な部分を補完する型定義
 */
interface MemoryRecordSummary {
  memoryRecordId?: string;
  content?: string | { text?: string };
  createdAt?: Date;
  namespaces?: string[];
  memoryStrategyId?: string;
  metadata?: Record<string, unknown>;
}

interface RetrieveMemoryRecordsParams {
  memoryId: string;
  namespace: string;
  searchCriteria: {
    searchQuery: string;
    memoryStrategyId: string;
    topK: number;
  };
  maxResults: number;
}

/**
 * セマンティックメモリ戦略IDを取得（キャッシュ付き）
 */
let cachedStrategyId: string | null = null;

async function getSemanticMemoryStrategyId(memoryId: string, region: string): Promise<string> {
  if (cachedStrategyId) {
    logger.info(`[MemoryRetriever] キャッシュされた strategyId を使用: ${cachedStrategyId}`);
    return cachedStrategyId as string;
  }

  try {
    logger.info(`[MemoryRetriever] GetMemory API で strategyId を取得中: memoryId=${memoryId}`);

    const controlClient = new BedrockAgentCoreControlClient({ region });
    const command = new GetMemoryCommand({
      memoryId: memoryId,
    });

    const response = await controlClient.send(command);

    if (!response.memory?.strategies || response.memory.strategies.length === 0) {
      logger.warn('[MemoryRetriever] Memory に strategies が見つかりません');
      cachedStrategyId = 'semantic_memory_strategy'; // フォールバック
      return cachedStrategyId as string;
    }

    // name または strategyId が 'semantic_memory_strategy' で始まる strategy を検索
    const semanticStrategy = response.memory.strategies.find(
      (strategy: { name?: string; strategyId?: string }) =>
        strategy.name?.startsWith('semantic_memory_strategy') ||
        strategy.strategyId?.startsWith('semantic_memory_strategy')
    );

    if (semanticStrategy?.strategyId) {
      cachedStrategyId = semanticStrategy.strategyId;
      logger.info(
        `[MemoryRetriever] セマンティック戦略ID を取得: ${cachedStrategyId} (name: ${semanticStrategy.name || 'N/A'})`
      );
    } else {
      logger.warn(
        '[MemoryRetriever] セマンティック戦略が見つかりません、全strategies:',
        response.memory?.strategies?.map((s) => ({
          name: s.name,
          strategyId: s.strategyId,
        }))
      );
      logger.warn('[MemoryRetriever] フォールバックを使用: semantic_memory_strategy');
      cachedStrategyId = 'semantic_memory_strategy'; // フォールバック
    }

    return cachedStrategyId as string;
  } catch (error) {
    logger.error('[MemoryRetriever] GetMemory API エラー:', error);
    // エラー時はフォールバック値を使用
    cachedStrategyId = 'semantic_memory_strategy';
    return cachedStrategyId as string;
  }
}

/**
 * AgentCore Memory から長期記憶を取得
 * @param memoryId AgentCore Memory ID
 * @param actorId ユーザーID
 * @param query 検索クエリ（ユーザーの最新メッセージなど）
 * @param topK 取得件数（デフォルト: 10）
 * @param region AWS リージョン（デフォルト: us-east-1）
 * @returns 長期記憶の文字列配列
 */
export async function retrieveLongTermMemory(
  memoryId: string,
  actorId: string,
  query: string,
  topK: number = 10,
  region: string = 'us-east-1'
): Promise<string[]> {
  try {
    logger.info(`[MemoryRetriever] 長期記憶を取得中:`, {
      actorId,
      query: query.substring(0, 100),
      topK,
      region,
    });

    // セマンティックメモリ戦略IDを取得
    const memoryStrategyId = await getSemanticMemoryStrategyId(memoryId, region);

    // namespace形式を構築
    const namespace = `/strategies/${memoryStrategyId}/actors/${actorId}`;

    const client = new BedrockAgentCoreClient({ region });
    const retrieveParams: RetrieveMemoryRecordsParams = {
      memoryId: memoryId,
      namespace: namespace,
      searchCriteria: {
        searchQuery: query,
        memoryStrategyId: memoryStrategyId,
        topK: topK,
      },
      maxResults: 50,
    };

    const command = new RetrieveMemoryRecordsCommand(retrieveParams);
    const response = await client.send(command);

    // AWS SDKのレスポンス型にmemoryRecordSummariesが含まれていない場合の型アサーション
    const extendedResponse = response as typeof response & {
      memoryRecordSummaries?: MemoryRecordSummary[];
    };

    if (
      !extendedResponse.memoryRecordSummaries ||
      extendedResponse.memoryRecordSummaries.length === 0
    ) {
      logger.info('[MemoryRetriever] 長期記憶が見つかりませんでした:', {
        namespace,
        memoryStrategyId,
      });
      return [];
    }

    // content を抽出
    const memories: string[] = extendedResponse.memoryRecordSummaries
      .map((record: MemoryRecordSummary) => {
        // contentがオブジェクトの場合はtextプロパティを抽出
        if (typeof record.content === 'object' && record.content?.text) {
          return record.content.text;
        } else if (typeof record.content === 'string') {
          return record.content;
        }
        return '';
      })
      .filter((content) => content.length > 0);

    logger.info(`[MemoryRetriever] ${memories.length} 件の長期記憶を取得しました:`, {
      memoriesCount: memories.length,
      actorId,
    });
    return memories;
  } catch (error) {
    // ResourceNotFoundException の場合は空配列を返す（新規ユーザー対応）
    if (error instanceof Error && error.name === 'ResourceNotFoundException') {
      logger.info(`[MemoryRetriever] 長期記憶が存在しません（新規ユーザー）`);
      return [];
    }
    logger.error('[MemoryRetriever] 長期記憶取得エラー:', error);
    // エラー時も空配列を返してエージェント初期化を継続
    return [];
  }
}
