/**
 * Memory API クライアント
 * Backend の Memory API を呼び出すためのクライアント
 */

import { backendGet, backendPost, backendDelete } from './client/backend-client';

/**
 * メモリレコードの型定義
 */
export interface MemoryRecord {
  recordId: string;
  namespace: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * メモリレコード一覧の型定義
 */
export interface MemoryRecordList {
  records: MemoryRecord[];
  nextToken?: string;
}

/**
 * セマンティック検索のリクエスト型定義
 */
export interface SearchMemoryRequest {
  query: string;
  topK?: number;
  relevanceScore?: number;
}

/**
 * セマンティック検索のレスポンス型定義
 */
interface SearchMemoryResponse {
  records: MemoryRecord[];
}

/**
 * メモリレコード一覧を取得
 * @returns メモリレコード一覧
 */
export async function fetchMemoryRecords(): Promise<MemoryRecordList> {
  try {
    console.log('📋 メモリレコード取得開始');

    const data = await backendGet<MemoryRecordList>('/memory/records');

    console.log(`✅ メモリレコード取得完了: ${data.records.length}件`);

    return data;
  } catch (error) {
    console.error('💥 メモリレコード取得エラー:', error);
    throw error;
  }
}

/**
 * メモリレコードを削除
 * @param recordId レコードID
 */
export async function deleteMemoryRecord(recordId: string): Promise<void> {
  try {
    console.log(`🗑️ メモリレコード削除開始: ${recordId}`);

    await backendDelete<void>(`/memory/records/${recordId}`);

    console.log(`✅ メモリレコード削除完了: ${recordId}`);
  } catch (error) {
    console.error('💥 メモリレコード削除エラー:', error);
    throw error;
  }
}

/**
 * メモリレコードをセマンティック検索
 * @param searchRequest 検索リクエスト
 * @returns 検索結果
 */
export async function searchMemoryRecords(
  searchRequest: SearchMemoryRequest
): Promise<MemoryRecord[]> {
  try {
    console.log(`🔍 メモリ検索開始: "${searchRequest.query}"`);

    const data = await backendPost<SearchMemoryResponse>('/memory/search', searchRequest);

    console.log(`✅ メモリ検索完了: ${data.records.length}件`);

    return data.records;
  } catch (error) {
    console.error('💥 メモリ検索エラー:', error);
    throw error;
  }
}
