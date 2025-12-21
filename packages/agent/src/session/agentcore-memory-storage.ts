/**
 * AgentCore Memory を使用したセッションストレージの実装
 */
import {
  BedrockAgentCoreClient,
  CreateEventCommand,
  ListEventsCommand,
  DeleteEventCommand,
  type PayloadType,
} from '@aws-sdk/client-bedrock-agentcore';
import type { Message } from '@strands-agents/sdk';
import type { SessionConfig, SessionStorage } from './types.js';
import {
  messageToAgentCorePayload,
  agentCorePayloadToMessage,
  extractEventId,
  getCurrentTimestamp,
  type AgentCorePayload,
} from './converters.js';

/**
 * AgentCore Memory を使用したセッションストレージ
 */
export class AgentCoreMemoryStorage implements SessionStorage {
  private client: BedrockAgentCoreClient;
  private memoryId: string;

  constructor(memoryId: string, region: string = 'us-east-1') {
    this.client = new BedrockAgentCoreClient({ region });
    this.memoryId = memoryId;
  }

  /**
   * 指定されたセッションの会話履歴を読み込む
   * @param config セッション設定
   * @returns 会話履歴の Message 配列
   */
  async loadMessages(config: SessionConfig): Promise<Message[]> {
    try {
      console.log(`[AgentCoreMemoryStorage] Loading messages for session: ${config.sessionId}`);

      const command = new ListEventsCommand({
        memoryId: this.memoryId,
        actorId: config.actorId,
        sessionId: config.sessionId,
        includePayloads: true,
        maxResults: 100, // 最大100件を取得
      });

      const response = await this.client.send(command);

      if (!response.events) {
        console.log(`[AgentCoreMemoryStorage] No events found for session: ${config.sessionId}`);
        return [];
      }

      // Events を時系列順にソート
      const sortedEvents = response.events.sort((a, b) => {
        const timestampA = a.eventTimestamp ? new Date(a.eventTimestamp).getTime() : 0;
        const timestampB = b.eventTimestamp ? new Date(b.eventTimestamp).getTime() : 0;
        return timestampA - timestampB;
      });

      // Events から Message に変換
      const messages: Message[] = [];

      for (const event of sortedEvents) {
        if (event.payload && event.payload.length > 0) {
          for (const payloadItem of event.payload) {
            // conversational または blob payload の場合を処理
            if ('conversational' in payloadItem || 'blob' in payloadItem) {
              const agentCorePayload = payloadItem as AgentCorePayload;
              const message = agentCorePayloadToMessage(agentCorePayload);
              messages.push(message);
            }
          }
        }
      }

      console.log(
        `[AgentCoreMemoryStorage] Loaded ${messages.length} messages for session: ${config.sessionId}`
      );
      return messages;
    } catch (error) {
      console.error(`[AgentCoreMemoryStorage] Error loading messages:`, error);
      throw error;
    }
  }

  /**
   * 指定されたセッションに会話履歴を保存する
   * @param config セッション設定
   * @param messages 保存する Message 配列
   */
  async saveMessages(config: SessionConfig, messages: Message[]): Promise<void> {
    try {
      console.log(`[AgentCoreMemoryStorage] Saving messages for session: ${config.sessionId}`);

      // 既存のメッセージ数を取得
      const existingMessages = await this.loadMessages(config);
      const existingCount = existingMessages.length;

      // 新規メッセージのみを抽出
      const newMessages = messages.slice(existingCount);

      if (newMessages.length === 0) {
        console.log(
          `[AgentCoreMemoryStorage] No new messages to save for session: ${config.sessionId}`
        );
        return;
      }

      console.log(
        `[AgentCoreMemoryStorage] Saving ${newMessages.length} new messages for session: ${config.sessionId}`
      );

      // 各メッセージを個別のイベントとして保存
      for (const message of newMessages) {
        await this.createMessageEvent(config, message);
      }
    } catch (error) {
      console.error(`[AgentCoreMemoryStorage] Error saving messages:`, error);
      throw error;
    }
  }

  /**
   * 指定されたセッションの履歴をクリアする
   * @param config セッション設定
   */
  async clearSession(config: SessionConfig): Promise<void> {
    try {
      console.log(`[AgentCoreMemoryStorage] Clearing session: ${config.sessionId}`);

      // セッションの全イベントを取得
      const command = new ListEventsCommand({
        memoryId: this.memoryId,
        actorId: config.actorId,
        sessionId: config.sessionId,
        includePayloads: false, // イベントIDのみ取得
        maxResults: 100,
      });

      const response = await this.client.send(command);

      if (!response.events || response.events.length === 0) {
        console.log(
          `[AgentCoreMemoryStorage] No events to delete for session: ${config.sessionId}`
        );
        return;
      }

      console.log(
        `[AgentCoreMemoryStorage] Deleting ${response.events.length} events for session: ${config.sessionId}`
      );

      // 各イベントを個別に削除
      for (const event of response.events) {
        const eventId = extractEventId(event);
        if (eventId) {
          await this.deleteEvent(config, eventId);
        }
      }
    } catch (error) {
      console.error(`[AgentCoreMemoryStorage] Error clearing session:`, error);
      throw error;
    }
  }

  /**
   * 単一メッセージをイベントとして作成
   * @param config セッション設定
   * @param message 保存するメッセージ
   * @private
   */
  private async createMessageEvent(config: SessionConfig, message: Message): Promise<void> {
    const payload = messageToAgentCorePayload(message);

    const command = new CreateEventCommand({
      memoryId: this.memoryId,
      actorId: config.actorId,
      sessionId: config.sessionId,
      eventTimestamp: getCurrentTimestamp(),
      payload: [payload as PayloadType], // AWS SDK の PayloadType との型互換性のため
    });

    const response = await this.client.send(command);
    console.log(
      `[AgentCoreMemoryStorage] Created event: ${response.event?.eventId} for message role: ${message.role}`
    );
  }

  /**
   * 指定されたイベントを削除
   * @param config セッション設定
   * @param eventId 削除するイベントID
   * @private
   */
  private async deleteEvent(config: SessionConfig, eventId: string): Promise<void> {
    const command = new DeleteEventCommand({
      memoryId: this.memoryId,
      actorId: config.actorId,
      sessionId: config.sessionId,
      eventId: eventId,
    });

    await this.client.send(command);
    console.log(`[AgentCoreMemoryStorage] Deleted event: ${eventId}`);
  }
}
