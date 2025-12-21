/**
 * Strands Message と AgentCore Memory PayloadType の変換ユーティリティ
 */
import {
  Message,
  TextBlock,
  type Role,
  type ContentBlock,
  type JSONValue,
} from '@strands-agents/sdk';

/**
 * ToolUse データの型定義
 */
interface ToolUseData {
  toolType: 'toolUse';
  name: string;
  toolUseId: string;
  input: JSONValue;
}

/**
 * ToolResult データの型定義
 */
interface ToolResultData {
  toolType: 'toolResult';
  toolUseId: string;
  content: JSONValue;
  isError: boolean;
}

/**
 * ツールデータの Union 型
 */
type ToolData = ToolUseData | ToolResultData;

/**
 * ToolUseBlock の型定義（Strands SDK の型構造に基づく）
 */
interface ToolUseBlock {
  type: 'toolUseBlock';
  name: string;
  toolUseId: string;
  input: JSONValue;
}

/**
 * ToolResultBlock の型定義（Strands SDK の型構造に基づく）
 */
interface ToolResultBlock {
  type: 'toolResultBlock';
  toolUseId: string;
  content: JSONValue;
  isError: boolean;
}

/**
 * AgentCore Memory のConversational Payload型定義
 */
export interface ConversationalPayload {
  conversational: {
    content: { text: string };
    role: 'USER' | 'ASSISTANT';
  };
}

/**
 * AgentCore Memory のBlob Payload型定義
 */
export interface BlobPayload {
  blob: {
    messageType: 'tool';
    role: string;
  } & ToolData;
}

/**
 * AgentCore Memory のPayloadType型定義（Union型）
 */
export type AgentCorePayload = ConversationalPayload | BlobPayload;

/**
 * Strands Message から AgentCore Payload に変換
 * @param message Strands Message
 * @returns AgentCore Payload (ConversationalPayload or BlobPayload)
 */
export function messageToAgentCorePayload(message: Message): AgentCorePayload {
  // content 配列からテキストを抽出
  const textContent = extractTextFromMessage(message);

  // テキストコンテンツがある場合は conversational payload
  if (textContent.length > 0) {
    const agentCoreRole = message.role === 'user' ? 'USER' : 'ASSISTANT';
    return {
      conversational: {
        content: { text: textContent },
        role: agentCoreRole,
      },
    };
  }

  // テキストコンテンツがない場合、toolUse/toolResult を blob payload として保存
  const toolData = extractToolDataFromMessage(message);
  if (toolData) {
    return {
      blob: {
        messageType: 'tool',
        role: message.role,
        ...toolData,
      },
    };
  }

  // どちらでもない場合（通常起こらない）、空のテキストで conversational payload
  const agentCoreRole = message.role === 'user' ? 'USER' : 'ASSISTANT';
  return {
    conversational: {
      content: { text: ' ' }, // 最小限の1文字
      role: agentCoreRole,
    },
  };
}

/**
 * AgentCore Payload から Strands Message に変換
 * @param payload AgentCore Payload (ConversationalPayload or BlobPayload)
 * @returns Strands Message
 */
export function agentCorePayloadToMessage(payload: AgentCorePayload): Message {
  // conversational payload の場合
  if ('conversational' in payload) {
    const strandsRole = payload.conversational.role === 'USER' ? 'user' : 'assistant';
    const textBlock = new TextBlock(payload.conversational.content.text);
    return new Message({
      role: strandsRole,
      content: [textBlock],
    });
  }

  // blob payload の場合
  if ('blob' in payload && payload.blob.messageType === 'tool') {
    const strandsRole = payload.blob.role as Role;
    const content = createContentBlockFromToolData(payload.blob);
    return new Message({
      role: strandsRole,
      content: [content],
    });
  }

  // フォールバック: 不明なペイロードの場合
  console.warn('Unknown payload type, creating empty message');
  return new Message({
    role: 'assistant',
    content: [new TextBlock('')],
  });
}

/**
 * Strands Message からテキスト内容を抽出
 * @param message Strands Message
 * @returns テキスト内容
 */
function extractTextFromMessage(message: Message): string {
  if (!message.content || message.content.length === 0) {
    return '';
  }

  // 最初のテキスト要素を探す
  for (const contentBlock of message.content) {
    if (contentBlock.type === 'textBlock' && 'text' in contentBlock) {
      return contentBlock.text;
    }
  }

  return '';
}

/**
 * AgentCore Event から eventId を抽出
 * @param event AgentCore Event オブジェクト
 * @returns eventId
 */
export function extractEventId(event: { eventId?: string }): string {
  return event.eventId || '';
}

/**
 * Strands Message からツールデータを抽出
 * @param message Strands Message
 * @returns ツールデータ または null
 */
function extractToolDataFromMessage(message: Message): ToolData | null {
  if (!message.content || message.content.length === 0) {
    return null;
  }

  for (const contentBlock of message.content) {
    // toolUseBlock の場合
    if (contentBlock.type === 'toolUseBlock' && 'name' in contentBlock) {
      const toolUseBlock = contentBlock as unknown as ToolUseBlock;
      return {
        toolType: 'toolUse',
        name: toolUseBlock.name,
        toolUseId: toolUseBlock.toolUseId,
        input: toolUseBlock.input,
      };
    }

    // toolResultBlock の場合
    if (contentBlock.type === 'toolResultBlock' && 'toolUseId' in contentBlock) {
      const toolResultBlock = contentBlock as unknown as ToolResultBlock;
      return {
        toolType: 'toolResult',
        toolUseId: toolResultBlock.toolUseId,
        content: toolResultBlock.content,
        isError: toolResultBlock.isError || false,
      };
    }
  }

  return null;
}

/**
 * ツールデータから Strands ContentBlock を作成
 * @param toolData ツールデータ
 * @returns ContentBlock
 */
function createContentBlockFromToolData(toolData: ToolData): ContentBlock {
  if (toolData.toolType === 'toolUse') {
    // ToolUseBlock を作成（Strands SDK の正確な型に基づく）
    return {
      type: 'toolUseBlock',
      name: toolData.name,
      toolUseId: toolData.toolUseId,
      input: toolData.input,
    } as unknown as ContentBlock;
  }

  if (toolData.toolType === 'toolResult') {
    // ToolResultBlock を作成（Strands SDK の正確な型に基づく）
    return {
      type: 'toolResultBlock',
      toolUseId: toolData.toolUseId,
      content: toolData.content,
      isError: toolData.isError,
      status: 'success', // Strands SDK で必要なプロパティ
    } as unknown as ContentBlock;
  }

  // フォールバック（通常ここには来ない）
  return new TextBlock(
    `[Unknown tool data: ${JSON.stringify(toolData)}]`
  ) as unknown as ContentBlock;
}

/**
 * 現在のタイムスタンプを取得（AgentCore Event用）
 * @returns Date オブジェクト
 */
export function getCurrentTimestamp(): Date {
  return new Date();
}
