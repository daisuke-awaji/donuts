/**
 * AgentCore Memory サービス層
 * セッション管理とイベント取得のためのサービス
 */

import {
  BedrockAgentCoreClient,
  ListSessionsCommand,
  ListEventsCommand,
} from '@aws-sdk/client-bedrock-agentcore';
import { config } from '../config/index.js';

/**
 * セッション情報の型定義（Frontend 向けに整形済み）
 */
export interface SessionSummary {
  sessionId: string;
  title: string; // 最初のユーザーメッセージから生成
  lastMessage: string; // 最後のメッセージ
  messageCount: number;
  createdAt: string; // ISO 8601 文字列
  updatedAt: string; // ISO 8601 文字列
}

/**
 * イベント情報の型定義（Frontend 向けに整形済み）
 */
export interface ConversationMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO 8601 文字列
}

/**
 * Conversational Payload の型定義
 */
interface ConversationalPayload {
  conversational: {
    role: string;
    content: {
      text: string;
    };
  };
}

/**
 * AgentCore Memory サービスクラス
 */
export class AgentCoreMemoryService {
  private client: BedrockAgentCoreClient;
  private memoryId: string;

  constructor(memoryId?: string, region: string = 'us-east-1') {
    if (!memoryId) {
      throw new Error('AgentCore Memory ID が設定されていません');
    }

    this.client = new BedrockAgentCoreClient({ region });
    this.memoryId = memoryId;
  }

  /**
   * 指定されたアクターのセッション一覧を取得
   * @param actorId ユーザーID（JWT の sub）
   * @returns セッション一覧
   */
  async listSessions(actorId: string): Promise<SessionSummary[]> {
    try {
      console.log(`[AgentCoreMemoryService] セッション一覧を取得中: actorId=${actorId}`);

      const command = new ListSessionsCommand({
        memoryId: this.memoryId,
        actorId: actorId,
      });

      const response = await this.client.send(command);

      if (!response.sessionSummaries || response.sessionSummaries.length === 0) {
        console.log(
          `[AgentCoreMemoryService] セッションが見つかりませんでした: actorId=${actorId}`
        );
        return [];
      }

      // セッション一覧を軽量形式で返却（詳細取得は行わない）
      const sessions: SessionSummary[] = response.sessionSummaries
        .filter((sessionSummary) => sessionSummary.sessionId)
        .map((sessionSummary) => ({
          sessionId: sessionSummary.sessionId!,
          title: 'セッション名', // 固定タイトル
          lastMessage: '会話を選択して履歴を表示', // 固定メッセージ
          messageCount: 0, // 詳細取得しないため 0
          createdAt: sessionSummary.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: sessionSummary.createdAt?.toISOString() || new Date().toISOString(),
        }));

      // 作成日時の降順でソート（最新のセッションが上に）
      sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      console.log(`[AgentCoreMemoryService] ${sessions.length} 件のセッションを取得しました`);
      return sessions;
    } catch (error) {
      // 新規ユーザーでActorが存在しない場合は空配列を返す
      if (error instanceof Error && error.name === 'ResourceNotFoundException') {
        console.log(
          `[AgentCoreMemoryService] 新規ユーザーのため空のセッション一覧を返却: actorId=${actorId}`
        );
        return [];
      }
      console.error('[AgentCoreMemoryService] セッション一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * 指定されたセッションの会話履歴を取得
   * @param actorId ユーザーID
   * @param sessionId セッションID
   * @returns 会話履歴
   */
  async getSessionEvents(actorId: string, sessionId: string): Promise<ConversationMessage[]> {
    try {
      console.log(`[AgentCoreMemoryService] セッションイベントを取得中: sessionId=${sessionId}`);

      const command = new ListEventsCommand({
        memoryId: this.memoryId,
        actorId: actorId,
        sessionId: sessionId,
        includePayloads: true,
        maxResults: 100, // 最大100件を取得
      });

      const response = await this.client.send(command);

      if (!response.events) {
        console.log(
          `[AgentCoreMemoryService] イベントが見つかりませんでした: sessionId=${sessionId}`
        );
        return [];
      }

      // Events を時系列順にソート
      const sortedEvents = response.events.sort((a, b) => {
        const timestampA = a.eventTimestamp ? new Date(a.eventTimestamp).getTime() : 0;
        const timestampB = b.eventTimestamp ? new Date(b.eventTimestamp).getTime() : 0;
        return timestampA - timestampB;
      });

      // Events から ConversationMessage に変換
      const messages: ConversationMessage[] = [];

      for (const event of sortedEvents) {
        if (event.payload && event.payload.length > 0) {
          for (const payloadItem of event.payload) {
            // conversational payload の場合のみ処理
            if ('conversational' in payloadItem) {
              const conversationalPayload = payloadItem as ConversationalPayload;
              const role = conversationalPayload.conversational.role;
              const content = conversationalPayload.conversational.content.text;

              messages.push({
                id: event.eventId || `event_${messages.length}`,
                type: role === 'USER' ? 'user' : 'assistant',
                content: content,
                timestamp: event.eventTimestamp?.toISOString() || new Date().toISOString(),
              });
            }
          }
        }
      }

      console.log(`[AgentCoreMemoryService] ${messages.length} 件のメッセージを取得しました`);
      return messages;
    } catch (error) {
      console.error('[AgentCoreMemoryService] セッションイベント取得エラー:', error);
      throw error;
    }
  }

  /**
   * セッションの詳細情報を取得（タイトルと最終メッセージを生成）
   * @param actorId ユーザーID
   * @param sessionId セッションID
   * @returns セッション詳細
   * @private
   */
  private async getSessionDetail(actorId: string, sessionId: string): Promise<SessionSummary> {
    const messages = await this.getSessionEvents(actorId, sessionId);

    // タイトルを生成（最初のユーザーメッセージを使用）
    let title = `セッション ${sessionId.slice(0, 8)}...`;
    const firstUserMessage = messages.find((m) => m.type === 'user');
    if (firstUserMessage) {
      // 最大50文字に切り詰め
      title =
        firstUserMessage.content.length > 50
          ? `${firstUserMessage.content.slice(0, 50)}...`
          : firstUserMessage.content;
    }

    // 最終メッセージを取得
    let lastMessage = '会話を開始してください';
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      lastMessage =
        lastMsg.content.length > 100 ? `${lastMsg.content.slice(0, 100)}...` : lastMsg.content;
    }

    // 作成日時と更新日時
    const createdAt = messages.length > 0 ? messages[0].timestamp : new Date().toISOString();
    const updatedAt = messages.length > 0 ? messages[messages.length - 1].timestamp : createdAt;

    return {
      sessionId,
      title,
      lastMessage,
      messageCount: messages.length,
      createdAt,
      updatedAt,
    };
  }
}

/**
 * AgentCore Memory サービスのインスタンスを作成
 * @returns AgentCoreMemoryService インスタンス
 */
export function createAgentCoreMemoryService(): AgentCoreMemoryService {
  return new AgentCoreMemoryService(config.agentcore.memoryId, config.agentcore.region);
}
